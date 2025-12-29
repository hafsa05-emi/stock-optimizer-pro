import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, Check, AlertCircle, Trash2, Search, ChevronDown } from 'lucide-react';
import Papa from 'papaparse';
import { useAnalysisStore, InventoryItem } from '@/store/analysisStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { calculateStats } from '@/lib/calculations';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const REQUIRED_COLUMNS = [
  'Risk',
  'Demand fluctuation',
  'Average stock',
  'Daily usage',
  'Unit cost',
  'Lead time',
  'Consignment stock',
  'Unit size',
];

const QUALITATIVE_COLS = ['Risk', 'Demand fluctuation', 'Consignment stock', 'Unit size'];
const QUANTITATIVE_COLS = ['Average stock', 'Daily usage', 'Unit cost', 'Lead time'];

const CHART_COLORS = ['#4ECDC4', '#FF6B6B', '#FFD93D', '#6BCF7F', '#A78BFA'];

function getQuantValue(item: InventoryItem, col: string): number {
  switch (col) {
    case 'Average stock': return item['Average stock'];
    case 'Daily usage': return item['Daily usage'];
    case 'Unit cost': return item['Unit cost'];
    case 'Lead time': return item['Lead time'];
    default: return 0;
  }
}

function getQualValue(item: InventoryItem, col: string): string {
  switch (col) {
    case 'Risk': return item.Risk;
    case 'Demand fluctuation': return item['Demand fluctuation'];
    case 'Consignment stock': return item['Consignment stock'];
    case 'Unit size': return item['Unit size'];
    default: return '';
  }
}

export function DataImport() {
  const { rawData, setRawData, setActiveSection } = useAnalysisStore();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Seuls les fichiers CSV sont acceptés');
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      complete: (results) => {
        const columns = Object.keys(results.data[0] || {});
        const missingCols = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));

        if (missingCols.length > 0) {
          setError(`Colonnes manquantes : ${missingCols.join(', ')}`);
          return;
        }

        const data: InventoryItem[] = results.data
          .filter((row) => Object.values(row).some((v) => v))
          .map((row, idx) => ({
            id: idx + 1,
            Risk: row.Risk,
            'Demand fluctuation': row['Demand fluctuation'],
            'Average stock': parseFloat(row['Average stock']) || 0,
            'Daily usage': parseFloat(row['Daily usage']) || 0,
            'Unit cost': parseFloat(row['Unit cost']) || 0,
            'Lead time': parseInt(row['Lead time']) || 0,
            'Consignment stock': row['Consignment stock'],
            'Unit size': row['Unit size'],
          }));

        setRawData(data);
        setError(null);
      },
      error: () => setError('Erreur lors du parsing du fichier'),
    });
  }, [setRawData]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // Load demo data
  const loadDemoData = async () => {
    try {
      const response = await fetch('/data/inventory_data.csv');
      const text = await response.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const file = new File([blob], 'inventory_data.csv', { type: 'text/csv' });
      handleFile(file);
    } catch {
      setError('Erreur lors du chargement des données de démonstration');
    }
  };

  // Filter and paginate data
  const filteredData = rawData.filter((item) =>
    Object.values(item).some((v) =>
      String(v).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics
  const quantStats = QUANTITATIVE_COLS.map((col) => ({
    name: col,
    ...calculateStats(rawData.map((d) => getQuantValue(d, col))),
  }));

  // Qualitative distributions
  const getDistribution = (col: string) => {
    const counts: Record<string, number> = {};
    rawData.forEach((d) => {
      const val = getQualValue(d, col);
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  if (rawData.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Importer vos Données</h1>
          <p className="text-muted-foreground">
            Chargez un fichier CSV contenant les données d'inventaire pour commencer l'analyse
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`drag-zone ${isDragging ? 'active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <motion.div
            animate={{ y: isDragging ? -10 : 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Glissez-déposez votre fichier CSV</h3>
            <p className="text-muted-foreground mb-6">ou cliquez pour sélectionner</p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
              id="file-input"
            />
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <label htmlFor="file-input" className="cursor-pointer">
                  <FileSpreadsheet className="w-5 h-5 mr-2" />
                  Choisir un fichier
                </label>
              </Button>
              <Button variant="outline" size="lg" onClick={loadDemoData}>
                Charger données démo
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-destructive">{error}</span>
          </motion.div>
        )}

        {/* Required columns info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 glass-panel p-6"
        >
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-primary" />
            Colonnes Requises (8)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {REQUIRED_COLUMNS.map((col) => (
              <div
                key={col}
                className="px-3 py-2 bg-muted rounded-lg text-sm font-mono flex items-center gap-2"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    QUALITATIVE_COLS.includes(col) ? 'bg-chart-2' : 'bg-chart-1'
                  }`}
                />
                {col}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-chart-2" />
              Qualitative
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-chart-1" />
              Quantitative
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Données Importées</h1>
          <p className="text-muted-foreground">
            {rawData.length} articles chargés • Prêt pour l'analyse
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRawData([]);
              setCurrentPage(1);
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
          <Button size="sm" onClick={() => setActiveSection(1)}>
            Continuer vers Transformation
            <ChevronDown className="w-4 h-4 ml-2 rotate-[-90deg]" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card"
        >
          <span className="stat-value">{rawData.length}</span>
          <span className="stat-label">Articles Total</span>
        </motion.div>
        {quantStats.slice(0, 3).map((stat, idx) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (idx + 1) * 0.1 }}
            className="stat-card"
          >
            <span className="stat-value">{stat.mean.toFixed(2)}</span>
            <span className="stat-label">{stat.name} (Moy.)</span>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Qualitative Distributions */}
        <div className="glass-panel p-6">
          <h3 className="font-semibold mb-4">Distribution des Variables Qualitatives</h3>
          <div className="grid grid-cols-2 gap-4">
            {QUALITATIVE_COLS.slice(0, 2).map((col) => (
              <div key={col}>
                <p className="text-sm text-muted-foreground mb-2 text-center">{col}</p>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={getDistribution(col)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={45}
                      paddingAngle={2}
                    >
                      {getDistribution(col).map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>

        {/* Quantitative Stats */}
        <div className="glass-panel p-6">
          <h3 className="font-semibold mb-4">Statistiques Quantitatives</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={quantStats} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="mean" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Moyenne" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-panel p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
          <h3 className="font-semibold">Tableau des Données</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                {REQUIRED_COLUMNS.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item) => (
                <tr key={item.id}>
                  <td className="font-mono text-muted-foreground">{item.id}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        item.Risk === 'High'
                          ? 'bg-class-a/20 text-class-a'
                          : item.Risk === 'Normal'
                          ? 'bg-class-b/20 text-class-b'
                          : 'bg-class-c/20 text-class-c'
                      }`}
                    >
                      {item.Risk}
                    </span>
                  </td>
                  <td>{item['Demand fluctuation']}</td>
                  <td className="font-mono">{item['Average stock'].toFixed(2)}</td>
                  <td className="font-mono">{item['Daily usage'].toFixed(2)}</td>
                  <td className="font-mono">{item['Unit cost'].toFixed(2)}</td>
                  <td className="font-mono">{item['Lead time']}</td>
                  <td>{item['Consignment stock']}</td>
                  <td>{item['Unit size']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Affichage {(currentPage - 1) * itemsPerPage + 1} -{' '}
            {Math.min(currentPage * itemsPerPage, filteredData.length)} sur {filteredData.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
