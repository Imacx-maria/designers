import React from 'react';
import { Title, Container } from '@mantine/core'; // Import Title and Container components
// Supabase client and testConnection are passed as props if needed by children
// Toast function is passed as prop
// import '../styles/App.css'; // Removed this line

// Import specific components used by this page
import NovoTrabalhoModal from './NovoTrabalhoModal';
import TabelaTrabalhos from './TabelaTrabalhos';
import HeaderControls from './HeaderControls'; // Import HeaderControls
// Receive state and functions as props from App.js
const HomePage = ({
  designers,
  trabalhos,
  isLoading,
  error,
  filtroAbertos,
  filtroFO,
  filtroItem,
  unsavedChanges,
  setUnsavedChanges,
  isModalOpen, // Receive isModalOpen prop
  fecharModal,
  showToast,
  refreshData,
  supabase, // Receive supabase client instance
  // Receive new props
  setFiltroAbertos,
  setFiltroFO,
  setFiltroItem,
  abrirModal,
  saveAllChanges
}) => {
  // State definitions, toast, refreshData, saveAllChanges, modal functions, useEffects are removed
  // They are now managed by the App component

  // Modal functions (abrirModal, fecharModal) are received as props

  // Filter logic remains here, using props for filters and data
  const trabalhosFiltrados = React.useMemo(() => {
      return trabalhos.filter(trabalho => {
        if (filtroAbertos && trabalho.paginacao) return false;
        // Ensure numero_fo exists and is a number before calling toString
        if (filtroFO && (!trabalho.numero_fo || !trabalho.numero_fo.toString().includes(filtroFO))) return false;
        // Ensure item exists before calling toLowerCase
        if (filtroItem && (!trabalho.item || !trabalho.item.toLowerCase().includes(filtroItem.toLowerCase()))) return false;
        return true;
      });
  }, [trabalhos, filtroAbertos, filtroFO, filtroItem]); // Recalculate when data or filters change

  // Refactor loading/error states to use Mantine components
  if (isLoading) {
    // Consider using Mantine Loader or Skeleton here
    return <div>Carregando dados...</div>; // Placeholder
  }

  if (error) {
    // Consider using Mantine Alert here
    return <div>Erro: {error}</div>; // Placeholder
  }

  // JSX structure moved from App.js
  return (
    <Container fluid pt="md"> {/* Revert top padding to md to match MetricsPage */}
      <Title order={2} mb="lg">Trabalhos Pré Impressão</Title> {/* Remove top margin */}
      {/* Render HeaderControls here */}
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
      {/* Pass isModalOpen to NovoTrabalhoModal */}
      <NovoTrabalhoModal
        isModalOpen={isModalOpen} // Pass the state here
        fecharModal={fecharModal}
        supabase={supabase}
        showToast={showToast}
        refreshData={refreshData}
      />

      <TabelaTrabalhos
        trabalhos={trabalhosFiltrados}
        designers={designers}
        supabase={supabase}
        showToast={showToast}
        refreshData={refreshData}
        unsavedChanges={unsavedChanges}
        setUnsavedChanges={setUnsavedChanges}
      />
      {/* NovoTrabalhoModal is likely intended to be outside the main content flow */}
    </Container>
  );
};

export default HomePage;