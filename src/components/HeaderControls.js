import React from 'react';
// Import Mantine components
import { Group, Switch, TextInput, Button, Paper } from '@mantine/core'; // Import Paper
// Import Lucide icons
import { Search, RefreshCw, Save, Plus } from 'lucide-react';
// Remove old CSS import: import '../styles/HeaderControls.css';

const HeaderControls = ({
  abrirModal,
  filtroAbertos,
  setFiltroAbertos,
  filtroFO,
  setFiltroFO,
  filtroItem,
  setFiltroItem,
  refreshData,
  saveAllChanges,
  hasUnsavedChanges
}) => {
  const handleFOChange = (e) => {
    // Allow only numbers and limit to 4 digits
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setFiltroFO(value);
  };

  return (
    // Wrap controls in Paper for consistent styling with MetricsPage
    <Paper shadow="xs" p="md" mb="lg" withBorder>
      <Group justify="space-between"> {/* Remove mb="md" from Group */}
      {/* Group for Filters */}
      <Group>
        <Switch
          label="Apenas trabalhos em aberto"
          checked={filtroAbertos}
          onChange={(event) => setFiltroAbertos(event.currentTarget.checked)}
          size="sm" // Adjust size if needed
        />
        <TextInput
          placeholder="Filtrar por FO (ex: 1234)"
          value={filtroFO}
          onChange={handleFOChange}
          leftSection={<Search size={16} />}
          style={{ width: 200 }} // Adjust width as needed
        />
        <TextInput
          placeholder="Filtrar por ITEM"
          value={filtroItem}
          onChange={(e) => setFiltroItem(e.target.value)}
          leftSection={<Search size={16} />}
          style={{ width: 200 }} // Adjust width as needed
        />
      </Group>

      {/* Group for Actions */}
      <Group>
        <Button
          variant="outline" // Or choose another variant
          onClick={refreshData}
          title="Atualizar dados"
          leftSection={<RefreshCw size={16} />}
        >
          Atualizar
        </Button>
        {hasUnsavedChanges && (
          <Button
            variant="filled" // Or choose another variant
            color="yellow" // Use a color indicating caution/action
            onClick={saveAllChanges}
            title="Salvar todas as alterações"
            leftSection={<Save size={16} />}
          >
            Salvar Alterações
          </Button>
        )}
        <Button
          onClick={abrirModal}
          leftSection={<Plus size={16} />}
          color="acidOrange" // Use the primary theme color
        >
          Novo Trabalho
        </Button>
      </Group>
      </Group>
    </Paper>
  );
};

export default HeaderControls;