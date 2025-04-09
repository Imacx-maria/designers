import React, { useState, useEffect } from 'react';
import '../styles/TabelaTrabalhos.css';

const TabelaTrabalhos = ({ trabalhos, designers, supabase, showToast, refreshData, unsavedChanges, setUnsavedChanges }) => {
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

  /**
   * Handles designer selection changes
   * @param {string} id - The ID of the job
   * @param {string} designerId - The ID of the selected designer
   */
  const handleDesignerChange = (id, designerId) => {
    console.log('Designer dropdown changed for job:', id, 'to designer:', designerId);
    
    // Update parent state immediately
    // When a designer is selected, automatically set "em_curso" to true
    setUnsavedChanges(prev => {
      const newState = {
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          designer_id: designerId,
          em_curso: true
        }
      };
      console.log('New unsavedChanges state after designer change:', newState);
      return newState;
    });
  };
  /**
   * Handles checkbox state changes and applies business logic
   * @param {string} id - The ID of the job
   * @param {string} field - The field name (checkbox) being changed
   * @param {boolean} value - The new value of the checkbox
   */
  const handleCheckboxChange = (id, field, value) => {
    console.log(`${field} checkbox changed for job:`, id, 'to:', value);
    
    // If trying to uncheck a checkbox, ignore it - we only allow checking
    if (value === false) {
      console.log('Ignoring attempt to uncheck a checkbox - only one state can be active');
      return;
    }
    
    // Create updates object with all checkboxes set to false initially
    const updates = {
      em_curso: false,
      duvidas: false,
      maquete_enviada: false,
      paginacao: false
    };
    
    // Then set the clicked checkbox to true
    updates[field] = true;
    
    // Apply additional business logic rules
    if (field === 'duvidas') {
      // Record duvidas timestamp
      updates.data_duvidas = new Date().toISOString();
    } else if (field === 'maquete_enviada') {
      // Record maquete enviada timestamp
      updates.data_envio = new Date().toISOString();
    } else if (field === 'paginacao') {
      // Record completion date
      const now = new Date();
      updates.data_saida = now.toISOString();
    }
    
    // Update the unsavedChanges state with all the changes
    setUnsavedChanges(prev => {
      const newState = {
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          ...updates
        }
      };
      console.log('New unsavedChanges state after checkbox change:', newState);
      return newState;
    });
  };
/**
 * Handles path input changes
 * @param {string} id - The ID of the job
 * @param {string} value - The new path value
 */
const handlePathChange = (id, value) => {
  console.log('PATH changed for job:', id, 'to:', value);
  
  // Update parent state immediately with the new path value
  setUnsavedChanges(prev => {
    const newState = {
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        path_trabalho: value
      }
    };
    console.log('New unsavedChanges state after path change:', newState);
    return newState;
  });
};

  

  /**
   * Handles deletion of a job
   * @param {string} id - The ID of the job to delete
   */
  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro?')) {
      return;
    }

    console.log('Deleting job:', id);
    try {
      const { error } = await supabase
        .from('folhas_obra')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Error deleting record:', error);
        showToast.error(`Erro ao excluir registro: ${error.message}`);
        return;
      }
      
      console.log('Record deleted successfully:', id);
      
      // Explicitly refresh the data after deletion and ensure it completes
      try {
        await refreshData();
        console.log('Data refreshed after deletion');
      } catch (refreshError) {
        console.error('Error refreshing data after deletion:', refreshError);
        // If refresh fails, force a page reload as fallback
        window.location.reload();
      }
      
      showToast.success('Registro excluído com sucesso!');
    } catch (error) {
      console.error('Exception deleting record:', error);
      showToast.error(`Erro ao excluir registro: ${error.message}`);
    }
  };
// Helper function to get the effective state of a field (considering unsaved changes)
const getEffectiveState = (trabalho, field) => {
  if (unsavedChanges[trabalho.id] && unsavedChanges[trabalho.id][field] !== undefined) {
    return unsavedChanges[trabalho.id][field];
  }
  return trabalho[field] || false;
};

// Helper function to get the effective value of a text field (considering unsaved changes)
const getEffectiveValue = (trabalho, field) => {
  if (unsavedChanges[trabalho.id] && unsavedChanges[trabalho.id][field] !== undefined) {
    return unsavedChanges[trabalho.id][field];
  }
  return trabalho[field] || '';
};


  // Função para renderizar os ícones de status
  const renderStatus = (value) => {
    if (value === true) {
      return <span className="status-dot status-ativo"></span>;
    } else {
      // Return empty span instead of an inactive dot
      return <span></span>;
    }
  };

  // Debug function to log the current state
  useEffect(() => {
    console.log('TabelaTrabalhos rendered with trabalhos:', trabalhos);
    console.log('TabelaTrabalhos rendered with designers:', designers);
    console.log('TabelaTrabalhos rendered with unsavedChanges:', unsavedChanges);
  }, [trabalhos, designers, unsavedChanges]);

  const trabalhosOrdenados = ordenaTrabalhos(trabalhos);

  return (
    <div className="tabela-container">
      <table className="tabela-trabalhos full-width">
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
              <tr
                key={trabalho.id}
                className={`
                  ${trabalho.paginacao ? 'trabalho-concluido' : ''}
                  ${unsavedChanges[trabalho.id] ? 'trabalho-com-alteracoes' : ''}
                `}
              >
                <td>
                  {formatarData(trabalho.data_in)}
                  {unsavedChanges[trabalho.id] && (
                    <span className="unsaved-indicator" title="Alterações não salvas">*</span>
                  )}
                </td>
                <td>{trabalho.numero_fo}</td>
                <td>
                  <select
                    value={trabalho.designer_id || ''}
                    onChange={(e) => {
                      console.log('Designer dropdown changed for job:', trabalho.id, 'to designer:', e.target.value);
                      handleDesignerChange(trabalho.id, e.target.value || null);
                    }}
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
                      checked={getEffectiveState(trabalho, 'em_curso')}
                      onChange={(e) => {
                        console.log('EM CURSO checkbox changed for job:', trabalho.id, 'to:', e.target.checked);
                        handleCheckboxChange(trabalho.id, 'em_curso', e.target.checked);
                      }}
                    />
                    {renderStatus(getEffectiveState(trabalho, 'em_curso'))}
                  </label>
                </td>
                <td>
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={getEffectiveState(trabalho, 'duvidas')}
                      onChange={(e) => {
                        console.log('DUVIDAS checkbox changed for job:', trabalho.id, 'to:', e.target.checked);
                        handleCheckboxChange(trabalho.id, 'duvidas', e.target.checked);
                      }}
                    />
                    {renderStatus(getEffectiveState(trabalho, 'duvidas'))}
                  </label>
                </td>
                <td>
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={getEffectiveState(trabalho, 'maquete_enviada')}
                      onChange={(e) => {
                        console.log('MAQUETE ENVIADA checkbox changed for job:', trabalho.id, 'to:', e.target.checked);
                        handleCheckboxChange(trabalho.id, 'maquete_enviada', e.target.checked);
                      }}
                    />
                    {renderStatus(getEffectiveState(trabalho, 'maquete_enviada'))}
                  </label>
                </td>
                <td>
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={getEffectiveState(trabalho, 'paginacao')}
                      onChange={(e) => {
                        console.log('PAGINACAO checkbox changed for job:', trabalho.id, 'to:', e.target.checked);
                        handleCheckboxChange(trabalho.id, 'paginacao', e.target.checked);
                      }}
                    />
                    {renderStatus(getEffectiveState(trabalho, 'paginacao'))}
                  </label>
                </td>
                <td>{formatarData(trabalho.data_saida)}</td>
                <td>
                  <input
                    type="text"
                    value={getEffectiveValue(trabalho, 'path_trabalho')}
                    onChange={(e) => {
                      console.log('PATH changed for job:', trabalho.id, 'to:', e.target.value);
                      handlePathChange(trabalho.id, e.target.value);
                    }}
                    placeholder="Caminho do trabalho"
                  />
                </td>
                <td className="actions-cell">
                  <button
                    className="btn-excluir"
                    onClick={() => handleDelete(trabalho.id)}
                    title="Excluir Registro"
                  >
                    X
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