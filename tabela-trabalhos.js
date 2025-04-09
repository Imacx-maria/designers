import React, { useState } from 'react';
import './TabelaTrabalhos.css';

const TabelaTrabalhos = ({ trabalhos, designers, supabase, showToast }) => {
  const [sortColumn, setSortColumn] = useState('data_in');
  const [sortDirection, setSortDirection] = useState('desc');

  // Função para ordenar trabalhos
  const ordenaTrabalhos = (trabalhos) => {
    return [...trabalhos].sort((a, b) => {
      let valorA = a[sortColumn];
      let valorB = b[sortColumn];
      
      // Tratamento especial para campos que são relacionamentos
      if (sortColumn === 'designer_id') {
        valorA = a.designers?.nome || '';
        valorB = b.designers?.nome || '';
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

  const handleDesignerChange = async (id, designerId) => {
    try {
      // Atualiza o designer e marca como "em curso" automaticamente
      const { error } = await supabase
        .from('folhas_obra')
        .update({ 
          designer_id: designerId,
          em_curso: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar designer:', error);
      showToast.error(`Erro ao atualizar designer: ${error.message}`);
    }
  };

  const handleCheckboxChange = async (id, field, value) => {
    try {
      const updates = { 
        [field]: value,
        updated_at: new Date().toISOString()
      };
      
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
      
      const { error } = await supabase
        .from('folhas_obra')
        .update(updates)
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error(`Erro ao atualizar ${field}:`, error);
      showToast.error(`Erro ao atualizar: ${error.message}`);
    }
  };

  const handlePathChange = async (id, value) => {
    try {
      const { error } = await supabase
        .from('folhas_obra')
        .update({ 
          path_trabalho: value,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar path:', error);
      showToast.error(`Erro ao atualizar path: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('folhas_obra')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      showToast.success('Registro excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      showToast.error(`Erro ao excluir registro: ${error.message}`);
    }
  };

  // Função para renderizar os ícones de status
  const renderStatus = (value) => {
    if (value === true) {
      return <span className="status-dot status-ativo"></span>;
    } else {
      return <span className="status-dot status-inativo"></span>;
    }
  };

  const trabalhosOrdenados = ordenaTrabalhos(trabalhos);

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

export default TabelaTrabalhos;
