import React, { useState } from 'react';
// Import Mantine components
import {
  Modal,
  TextInput,
  Button,
  Group,
  Stack,
  ActionIcon,
  Text,
  NumberInput, // Use NumberInput for FO
} from '@mantine/core';
// Import Lucide icons
import { Plus, Trash2 } from 'lucide-react'; // Removed X
// Remove old CSS import: import '../styles/NovoTrabalhoModal.css';

// Update props to receive isModalOpen
const NovoTrabalhoModal = ({ isModalOpen, fecharModal, supabase, showToast, refreshData }) => {
  // Keep existing state
  const [numeroFO, setNumeroFO] = useState(''); // Keep as string for NumberInput or change to number
  const [itens, setItens] = useState(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep existing handlers, adjust if needed for NumberInput
  const handleNumeroFOChange = (value) => {
    // NumberInput handles numeric validation, clamp, etc.
    setNumeroFO(value); // value is number or string depending on config
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
    if (itens.length === 1) return;
    const novosItens = [...itens];
    novosItens.splice(index, 1);
    setItens(novosItens);
  };

  // Keep existing handleSubmit logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submitting new job form...');

    if (!numeroFO) { // Check if numeroFO is empty or 0
      showToast.error('O número da FO é obrigatório');
      return;
    }

    const numeroFOInt = parseInt(numeroFO, 10); // Ensure it's parsed correctly
    if (isNaN(numeroFOInt) || numeroFOInt <= 0) {
      showToast.error('O número da FO deve ser um número positivo');
      return;
    }

    const itensValidos = itens.filter(item => item.trim() !== '');
    if (itensValidos.length === 0) {
      showToast.error('É necessário adicionar pelo menos um item');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if FO number already exists
      console.log(`Checking existence for FO: ${numeroFOInt}`);
      const { error: checkError, count } = await supabase // Remove unused 'existingFo'
        .from('folhas_obra')
        .select('id', { count: 'exact', head: true }) // Efficiently check count
        .eq('numero_fo', numeroFOInt);

      if (checkError) {
        console.error('Error checking FO existence:', checkError);
        throw new Error('Não foi possível verificar o número da FO. Tente novamente.'); // Throw a user-friendly error
      }

      console.log(`Count for existing FO ${numeroFOInt}:`, count);
      if (count > 0) {
        showToast.error('Esse número de FO já existe');
        setIsSubmitting(false); // Reset submitting state
        return; // Stop submission
      }

      // --- Proceed with insertion if FO doesn't exist ---
      const registros = itensValidos.map(item => ({
        numero_fo: numeroFOInt,
        item: item,
        em_curso: false,
        duvidas: false,
        maquete_enviada: false,
        paginacao: false,
        data_in: new Date().toISOString(),
      }));

      console.log('Preparing to insert records:', registros);
      const { data, error } = await supabase
        .from('folhas_obra')
        .insert(registros)
        .select();

      if (error) throw error; // Throw error to be caught below

      console.log('Records inserted successfully:', data);
      showToast.success(`${registros.length} trabalho(s) adicionado(s) com sucesso!`);

      if (refreshData) {
        console.log('Refreshing data after adding new job...');
        await refreshData(); // Ensure refresh completes
      }

      // Reset form state after successful submission
      setNumeroFO('');
      setItens(['']);
      fecharModal();

    } catch (error) {
      console.error('Error adding job:', error);
      showToast.error(`Erro ao adicionar trabalho: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset state when modal closes
  const handleClose = () => {
      setNumeroFO('');
      setItens(['']);
      setIsSubmitting(false); // Reset submitting state as well
      fecharModal();
  }

  return (
    <Modal
      opened={isModalOpen}
      onClose={handleClose} // Use the enhanced close handler
      title="Novo Trabalho"
      size="lg" // Make modal wider
      centered // Center the modal
      overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
      transitionProps={{ transition: 'fade', duration: 200 }}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md"> {/* Use Stack for vertical spacing */}
          <NumberInput
            label="Número FO"
            placeholder="Ex: 1234"
            value={numeroFO}
            onChange={handleNumeroFOChange}
            min={1} // Minimum value
            max={9999} // Maximum value based on 4 digits
            allowDecimal={false}
            required // Mark as required
            hideControls // Hide spinner controls if desired
          />

          <Text fw={500}>Itens</Text>
          <Stack gap="xs">
            {itens.map((item, index) => (
              <Group key={index} gap="xs" wrap="nowrap"> {/* Remove grow prop, add nowrap */}
                <TextInput
                  placeholder={`Item ${index + 1} (Ex: Expositor Sumol verão)`}
                  value={item}
                  onChange={(e) => handleItemChange(index, e.target.value)}
                  style={{ flexGrow: 1 }} // Ensure TextInput grows
                />
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => removerItem(index)}
                  disabled={itens.length === 1}
                  title="Remover Item"
                 style={{ width: 36, height: 36 }} // Make button square
               >
                 <Trash2 size={16} />
               </ActionIcon>
              </Group>
            ))}
          </Stack>

          <Button
            variant="light" // Use light variant for less emphasis
            leftSection={<Plus size={16} />}
            onClick={adicionarItem}
            fullWidth // Make button take full width
          >
            Adicionar Item
          </Button>

          {/* Footer Buttons */}
          <Group justify="flex-end" mt="lg"> {/* Push buttons to the right */}
            <Button
              variant="default" // Default variant for cancel
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isSubmitting} // Show loading state
              color="acidOrange" // Use primary color for submit
            >
              Confirmar Trabalho
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default NovoTrabalhoModal;