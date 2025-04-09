import React, { useState } from 'react';
import './NovoTrabalhoModal.css';

const NovoTrabalhoModal = ({ fecharModal, supabase, showToast }) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (!numeroFO || numeroFO.length === 0) {
      showToast.error('O número da FO é obrigatório');
      return;
    }
    
    const numeroFOInt = parseInt(numeroFO);
    if (isNaN(numeroFOInt)) {
      showToast.error('O número da FO deve ser um número válido');
      return;
    }
    
    // Filtra itens vazios
    const itensValidos = itens.filter(item => item.trim() !== '');
    if (itensValidos.length === 0) {
      showToast.error('É necessário adicionar pelo menos um item');
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
      
      // Insere todos os registros de uma vez
      const { data, error } = await supabase
        .from('folhas_obra')
        .insert(registros);
        
      if (error) throw error;
      
      showToast.success('Trabalho adicionado com sucesso!');
      fecharModal();
    } catch (error) {
      console.error('Erro ao adicionar trabalho:', error);
      showToast.error(`Erro ao adicionar trabalho: ${error.message}`);
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

export default NovoTrabalhoModal;
