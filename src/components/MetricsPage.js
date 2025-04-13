import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// Import Mantine components
import {
  Container,
  Grid,
  Card,
  Text,
  Title,
  Select,
  SegmentedControl,
  Group,
  Stack,
  Table,
  Paper,
  Loader, // Added Loader
  Alert, // Added Alert
  useMantineTheme, // Hook to access theme
} from '@mantine/core';
// Import Lucide icon for error alert
import { AlertCircle } from 'lucide-react';

const MetricsPage = () => {
  // --- Existing State (Keep As Is) ---
  const [designers, setDesigners] = useState([]);
  const [trabalhos, setTrabalhos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('year');
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  // --- End Existing State ---

  const theme = useMantineTheme(); // Access theme colors

  // --- Helper Functions (Keep As Is) ---
  const getMonthName = useCallback((monthNumber) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('default', { month: 'long' });
  }, []);

  const monthOptions = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      value: (i + 1).toString(),
      label: getMonthName(i + 1),
    })), [getMonthName]);

  const yearOptions = useMemo(() =>
    availableYears.map(year => ({
      value: year.toString(),
      label: year.toString(),
    })), [availableYears]);
  // --- End Helper Functions ---

  // --- Data Fetching (Keep As Is) ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    console.log('MetricsPage: Fetching data...');
    try {
      const { data: designersData, error: designersError } = await supabase
        .from('designers')
        .select('id, nome')
        .eq('ativo', true);
      if (designersError) throw designersError;
      setDesigners(designersData || []);
      console.log('MetricsPage: Fetched designers:', designersData);

      const { data: trabalhosData, error: trabalhosError } = await supabase
        .from('folhas_obra')
        .select('id, designer_id, data_in, data_saida, numero_fo, item');
      if (trabalhosError) throw trabalhosError;
      setTrabalhos(trabalhosData || []);
      console.log('MetricsPage: Fetched trabalhos:', trabalhosData);

    } catch (err) {
      console.error("MetricsPage: Error fetching data:", err);
      setError(`Failed to load data: ${err.message}`);
      setDesigners([]);
      setTrabalhos([]);
    } finally {
      setIsLoading(false);
      console.log('MetricsPage: Fetching complete.');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (trabalhos.length > 0) {
      const years = new Set(
        trabalhos
          .map(t => t.data_in ? new Date(t.data_in).getFullYear() : null)
          .filter(year => year !== null)
      );
      const sortedYears = Array.from(years).sort((a, b) => b - a);

      if (JSON.stringify(sortedYears) !== JSON.stringify(availableYears)) {
          setAvailableYears(sortedYears);
          if (sortedYears.length > 0 && !sortedYears.includes(selectedYear)) {
              setSelectedYear(sortedYears[0]);
          } else if (sortedYears.length === 0) {
               setSelectedYear(new Date().getFullYear());
          }
      }
    } else {
        if (availableYears.length > 0) {
            setAvailableYears([]);
            setSelectedYear(new Date().getFullYear());
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trabalhos]);
  // --- End Data Fetching ---

  // --- Metric Calculation Logic (Keep As Is, ensure parseFloat for averages) ---
  const metrics = useMemo(() => {
    if (!trabalhos.length || !designers.length) {
      return { worksPerDesigner: [], avgTimePerDesigner: [], openedPerMonth: [], top10FoPerDesigner: {}, totalWorks: 0, overallAvgTime: 0 };
    }

    console.log(`Calculating metrics for filter: ${filterType}, year: ${selectedYear}, month: ${selectedMonth}`);
    const filteredTrabalhos = trabalhos.filter(t => {
      if (!t.data_in) return false;
      const dataIn = new Date(t.data_in);
      const year = dataIn.getFullYear();
      const month = dataIn.getMonth() + 1;
      if (filterType === 'year') return year === selectedYear;
      return year === selectedYear && month === selectedMonth;
    });
    console.log(`Filtered trabalhos count: ${filteredTrabalhos.length}`);

    const designerMap = designers.reduce((acc, designer) => { acc[designer.id] = designer.nome; return acc; }, {});

    const worksCount = filteredTrabalhos.reduce((acc, t) => {
      const designerId = t.designer_id || 'unknown';
      acc[designerId] = (acc[designerId] || 0) + 1;
      return acc;
    }, {});
    const worksPerDesigner = Object.entries(worksCount).map(([designerId, count]) => ({
      name: designerMap[designerId] || designerId, count: count,
    }));
    const totalWorks = filteredTrabalhos.length;

    const timeDiffs = filteredTrabalhos
      .filter(t => t.data_in && t.data_saida)
      .map(t => {
        const diffDays = Math.ceil(Math.abs(new Date(t.data_saida) - new Date(t.data_in)) / (1000 * 60 * 60 * 24));
        return { designerId: t.designer_id || 'unknown', diffDays };
      });
    const timeSums = timeDiffs.reduce((acc, item) => {
      const designerId = item.designerId;
      if (!acc[designerId]) acc[designerId] = { totalDays: 0, count: 0 };
      acc[designerId].totalDays += item.diffDays;
      acc[designerId].count += 1;
      return acc;
    }, {});
    const avgTimePerDesigner = Object.entries(timeSums).map(([designerId, data]) => ({
      name: designerMap[designerId] || designerId,
      averageDays: data.count > 0 ? parseFloat((data.totalDays / data.count).toFixed(1)) : 0,
    }));
    const totalDaysSum = timeDiffs.reduce((sum, item) => sum + item.diffDays, 0);
    const overallAvgTime = timeDiffs.length > 0 ? parseFloat((totalDaysSum / timeDiffs.length).toFixed(1)) : 0;

    const openedPerMonthData = {};
    if (availableYears.includes(selectedYear)) {
        trabalhos
            .filter(t => t.data_in && new Date(t.data_in).getFullYear() === selectedYear)
            .forEach(t => {
                const month = new Date(t.data_in).getMonth();
                openedPerMonthData[month] = (openedPerMonthData[month] || 0) + 1;
            });
    }
    const openedPerMonth = Array.from({ length: 12 }).map((_, i) => ({
        month: getMonthName(i + 1).substring(0, 3),
        count: openedPerMonthData[i] || 0,
    }));

    const top10FoPerDesigner = {};
    designers.forEach(designer => {
      const designerTrabalhos = filteredTrabalhos
          .filter(t => t.designer_id === designer.id && t.numero_fo != null)
          .sort((a, b) => b.numero_fo - a.numero_fo)
          .slice(0, 10);
      top10FoPerDesigner[designer.id] = designerTrabalhos.map(t => {
          let daysTaken = null;
          if (t.data_in && t.data_saida) {
              daysTaken = Math.ceil(Math.abs(new Date(t.data_saida) - new Date(t.data_in)) / (1000 * 60 * 60 * 24));
          }
          return { numero_fo: t.numero_fo, item: t.item || 'N/A', daysTaken: daysTaken };
      });
    });

    return { worksPerDesigner, avgTimePerDesigner, openedPerMonth, top10FoPerDesigner, totalWorks, overallAvgTime };

  }, [trabalhos, designers, filterType, selectedYear, selectedMonth, availableYears, getMonthName]);
  // --- End Calculation Logic ---

  // --- Render Logic ---
  if (isLoading) {
    return <Container pt="xl" style={{ textAlign: 'center' }}><Loader color="acidOrange" /></Container>;
  }

  if (error) {
    return (
      <Container pt="xl">
        <Alert icon={<AlertCircle size={16} />} title="Erro" color="red" variant="light">
          {error}
        </Alert>
      </Container>
    );
  }

  const periodString = filterType === 'year'
    ? `Ano ${selectedYear}`
    : `Mês ${getMonthName(selectedMonth)}/${selectedYear}`;

  return (
    <Container fluid pt="md"> {/* Use fluid container for full width */}
      <Title order={2} mb="lg">Dashboard de Métricas</Title>

      {/* Filter Controls */}
      <Paper shadow="xs" p="md" mb="lg" withBorder>
        <Group justify="space-between">
          <Title order={4}>Filtros</Title>
          <Group>
            <SegmentedControl
              value={filterType}
              onChange={setFilterType}
              data={[
                { label: 'Por Ano', value: 'year' },
                { label: 'Por Mês', value: 'month' },
              ]}
              color="acidOrange"
            />
            <Select
              value={selectedYear.toString()}
              onChange={(value) => setSelectedYear(parseInt(value, 10))}
              data={yearOptions}
              disabled={availableYears.length === 0}
              placeholder="Selecione o Ano"
              style={{ width: 120 }}
            />
            {filterType === 'month' && (
              <Select
                value={selectedMonth.toString()}
                onChange={(value) => setSelectedMonth(parseInt(value, 10))}
                data={monthOptions}
                placeholder="Selecione o Mês"
                style={{ width: 150 }}
              />
            )}
          </Group>
        </Group>
      </Paper>

      {/* Summary Cards */}
      <Grid gutter="md" mb="lg">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={5} c="dimmed">Total de Trabalhos</Title>
            <Text size="xl" fw={700}>{metrics.totalWorks}</Text>
            <Text size="sm" c="dimmed">{periodString}</Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={5} c="dimmed">Tempo Médio Geral</Title>
            <Text size="xl" fw={700}>{metrics.overallAvgTime} dias</Text>
            <Text size="sm" c="dimmed">{periodString} (com data de saída)</Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Chart Grid */}
      <Grid gutter="md" mb="lg">
        {/* Works per Designer */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder h={350}>
            <Title order={4} mb="md">Trabalhos por Designer ({periodString})</Title>
            {metrics.worksPerDesigner.length > 0 ? (
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={metrics.worksPerDesigner} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.gray[3]} />
                  <XAxis dataKey="name" stroke={theme.colors.gray[7]} />
                  <YAxis allowDecimals={false} stroke={theme.colors.gray[7]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill={theme.colors.acidOrange[6]} name="Nº Trabalhos" />
                </BarChart>
              </ResponsiveContainer>
            ) : <Text c="dimmed">Sem dados para este período.</Text>}
          </Card>
        </Grid.Col>

        {/* Average Time per Designer */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder h={350}>
            <Title order={4} mb="md">Tempo Médio por Designer ({periodString})</Title>
            {metrics.avgTimePerDesigner.length > 0 ? (
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={metrics.avgTimePerDesigner} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.gray[3]} />
                  <XAxis dataKey="name" stroke={theme.colors.gray[7]} />
                  <YAxis stroke={theme.colors.gray[7]} />
                  <Tooltip formatter={(value) => `${value} dias`} />
                  <Legend />
                  <Bar dataKey="averageDays" fill={theme.colors.blue[6]} name="Tempo Médio (dias)" />
                </BarChart>
              </ResponsiveContainer>
            ) : <Text c="dimmed">Sem dados para este período.</Text>}
          </Card>
        </Grid.Col>

        {/* Opened per Month */}
        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg" radius="md" withBorder h={350}>
            <Title order={4} mb="md">Trabalhos Abertos por Mês ({selectedYear})</Title>
            {metrics.openedPerMonth.some(m => m.count > 0) ? (
              <ResponsiveContainer width="100%" height="80%">
                <LineChart data={metrics.openedPerMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.gray[3]} />
                  <XAxis dataKey="month" stroke={theme.colors.gray[7]} />
                  <YAxis allowDecimals={false} stroke={theme.colors.gray[7]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke={theme.colors.teal[6]} name="Nº Trabalhos Abertos" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Text c="dimmed">Sem dados para o ano {selectedYear}.</Text>}
          </Card>
        </Grid.Col>
      </Grid>

      {/* Top 10 FO per Designer */}
      <Stack>
        <Title order={3} mt="xl" mb="md">Top 10 FO por Designer ({periodString})</Title>
        {designers.map(designer => {
          const topList = metrics.top10FoPerDesigner[designer.id];
          if (!topList || topList.length === 0) {
            return (
              <Paper key={designer.id} p="md" shadow="xs" withBorder>
                <Title order={5} mb="xs">{designer.nome}</Title>
                <Text c="dimmed">Sem FOs registadas neste período.</Text>
              </Paper>
            );
          }
          return (
            <Paper key={designer.id} p="md" shadow="xs" withBorder>
              <Title order={5} mb="md">{designer.nome}</Title>
              <Table striped highlightOnHover fz="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Rank</Table.Th>
                    <Table.Th>FO</Table.Th>
                    <Table.Th>Item</Table.Th>
                    <Table.Th style={{ textAlign: 'right' }}>Dias</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {topList.map((fo, index) => (
                    <Table.Tr key={`${fo.numero_fo}-${index}`}>
                      <Table.Td>{index + 1}</Table.Td>
                      <Table.Td>{fo.numero_fo}</Table.Td>
                      <Table.Td>{fo.item}</Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>{fo.daysTaken !== null ? fo.daysTaken : '-'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          );
        })}
      </Stack>
    </Container>
  );
  // --- End Render Logic ---
};

export default MetricsPage;