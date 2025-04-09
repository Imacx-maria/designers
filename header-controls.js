import React from 'react';
import './HeaderControls.css';

const HeaderControls = ({ 
  abrirModal, 
  filtroAbertos, 
  setFiltroAbertos, 
  filtroFO, 
  setFiltroFO, 
  filtroItem, 
  setFiltroItem 
}) => {
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

export default HeaderControls;
