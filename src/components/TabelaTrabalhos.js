import React, { useState, useMemo } from 'react'; // Removed useEffect
// Import Mantine components
import {
  Table,
  Checkbox,
  Select,
  TextInput,
  ActionIcon,
  Tooltip,
  Indicator,
  Text,
  Group,
  UnstyledButton,
  Center, // For centering sort icons
} from '@mantine/core';
// Import Lucide icons
import { Trash2, ArrowDown, ArrowUp } from 'lucide-react'; // Removed AlertCircle
// Remove old CSS import: import '../styles/TabelaTrabalhos.css';

// Helper to format designer data for Mantine Select
const formatDesignersForSelect = (designers) => {
  return designers.map(d => ({ value: d.id.toString(), label: d.nome }));
};

const TabelaTrabalhos = ({ trabalhos, designers, supabase, showToast, refreshData, unsavedChanges, setUnsavedChanges }) => {
  const [sortColumn, setSortColumn] = useState('data_in');
  const [sortDirection, setSortDirection] = useState('desc');

  // Memoize formatted designers list
  const designerOptions = useMemo(() => formatDesignersForSelect(designers), [designers]);

  // --- Sorting Logic (Keep As Is) ---
  const ordenaTrabalhos = (trabalhos) => {
    return [...trabalhos].sort((a, b) => {
      let valorA = a[sortColumn];
      let valorB = b[sortColumn];

      if (sortColumn === 'designer_id') {
        // Find designer names for comparison
        const designerA = designers.find(d => d.id === valorA);
        const designerB = designers.find(d => d.id === valorB);
        valorA = designerA?.nome || '';
        valorB = designerB?.nome || '';
      } else if (sortColumn.startsWith('data_')) {
        valorA = valorA ? new Date(valorA).getTime() : 0;
        valorB = valorB ? new Date(valorB).getTime() : 0;
      } else if (typeof valorA === 'boolean') {
        // Sort booleans (true first when descending, false first when ascending)
        valorA = valorA ? 1 : 0;
        valorB = valorB ? 1 : 0;
      } else if (typeof valorA === 'number' && typeof valorB === 'number') {
        // Standard number comparison
      } else {
        // Default to string comparison, case-insensitive
        valorA = String(valorA || '').toLowerCase();
        valorB = String(valorB || '').toLowerCase();
      }

      if (valorA < valorB) return sortDirection === 'asc' ? -1 : 1;
      if (valorA > valorB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (column) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc'); // Default to ascending when changing column
    }
  };
  // --- End Sorting Logic ---

  // --- Data Formatting (Keep As Is) ---
  const formatarData = (dataString) => {
    if (!dataString) return '';
    const data = new Date(dataString);
    // Format as DD/MM/YYYY HH:MM
    return `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear()} ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
  };
  // --- End Data Formatting ---

  // --- Event Handlers (Keep Logic, Adapt for Mantine if needed) ---
  const handleDesignerChange = (id, designerId) => {
    console.log('Designer dropdown changed for job:', id, 'to designer:', designerId);
    setUnsavedChanges(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        designer_id: designerId || null, // Ensure null if empty
        em_curso: !!designerId // Set em_curso to true only if a designer is selected
      }
    }));
  };

  const handleCheckboxChange = (id, field, value) => {
    console.log(`${field} checkbox changed for job:`, id, 'to:', value);
    // Allow unchecking now, logic might need adjustment based on desired workflow
    // if (value === false) {
    //   console.log('Ignoring attempt to uncheck a checkbox - only one state can be active');
    //   return;
    // }

    const updates = {
      // Reset other statuses if one is checked (optional, based on workflow)
      // em_curso: false,
      // duvidas: false,
      // maquete_enviada: false,
      // paginacao: false
    };

    updates[field] = value; // Set the changed field

    // Apply additional business logic rules
    if (field === 'duvidas' && value) {
      updates.data_duvidas = new Date().toISOString();
    } else if (field === 'maquete_enviada' && value) {
      updates.data_envio = new Date().toISOString();
    } else if (field === 'paginacao' && value) {
      updates.data_saida = new Date().toISOString();
      // Optionally set other statuses to false when paginacao is checked
      updates.em_curso = false;
      updates.duvidas = false;
      updates.maquete_enviada = false;
    } else if (field === 'em_curso' && value) {
        // If setting em_curso, ensure a designer is assigned or clear it
        const currentDesigner = getEffectiveValue(trabalhos.find(t => t.id === id), 'designer_id');
        if (!currentDesigner) {
            showToast.warning('Selecione um designer para marcar como "Em Curso".');
            return; // Prevent setting em_curso without a designer
        }
        // Optionally clear other statuses when starting work
        updates.duvidas = false;
        updates.maquete_enviada = false;
        updates.paginacao = false;
    }


    setUnsavedChanges(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        ...updates
      }
    }));
  };

  const handlePathChange = (id, value) => {
    console.log('PATH changed for job:', id, 'to:', value);
    setUnsavedChanges(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        path_trabalho: value
      }
    }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro?')) {
      return;
    }
    console.log('Deleting job:', id);
    try {
      const { error } = await supabase.from('folhas_obra').delete().eq('id', id);
      if (error) throw error;
      console.log('Record deleted successfully:', id);
      await refreshData(); // Refresh data after successful deletion
      showToast.success('Registro excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting record:', error);
      showToast.error(`Erro ao excluir registro: ${error.message}`);
      // Consider if refresh is needed even on error
    }
  };
  // --- End Event Handlers ---

  // --- Helper Functions (Keep As Is) ---
  const getEffectiveState = (trabalho, field) => {
    return unsavedChanges[trabalho.id]?.[field] ?? trabalho[field] ?? false;
  };

  const getEffectiveValue = (trabalho, field) => {
    return unsavedChanges[trabalho.id]?.[field] ?? trabalho[field] ?? '';
  };
  // --- End Helper Functions ---

  const trabalhosOrdenados = ordenaTrabalhos(trabalhos);

  // Helper component for Sortable Header Cell
  const Th = ({ children, reversed, sorted, onSort }) => {
    const Icon = sorted ? (reversed ? ArrowUp : ArrowDown) : null; // Use Lucide icons
    return (
      <Table.Th>
        <UnstyledButton onClick={onSort} style={{ width: '100%' }}>
          <Group justify="space-between" gap="xs" wrap="nowrap">
            <Text fw={500} fz="sm">{children}</Text>
            {Icon && <Center><Icon size={14} /></Center>}
          </Group>
        </UnstyledButton>
      </Table.Th>
    );
  };

  const rows = trabalhosOrdenados.map((trabalho) => {
    const hasChanges = !!unsavedChanges[trabalho.id];
    const isCompleted = getEffectiveState(trabalho, 'paginacao'); // Check if completed

    return (
      <Table.Tr key={trabalho.id} bg={isCompleted ? 'gray.1' : undefined}>
        <Table.Td>
          <Indicator color="orange" size={6} disabled={!hasChanges} processing={hasChanges}>
            {formatarData(trabalho.data_in)}
          </Indicator>
        </Table.Td>
        <Table.Td>{trabalho.numero_fo}</Table.Td>
        <Table.Td>
          <Select
            size="xs"
            placeholder="Selecionar"
            data={designerOptions}
            value={getEffectiveValue(trabalho, 'designer_id')?.toString() || null} // Ensure value is string or null
            onChange={(value) => handleDesignerChange(trabalho.id, value)}
            allowDeselect
            searchable
          />
        </Table.Td>
        <Table.Td>{trabalho.item}</Table.Td>
        {/* Status Checkboxes */}
        <Table.Td>
          <Checkbox
            size="xs"
            checked={getEffectiveState(trabalho, 'em_curso')}
            onChange={(e) => handleCheckboxChange(trabalho.id, 'em_curso', e.target.checked)}
            disabled={isCompleted} // Disable if completed
          />
        </Table.Td>
        <Table.Td>
          <Checkbox
            size="xs"
            checked={getEffectiveState(trabalho, 'duvidas')}
            onChange={(e) => handleCheckboxChange(trabalho.id, 'duvidas', e.target.checked)}
            disabled={isCompleted}
          />
        </Table.Td>
        <Table.Td>
          <Checkbox
            size="xs"
            checked={getEffectiveState(trabalho, 'maquete_enviada')}
            onChange={(e) => handleCheckboxChange(trabalho.id, 'maquete_enviada', e.target.checked)}
            disabled={isCompleted}
          />
        </Table.Td>
        <Table.Td>
          <Checkbox
            size="xs"
            checked={isCompleted} // Directly use isCompleted
            onChange={(e) => handleCheckboxChange(trabalho.id, 'paginacao', e.target.checked)}
          />
        </Table.Td>
        <Table.Td>{formatarData(trabalho.data_saida)}</Table.Td>
        <Table.Td>
          <TextInput
            size="xs"
            placeholder="Caminho..."
            value={getEffectiveValue(trabalho, 'path_trabalho')}
            onChange={(e) => handlePathChange(trabalho.id, e.target.value)}
            disabled={isCompleted}
          />
        </Table.Td>
        <Table.Td>
          <Tooltip label="Excluir Registro" withArrow position="left">
            <ActionIcon
              variant="subtle" // Use subtle variant for less emphasis
              color="red"
              onClick={() => handleDelete(trabalho.id)}
            >
              <Trash2 size={16} />
            </ActionIcon>
          </Tooltip>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Table.ScrollContainer minWidth={1200}> {/* Enable horizontal scroll */}
      <Table
        striped
        highlightOnHover
        withTableBorder
        withColumnBorders
        verticalSpacing="xs" // Adjust spacing
        fz="xs" // Adjust font size for density
      >
        <Table.Thead>
          <Table.Tr>
            <Th sorted={sortColumn === 'data_in'} reversed={sortDirection === 'desc'} onSort={() => handleSort('data_in')}>DATA IN</Th>
            <Th sorted={sortColumn === 'numero_fo'} reversed={sortDirection === 'desc'} onSort={() => handleSort('numero_fo')}>FO</Th>
            <Th sorted={sortColumn === 'designer_id'} reversed={sortDirection === 'desc'} onSort={() => handleSort('designer_id')}>DESIGNER</Th>
            <Th sorted={sortColumn === 'item'} reversed={sortDirection === 'desc'} onSort={() => handleSort('item')}>ITEM</Th>
            <Th sorted={sortColumn === 'em_curso'} reversed={sortDirection === 'desc'} onSort={() => handleSort('em_curso')}>EM CURSO</Th>
            <Th sorted={sortColumn === 'duvidas'} reversed={sortDirection === 'desc'} onSort={() => handleSort('duvidas')}>DÚVIDAS</Th>
            <Th sorted={sortColumn === 'maquete_enviada'} reversed={sortDirection === 'desc'} onSort={() => handleSort('maquete_enviada')}>MAQUETE</Th>
            <Th sorted={sortColumn === 'paginacao'} reversed={sortDirection === 'desc'} onSort={() => handleSort('paginacao')}>PAGINAÇÃO</Th>
            <Th sorted={sortColumn === 'data_saida'} reversed={sortDirection === 'desc'} onSort={() => handleSort('data_saida')}>DATA SAÍDA</Th>
            <Th sorted={sortColumn === 'path_trabalho'} reversed={sortDirection === 'desc'} onSort={() => handleSort('path_trabalho')}>PATH</Th>
            <Table.Th>AÇÕES</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={11}> {/* Adjust colSpan */}
                <Text ta="center" py="lg">Nenhum trabalho encontrado.</Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
};

export default TabelaTrabalhos;