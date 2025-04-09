import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Import useNavigate and remove Link if no longer needed elsewhere
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { supabase, testConnection } from './supabaseClient';
import 'react-toastify/dist/ReactToastify.css';

// Import Mantine components
import { AppShell, Group, Text, useMantineTheme } from '@mantine/core';
// Import Lucide icons
import { LayoutDashboard, ListChecks } from 'lucide-react';

// Import Page Components
import HomePage from './components/HomePage';
import MetricsPage from './components/MetricsPage';

const App = () => {
  // --- Existing State and Logic (Keep As Is) ---
  const [designers, setDesigners] = useState([]);
  const [trabalhos, setTrabalhos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filtroAbertos, setFiltroAbertos] = useState(true);
  const [filtroFO, setFiltroFO] = useState('');
  const [filtroItem, setFiltroItem] = useState('');
  const [unsavedChanges, setUnsavedChanges] = useState({});

  const showToast = useMemo(() => ({
    success: (msg) => toast.success(msg),
    error: (msg) => toast.error(msg),
    info: (msg) => toast.info(msg),
    warning: (msg) => toast.warning(msg)
  }), []);

  const refreshData = useCallback(async () => {
    // ... (refreshData logic remains the same)
    console.log('App: Refreshing data...');
    setIsLoading(true);
    setError(null);
    try {
      const { data: designersData, error: designersError } = await supabase
        .from('designers').select('*').eq('ativo', true);
      if (designersError) throw designersError;
      setDesigners(designersData || []);

      const { data: trabalhosData, error: trabalhosError } = await supabase
        .from('folhas_obra').select('*').order('data_in', { ascending: false });
      if (trabalhosError) throw trabalhosError;
      setTrabalhos([...(trabalhosData || [])]);
      // showToast.success('Dados atualizados com sucesso!'); // Remove toast from here, let caller handle it
    } catch (err) {
      console.error("App: Error fetching data:", err);
      setError(`Failed to load data: ${err.message}`);
      showToast.error(`Erro ao atualizar dados: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const saveAllChanges = useCallback(async () => {
    // ... (saveAllChanges logic remains the same)
    console.log('App: Saving all changes:', unsavedChanges);
    if (Object.keys(unsavedChanges).length === 0) {
      showToast.info('Não há alterações para salvar');
      return;
    }
    setIsLoading(true);
    try {
      const { data: latestData, error: fetchError } = await supabase
        .from('folhas_obra').select('id, updated_at').in('id', Object.keys(unsavedChanges));
      if (fetchError) throw fetchError;

      const latestUpdates = latestData.reduce((acc, item) => { acc[item.id] = item.updated_at; return acc; }, {});
      let conflictFound = false;
      let successCount = 0;

      for (const jobId in unsavedChanges) {
        const updates = { ...unsavedChanges[jobId], updated_at: new Date().toISOString() };
        const { data: currentData, error: checkError } = await supabase
          .from('folhas_obra').select('updated_at').eq('id', jobId).single();

        if (checkError) { console.error(`Error checking current data for job ${jobId}:`, checkError); continue; }
        if (currentData && latestUpdates[jobId] && currentData.updated_at !== latestUpdates[jobId]) {
             console.warn(`Conflict detected for job ${jobId}.`); conflictFound = true; continue;
        }


        const { error } = await supabase.from('folhas_obra').update(updates).eq('id', jobId);
        if (error) { console.error(`Error updating job ${jobId}:`, error); continue; }
        successCount++;
      }

      if (successCount > 0) {
        await refreshData();
        setUnsavedChanges({});
        showToast.success(conflictFound ? 'Algumas alterações salvas, outras ignoradas devido a conflitos.' : 'Alterações salvas com sucesso!');
      } else if (conflictFound) {
        showToast.error('Não foi possível salvar devido a conflitos.');
        await refreshData();
      } else {
        showToast.error('Não foi possível salvar as alterações.');
      }
    } catch (err) {
      console.error("App: Error saving changes:", err);
      showToast.error(`Erro ao salvar alterações: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [unsavedChanges, refreshData, showToast]);

  const abrirModal = () => setIsModalOpen(true);
  const fecharModal = () => setIsModalOpen(false);

  useEffect(() => {
    // ... (initial data fetch logic remains the same)
    testConnection().then(success => {
      if (!success) {
        setError('Failed to connect to Supabase.');
        setIsLoading(false);
        return;
      }
      console.log('App: Connection test successful, fetching initial data...');
      refreshData();
    });
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // --- End of Existing State and Logic ---

  const theme = useMantineTheme();
  const location = useLocation();
  const navigate = useNavigate(); // Initialize navigate



  return (
    <AppShell
      padding="md" // Restore AppShell padding
      header={{ height: 80 }}
    >
      <AppShell.Header style={{ backgroundColor: theme.black, display: 'flex', alignItems: 'center' }}>
        <Group h="100%" px="md" justify="space-between" align="center" style={{ width: '100%' }}>
          <Text size="xl" fw={700} c={theme.white}>Designer Flow</Text>
          <div style={{ display: 'flex', flexDirection: 'row', gap: '20px' }}>
            <div
              onClick={() => navigate('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                color: location.pathname === '/' ? theme.black : theme.white,
                backgroundColor: location.pathname === '/' ? theme.colors.acidOrange[6] : 'transparent',
                padding: '8px 16px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.acidOrange[6];
                e.currentTarget.style.color = theme.black;
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = theme.white;
                }
              }}
            >
              <ListChecks size={16} style={{ marginRight: '8px' }} />
              <span>Home</span>
            </div>
            <div
              onClick={() => navigate('/metrics')}
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                color: location.pathname === '/metrics' ? theme.black : theme.white,
                backgroundColor: location.pathname === '/metrics' ? theme.colors.acidOrange[6] : 'transparent',
                padding: '8px 16px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.acidOrange[6];
                e.currentTarget.style.color = theme.black;
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== '/metrics') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = theme.white;
                }
              }}
            >
              <LayoutDashboard size={16} style={{ marginRight: '8px' }} />
              <span>Metrics</span>
            </div>
          </div>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                designers={designers}
                trabalhos={trabalhos}
                isLoading={isLoading}
                error={error}
                filtroAbertos={filtroAbertos}
                filtroFO={filtroFO}
                filtroItem={filtroItem}
                setFiltroItem={setFiltroItem} // Pass setFiltroItem
                unsavedChanges={unsavedChanges}
                setUnsavedChanges={setUnsavedChanges}
                isModalOpen={isModalOpen}
                abrirModal={abrirModal} // Pass abrirModal
                fecharModal={fecharModal}
                showToast={showToast}
                refreshData={refreshData}
                saveAllChanges={saveAllChanges} // Pass saveAllChanges
                supabase={supabase}
                setFiltroAbertos={setFiltroAbertos} // Pass setFiltroAbertos
                setFiltroFO={setFiltroFO} // Pass setFiltroFO
              />
            }
          />
          <Route path="/metrics" element={<MetricsPage />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
};

export default App;