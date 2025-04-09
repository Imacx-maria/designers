import React, { useState, useEffect, useCallback } from 'react';
import { supabase, testConnection } from './supabaseClient';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/App.css';

// Import components
import HeaderControls from './components/HeaderControls';
import NovoTrabalhoModal from './components/NovoTrabalhoModal';
import TabelaTrabalhos from './components/TabelaTrabalhos';

const App = () => {
  // Estados para dados, filtros e UI
  const [designers, setDesigners] = useState([]);
  const [trabalhos, setTrabalhos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
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

      } catch (err) {
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

  // Toast functions
  const showToast = React.useMemo(() => ({
    success: (msg) => toast.success(msg),
    error: (msg) => toast.error(msg),
    info: (msg) => toast.info(msg),
    warning: (msg) => toast.warning(msg)
  }), []);
  
  // State for unsaved changes
  const [unsavedChanges, setUnsavedChanges] = useState({});
  
  // Function to refresh data from Supabase
  const refreshData = useCallback(async () => {
    console.log('Refreshing data...');
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
        .order('data_in', { ascending: false });

      if (trabalhosError) throw trabalhosError;
      console.log('Fetched trabalhos data:', trabalhosData);
      // Force a re-render by creating a new array
      setTrabalhos([...(trabalhosData || [])]);
      showToast.success('Dados atualizados com sucesso!');

    } catch (err) {
      console.error("Error fetching data:", err);
      setError(`Failed to load data: ${err.message}`);
      showToast.error(`Erro ao atualizar dados: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]); // Remove supabase from dependencies
  
  // Function to save all changes
  const saveAllChanges = useCallback(async () => {
    console.log('Saving all changes:', unsavedChanges);
    
    if (Object.keys(unsavedChanges).length === 0) {
      showToast.info('Não há alterações para salvar');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First, get the latest data from the database to check for conflicts
      const { data: latestData, error: fetchError } = await supabase
        .from('folhas_obra')
        .select('id, updated_at')
        .in('id', Object.keys(unsavedChanges));
        
      if (fetchError) throw fetchError;
      
      // Create a map of the latest updated_at timestamps
      const latestUpdates = {};
      latestData.forEach(item => {
        latestUpdates[item.id] = item.updated_at;
      });
      
      let conflictFound = false;
      let successCount = 0;
      
      // Process each job with changes
      for (const jobId in unsavedChanges) {
        const updates = {
          ...unsavedChanges[jobId],
          updated_at: new Date().toISOString()
        };
        
        console.log(`Saving changes for job ${jobId}:`, updates);
        
        // Check if the row has been updated by someone else
        const { data: currentData, error: checkError } = await supabase
          .from('folhas_obra')
          .select('updated_at')
          .eq('id', jobId)
          .single();
          
        if (checkError) {
          console.error(`Error checking current data for job ${jobId}:`, checkError);
          continue;
        }
        
        // If the row has been updated since we loaded it, skip this update
        if (currentData.updated_at !== latestUpdates[jobId]) {
          console.warn(`Conflict detected for job ${jobId}: The row has been updated by someone else.`);
          conflictFound = true;
          continue;
        }
        
        // Update the row
        const { error } = await supabase
          .from('folhas_obra')
          .update(updates)
          .eq('id', jobId);
          
        if (error) {
          console.error(`Error updating job ${jobId}:`, error);
          continue;
        }
        
        successCount++;
      }
      
      // Clear unsaved changes for successful updates
      if (successCount > 0) {
        // Refresh data to get the latest changes
        await refreshData();
        
        // Clear unsaved changes
        setUnsavedChanges({});
        
        if (conflictFound) {
          showToast.warning('Algumas alterações foram salvas, mas outras foram ignoradas devido a conflitos. A página foi atualizada com os dados mais recentes.');
        } else {
          showToast.success('Todas as alterações foram salvas com sucesso!');
        }
      } else if (conflictFound) {
        showToast.error('Não foi possível salvar as alterações devido a conflitos. A página foi atualizada com os dados mais recentes.');
        await refreshData();
      } else {
        showToast.error('Não foi possível salvar as alterações. Por favor, tente novamente.');
      }
    } catch (err) {
      console.error("Error saving changes:", err);
      showToast.error(`Erro ao salvar alterações: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [unsavedChanges, refreshData, showToast]);

  // Test connection and fetch initial data
  useEffect(() => {
    // Test the connection first
    testConnection().then(success => {
      if (!success) {
        setError('Failed to connect to Supabase. Please check your connection.');
        return;
      }
      
      console.log('Connection test successful, fetching initial data...');
      refreshData();
    });
  }, [refreshData]); // Include refreshData in the dependency array
  
  // Funções dos componentes
  const abrirModal = () => setIsModalOpen(true);
  const fecharModal = () => setIsModalOpen(false);
  
  // Filter trabalhos based on user selections
  const trabalhosFiltrados = trabalhos.filter(trabalho => {
    // Filter by open/closed status
    if (filtroAbertos && trabalho.paginacao) {
      return false;
    }
    
    // Filter by FO number
    if (filtroFO && !trabalho.numero_fo.toString().includes(filtroFO)) {
      return false;
    }
    
    // Filter by item description
    if (filtroItem && !trabalho.item.toLowerCase().includes(filtroItem.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  if (isLoading) {
    return <div className="loading">Carregando dados...</div>;
  }

  if (error) {
    return <div className="error">Erro: {error}</div>;
  }

  return (
    <div className="app-container">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <HeaderControls
        abrirModal={abrirModal}
        filtroAbertos={filtroAbertos}
        setFiltroAbertos={setFiltroAbertos}
        filtroFO={filtroFO}
        setFiltroFO={setFiltroFO}
        filtroItem={filtroItem}
        setFiltroItem={setFiltroItem}
        refreshData={refreshData}
        saveAllChanges={saveAllChanges}
        hasUnsavedChanges={Object.keys(unsavedChanges).length > 0}
      />
      
      {isModalOpen && (
        <NovoTrabalhoModal
          fecharModal={fecharModal}
          supabase={supabase}
          showToast={showToast}
          refreshData={refreshData}
        />
      )}
      
      <TabelaTrabalhos
        trabalhos={trabalhosFiltrados}
        designers={designers}
        supabase={supabase}
        showToast={showToast}
        refreshData={refreshData}
        unsavedChanges={unsavedChanges}
        setUnsavedChanges={setUnsavedChanges}
      />
    </div>
  );
};

export default App;