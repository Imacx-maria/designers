import React, { useState, useEffect } from 'react'; // Add React import
import { supabase } from './src/supabaseClient'; // Import Supabase client

// Define TypeScript types based on schema
interface Designer {
  id: string; // Assuming UUID is treated as string in JS/TS
  nome: string;
  email: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

interface FolhaObra {
  id: string; // Assuming UUID is treated as string
  numero_fo: number;
  designer_id: string | null;
  data_in?: string;
  em_curso: boolean;
  duvidas: boolean;
  data_duvidas?: string | null;
  maquete_enviada: boolean;
  data_envio?: string | null;
  paginacao: boolean;
  data_saida?: string | null;
  path_trabalho: string | null;
  created_at?: string;
  updated_at?: string;
  item: string;
}

const App = () => {
  // Estados para dados, filtros e UI
  const [designers, setDesigners] = useState<Designer[]>([]); // Initialize empty
  const [trabalhos, setTrabalhos] = useState<FolhaObra[]>([]); // Initialize empty
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtroAbertos, setFiltroAbertos] = useState(true);
  const [filtroFO, setFiltroFO] = useState('');
  const [filtroItem, setFiltroItem] = useState('');
  
  // Fetch initial data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch active designers
        const { data: designersData, error: designersError } = await supabase
          .from('designers')
          .select('*')
          .eq('ativo', true);

        if (designersError) throw designersError;
        setDesigners(designersData || []);

        // Fetch folhas_obra (jobs)
        const { data: trabalhosData, error: trabalhosError } = await supabase
          .from('folhas_obra')
          .select('*')
          .order('data_in', { ascending: false }); // Example order

        if (trabalhosError) throw trabalhosError;
        setTrabalhos(trabalhosData || []);

      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(`Failed to load data: ${err.message}`);
        setDesigners([]); // Clear data on error
        setTrabalhos([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Setup real-time subscription for folhas_obra
  useEffect(() => {
    const channel = supabase
      .channel('folhas_obra_changes')
      .on<FolhaObra>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'folhas_obra' },
        (payload) => {
          console.log('Change received!', payload);
          switch (payload.eventType) {
            case 'INSERT':
              // Add the new record, ensuring it's not already present (belt-and-suspenders)
              setTrabalhos((prevTrabalhos) =>
                 prevTrabalhos.some(t => t.id === (payload.new as FolhaObra).id)
                   ? prevTrabalhos
                   : [payload.new as FolhaObra, ...prevTrabalhos]
              );
              break;
            case 'UPDATE':
              setTrabalhos((prevTrabalhos) =>
                prevTrabalhos.map((trabalho) =>
                  trabalho.id === payload.old?.id ? { ...trabalho, ...(payload.new as FolhaObra) } : trabalho
                )
              );
              break;
            case 'DELETE':
              setTrabalhos((prevTrabalhos) =>
                prevTrabalhos.filter((trabalho) => trabalho.id !== payload.old?.id)
              );
              break;
            default:
              break;
          }
        }
      )
      .subscribe((status, err) => {
         if (status === 'SUBSCRIBED') {
            console.log('Real-time channel subscribed for folhas_obra');
         }
         if (status === 'CHANNEL_ERROR') {
            console.error('Real-time channel error:', err);
            setError(`Real-time connection error: ${err?.message}`);
         }
         if (status === 'TIMED_OUT') {
            console.warn('Real-time connection timed out.');
            setError('Real-time connection timed out.');
         }
      });

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
      console.log('Real-time channel unsubscribed');
    };
  }, []); // Empty dependency array ensures this runs only once on mount
  
  // Função para criar um novo trabalho (agora interage com Supabase)
  const adicionarTrabalho = async (registrosParaInserir: Omit<FolhaObra, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const { data, error } = await supabase
        .from('folhas_obra')
        .insert(registrosParaInserir)
        .select(); // Select to get the inserted data back if needed

      if (error) throw error;
      console.log('Trabalhos adicionados:', data);
      // State update handled by real-time subscription
      return { data, error: null };
    } catch (err: any) {
      console.error('Erro ao adicionar trabalho no Supabase:', err);
      showToast(`Erro ao salvar: ${err.message}`);
      return { data: null, error: err };
    }
  };
  
  // Função para atualizar um trabalho (agora interage com Supabase)
  const atualizarTrabalho = async (id: string, atualizacoes: Partial<FolhaObra>) => {
    // Ensure 'id' is not part of the update payload
    const { id: _, ...updateData } = atualizacoes;
    
    try {
      const { data, error } = await supabase
        .from('folhas_obra')
        .update(updateData)
        .eq('id', id)
        .select(); // Select to get updated data

      if (error) throw error;
      console.log('Trabalho atualizado:', data);
      // State update handled by real-time subscription
      return { data: data ? data[0] : null, error: null };
    } catch (err: any) {
      console.error('Erro ao atualizar trabalho no Supabase:', err);
      showToast(`Erro ao atualizar: ${err.message}`);
      return { data: null, error: err };
    }
  };
  
  // Função para excluir um trabalho (agora interage com Supabase)
  const excluirTrabalho = async (id: string) => {
    try {
      const { error } = await supabase
        .from('folhas_obra')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log('Trabalho excluído:', id);
      // State update handled by real-time subscription
      return { data: null, error: null };
    } catch (err: any) {
      console.error('Erro ao excluir trabalho no Supabase:', err);
      showToast(`Erro ao excluir: ${err.message}`);
      return { data: null, error: err };
    }
  };
  
  // Toast simplificado
  const showToast = (msg) => alert(msg);
  
  // Funções dos componentes
  const abrirModal = () => setIsModalOpen(true);
  const fecharModal = () => setIsModalOpen(false);
  
  // Componente HeaderControls
  const HeaderControls = () => {
    const handleFOChange = (e) => {
      // Permite apenas números e limita a 4 dígitos
      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
      setFiltroFO(value);
    };

    return (
      <div className="header-controls">
        <div className="app-title">
          <h1>Gestão de Fluxo de Trabalho para Designers</h1>
        </div>
        
        <div className="filters">
          <div className="toggle-container">
            <label className="toggle">
              <input 
                type="checkbox" 
                checked={filtroAbertos} 
                onChange={() => setFiltroAbertos(!filtroAbertos)}
              />
              <span className="slider"></span>
              <span className="toggle-text">Apenas trabalhos em aberto</span>
            </label>
          </div>
          
          <div className="search-container">
            <input
              type="text"
              placeholder="Filtrar por FO (ex: 1234)"
              value={filtroFO}
              onChange={handleFOChange}
              className="search-input"
            />
            
            <input
              type="text"
              placeholder="Filtrar por ITEM"
              value={filtroItem}
              onChange={(e) => setFiltroItem(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        <div className="actions">
          <button 
            className="btn-novo-trabalho"
            onClick={abrirModal}
          >
            Novo Trabalho
          </button>
        </div>
      </div>
    );
  };

  // Componente NovoTrabalhoModal
  const NovoTrabalhoModal = () => {
    const [numeroFO, setNumeroFO] = useState('');
    const [itens, setItens] = useState(['']);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleNumeroFOChange = (e) => {
      // Permite apenas números e limita a 4 dígitos
      const value = e.target.value.replace(/\D/g, '').slice(0, 4);
      setNumeroFO(value);
    };

    const handleItemChange = (index, value) => {
      const novosItens = [...itens];
      novosItens[index] = value;
      setItens(novosItens);
    };

    const adicionarItem = () => {
      setItens([...itens, '']);
    };

    const removerItem = (index) => {
      if (itens.length === 1) return; // Manter pelo menos um item
      const novosItens = [...itens];
      novosItens.splice(index, 1);
      setItens(novosItens);
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      
      // Validações
      if (!numeroFO || numeroFO.length === 0) {
        showToast('O número da FO é obrigatório');
        return;
      }
      
      const numeroFOInt = parseInt(numeroFO);
      if (isNaN(numeroFOInt)) {
        showToast('O número da FO deve ser um número válido');
        return;
      }
      
      // Filtra itens vazios
      const itensValidos = itens.filter(item => item.trim() !== '');
      if (itensValidos.length === 0) {
        showToast('É necessário adicionar pelo menos um item');
        return;
      }
      
      setIsSubmitting(true);
      
      try {
        // Prepara os dados para inserção
        const registros = itensValidos.map(item => ({
          numero_fo: numeroFOInt,
          item: item,
          em_curso: false,
          duvidas: false,
          maquete_enviada: false,
          paginacao: false,
          data_in: new Date().toISOString(),
        }));
        
        // Adiciona os trabalhos ao estado local
        adicionarTrabalho(registros);
        
        showToast('Trabalho adicionado com sucesso!');
        fecharModal();
      } catch (error) {
        console.error('Erro ao adicionar trabalho:', error);
        showToast(`Erro ao adicionar trabalho: ${error.message}`);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Novo Trabalho</h2>
            <button className="btn-fechar" onClick={fecharModal}>&times;</button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="numeroFO">Número FO:</label>
              <input
                type="text"
                id="numeroFO"
                placeholder="Ex: 1234"
                value={numeroFO}
                onChange={handleNumeroFOChange}
                maxLength={4}
              />
              <small>Máximo 4 dígitos</small>
            </div>
            
            <h3>Itens</h3>
            
            {itens.map((item, index) => (
              <div className="form-group item-row" key={index}>
                <input
                  type="text"
                  placeholder={`Item ${index + 1} (Ex: Expositor Sumol verão)`}
                  value={item}
                  onChange={(e) => handleItemChange(index, e.target.value)}
                />
                <button 
                  type="button" 
                  className="btn-remover" 
                  onClick={() => removerItem(index)}
                  disabled={itens.length === 1}
                >
                  &times;
                </button>
              </div>
            ))}
            
            <button 
              type="button" 
              className="btn-adicionar-item" 
              onClick={adicionarItem}
            >
              + Adicionar Item
            </button>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-cancelar" 
                onClick={fecharModal}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-salvar" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : 'Confirmar Trabalho'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Componente TabelaTrabalhos
  const TabelaTrabalhos = () => {
    const [sortColumn, setSortColumn] = useState('data_in');
    const [sortDirection, setSortDirection] = useState('desc');

    // Função para ordenar trabalhos
    const ordenaTrabalhos = (trabalhos) => {
      return [...trabalhos].sort((a, b) => {
        let valorA = a[sortColumn];
        let valorB = b[sortColumn];
        
        // Tratamento especial para campos que são relacionamentos
        if (sortColumn === 'designer_id') {
          const designerA = designers.find(d => d.id === a.designer_id);
          const designerB = designers.find(d => d.id === b.designer_id);
          valorA = designerA?.nome || '';
          valorB = designerB?.nome || '';
        }
        
        // Comparação de datas
        if (sortColumn.startsWith('data_')) {
          valorA = valorA ? new Date(valorA).getTime() : 0;
          valorB = valorB ? new Date(valorB).getTime() : 0;
        }
        
        // Comparação padrão
        if (valorA < valorB) return sortDirection === 'asc' ? -1 : 1;
        if (valorA > valorB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    };

    const handleSort = (column) => {
      // Se clicar na mesma coluna, inverte a direção
      if (column === sortColumn) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    };

    const formatarData = (dataString) => {
      if (!dataString) return '';
      const data = new Date(dataString);
      return `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear()} ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
    };

    const handleDesignerChange = (id, designerId) => {
      // Atualiza o designer e marca como "em curso" automaticamente
      atualizarTrabalho(id, { 
        designer_id: designerId, 
        em_curso: true 
      });
    };

    const handleCheckboxChange = (id: string, field: keyof FolhaObra, value: boolean) => { // Add types for params
      const updates: Partial<FolhaObra> = { [field]: value }; // Explicitly type 'updates'
      
      // Regras de negócio
      if (field === 'duvidas' && value === true) {
        // Se "duvidas" é marcado, desmarca "em_curso" e "maquete_enviada"
        updates.em_curso = false;
        updates.maquete_enviada = false;
        updates.data_duvidas = new Date().toISOString();
      } else if (field === 'maquete_enviada' && value === true) {
        // Se "maquete_enviada" é marcado, desmarca "duvidas"
        updates.duvidas = false;
        updates.data_envio = new Date().toISOString();
      } else if (field === 'paginacao' && value === true) {
        // Se "paginacao" é marcado, registra data de saída
        updates.data_saida = new Date().toISOString();
      }
      
      atualizarTrabalho(id, updates);
    };

    const handlePathChange = (id, value) => {
      atualizarTrabalho(id, { path_trabalho: value });
    };

    const handleDelete = (id) => {
      if (window.confirm('Tem certeza que deseja excluir este registro?')) {
        excluirTrabalho(id);
        showToast('Registro excluído com sucesso!');
      }
    };

    // Função para renderizar os ícones de status
    const renderStatus = (value) => {
      return value ? 
        <span className="status-dot status-ativo"></span> :
        <span className="status-dot status-inativo"></span>;
    };

    // Filtrar trabalhos
    let trabalhosExibidos = [...trabalhos];
    
    if (filtroAbertos) {
      trabalhosExibidos = trabalhosExibidos.filter(t => !t.paginacao);
    }
    
    if (filtroFO) {
      trabalhosExibidos = trabalhosExibidos.filter(t => 
        t.numero_fo === parseInt(filtroFO)
      );
    }
    
    if (filtroItem) {
      trabalhosExibidos = trabalhosExibidos.filter(t => 
        t.item && t.item.toLowerCase().includes(filtroItem.toLowerCase())
      );
    }
    
    const trabalhosOrdenados = ordenaTrabalhos(trabalhosExibidos);

    return (
      <div className="tabela-container">
        <table className="tabela-trabalhos">
          <thead>
            <tr>
              <th onClick={() => handleSort('data_in')}>
                DATA IN {sortColumn === 'data_in' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('numero_fo')}>
                FO {sortColumn === 'numero_fo' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('designer_id')}>
                DESIGNER {sortColumn === 'designer_id' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('item')}>
                ITEM {sortColumn === 'item' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('em_curso')}>
                EM CURSO {sortColumn === 'em_curso' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('duvidas')}>
                DÚVIDAS {sortColumn === 'duvidas' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('maquete_enviada')}>
                MAQUETE ENVIADA {sortColumn === 'maquete_enviada' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('paginacao')}>
                PAGINAÇÃO {sortColumn === 'paginacao' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('data_saida')}>
                DATA SAÍDA {sortColumn === 'data_saida' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('path_trabalho')}>
                PATH TRABALHO {sortColumn === 'path_trabalho' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {trabalhosOrdenados.length > 0 ? (
              trabalhosOrdenados.map((trabalho) => (
                <tr key={trabalho.id} className={trabalho.paginacao ? 'trabalho-concluido' : ''}>
                  <td>{formatarData(trabalho.data_in)}</td>
                  <td>{trabalho.numero_fo}</td>
                  <td>
                    <select
                      value={trabalho.designer_id || ''}
                      onChange={(e) => handleDesignerChange(trabalho.id, e.target.value || null)}
                    >
                      <option value="">Selecionar Designer</option>
                      {designers.map((designer) => (
                        <option key={designer.id} value={designer.id}>
                          {designer.nome}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{trabalho.item}</td>
                  <td>
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={trabalho.em_curso || false}
                        onChange={(e) => handleCheckboxChange(trabalho.id, 'em_curso', e.target.checked)}
                      />
                      {renderStatus(trabalho.em_curso)}
                    </label>
                  </td>
                  <td>
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={trabalho.duvidas || false}
                        onChange={(e) => handleCheckboxChange(trabalho.id, 'duvidas', e.target.checked)}
                      />
                      {renderStatus(trabalho.duvidas)}
                    </label>
                  </td>
                  <td>
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={trabalho.maquete_enviada || false}
                        onChange={(e) => handleCheckboxChange(trabalho.id, 'maquete_enviada', e.target.checked)}
                      />
                      {renderStatus(trabalho.maquete_enviada)}
                    </label>
                  </td>
                  <td>
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={trabalho.paginacao || false}
                        onChange={(e) => handleCheckboxChange(trabalho.id, 'paginacao', e.target.checked)}
                      />
                      {renderStatus(trabalho.paginacao)}
                    </label>
                  </td>
                  <td>{formatarData(trabalho.data_saida)}</td>
                  <td>
                    <input
                      type="text"
                      value={trabalho.path_trabalho || ''}
                      onChange={(e) => handlePathChange(trabalho.id, e.target.value)}
                      placeholder="Caminho do trabalho"
                    />
                  </td>
                  <td>
                    <button 
                      className="btn-excluir"
                      onClick={() => handleDelete(trabalho.id)}
                      title="Excluir Registro"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" className="no-data">
                  Nenhum trabalho encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="app-container">
      <style>
        {`
        /* Estilos base */
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        .app-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        /* HeaderControls */
        .header-controls {
          background-color: #fff;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .app-title h1 {
          font-size: 1.8rem;
          color: #2c3e50;
          margin-bottom: 15px;
        }
        
        .filters {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 15px;
        }
        
        .toggle-container {
          flex: 1;
          min-width: 250px;
        }
        
        .toggle {
          position: relative;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
        }
        
        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .slider {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
          background-color: #ccc;
          border-radius: 34px;
          transition: .4s;
          margin-right: 10px;
        }
        
        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          border-radius: 50%;
          transition: .4s;
        }
        
        input:checked + .slider {
          background-color: #2196F3;
        }
        
        input:checked + .slider:before {
          transform: translateX(26px);
        }
        
        .search-container {
          display: flex;
          flex: 2;
          gap: 15px;
        }
        
        .search-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .btn-novo-trabalho {
          background-color: #4CAF50;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
        }
        
        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-content {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        
        .btn-fechar {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #777;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        
        .form-group input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .form-group small {
          color: #777;
          font-size: 12px;
        }
        
        .item-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .btn-remover {
          background-color: #f44336;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 16px;
          padding: 0;
        }
        
        .btn-adicionar-item {
          background-color: #2196F3;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-bottom: 20px;
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        }
        
        .btn-cancelar {
          background-color: #f1f1f1;
          color: #333;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .btn-salvar {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        /* Tabela */
        .tabela-container {
          overflow-x: auto;
          background-color: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .tabela-trabalhos {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        
        .tabela-trabalhos th,
        .tabela-trabalhos td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        
        .tabela-trabalhos th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #2c3e50;
          cursor: pointer;
        }
        
        .status-dot {
          display: inline-block;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          margin-left: 8px;
        }
        
        .status-ativo {
          background-color: #4CAF50;
          box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
        }
        
        .status-inativo {
          background-color: #ff9800;
          box-shadow: 0 0 5px rgba(255, 152, 0, 0.5);
        }
        
        .checkbox-container {
          display: flex;
          align-items: center;
        }
        
        .trabalho-concluido {
          background-color: #f0f8f0;
        }
        
        .btn-excluir {
          background-color: #f44336;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 16px;
          padding: 0;
        }
        
        .no-data {
          text-align: center;
          padding: 20px;
          color: #777;
          font-style: italic;
        }
        `}
      </style>
      
      <HeaderControls />
      
      <TabelaTrabalhos />
      
      {isModalOpen && <NovoTrabalhoModal />}
    </div>
  );
};

export default App;