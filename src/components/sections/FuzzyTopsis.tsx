import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, ChevronDown, HelpCircle, Triangle } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { calculateFuzzyTOPSIS, classifyABC } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ScatterChart,
  Scatter,
  Legend,
  ZAxis,
  AreaChart,
  Area,
} from 'recharts';

const CLASS_COLORS = {
  A: '#FF6B6B',
  B: '#FFD93D',
  C: '#6BCF7F',
};

export function FuzzyTopsis() {
  const {
    rawData,
    processedData,
    setProcessedData,
    fuzzyTFN,
    setFuzzyTFN,
    abcThresholds,
    setActiveSection,
  } = useAnalysisStore();

  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<string>('Risk');
  const [localTFN, setLocalTFN] = useState(fuzzyTFN);

  // Generate triangle points for visualization
  const generateTriangleData = (tfn: [number, number, number]) => {
    const [l, m, u] = tfn;
    return [
      { x: l, y: 0 },
      { x: m, y: 1 },
      { x: u, y: 0 },
    ];
  };

  // Get all TFN data for selected variable
  const getTFNChartData = () => {
    const variable = selectedVariable as keyof typeof localTFN;
    const entries = Object.entries(localTFN[variable]);
    
    return entries.flatMap(([label, tfn], idx) => {
      const color = ['#4ECDC4', '#FF6B6B', '#FFD93D', '#6BCF7F', '#A78BFA'][idx % 5];
      return {
        label,
        color,
        data: generateTriangleData(tfn),
        tfn,
      };
    });
  };

  const handleTFNChange = (
    variable: string,
    label: string,
    position: 'l' | 'm' | 'u',
    value: number
  ) => {
    setLocalTFN((prev) => {
      const current = prev[variable as keyof typeof prev][label] as [number, number, number];
      const newTFN: [number, number, number] = [...current];
      const posIdx = position === 'l' ? 0 : position === 'm' ? 1 : 2;
      newTFN[posIdx] = value;
      
      return {
        ...prev,
        [variable]: {
          ...prev[variable as keyof typeof prev],
          [label]: newTFN,
        },
      };
    });
  };

  const saveTFN = () => {
    setFuzzyTFN(localTFN);
  };

  // Run Fuzzy TOPSIS
  const runFuzzyTOPSIS = async () => {
    if (processedData.length === 0) return;
    
    setIsCalculating(true);
    await new Promise((r) => setTimeout(r, 500));

    const fuzzyResults = calculateFuzzyTOPSIS(processedData, localTFN);
    const classified = classifyABC(fuzzyResults, abcThresholds, 'Fuzzy_TOPSIS_Score');
    setProcessedData(classified);

    setIsCalculating(false);
  };

  // Comparison data
  const comparisonData = processedData
    .filter((item) => item.TOPSIS_Score !== undefined && item.Fuzzy_TOPSIS_Score !== undefined)
    .map((item) => ({
      id: item.id,
      crisp: (item.TOPSIS_Score ?? 0) * 100,
      fuzzy: (item.Fuzzy_TOPSIS_Score ?? 0) * 100,
      crispClass: item.Class,
      fuzzyClass: item.Fuzzy_Class,
    }));

  // Class change matrix
  const classChangeMatrix = {
    'A→A': 0, 'A→B': 0, 'A→C': 0,
    'B→A': 0, 'B→B': 0, 'B→C': 0,
    'C→A': 0, 'C→B': 0, 'C→C': 0,
  };

  comparisonData.forEach((item) => {
    if (item.crispClass && item.fuzzyClass) {
      const key = `${item.crispClass}→${item.fuzzyClass}` as keyof typeof classChangeMatrix;
      classChangeMatrix[key]++;
    }
  });

  const tfnChartData = getTFNChartData();
  const variables = Object.keys(localTFN);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fuzzy TOPSIS</h1>
          <p className="text-muted-foreground">
            Analyse avec Nombres Flous Triangulaires (TFN)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runFuzzyTOPSIS}
            disabled={isCalculating || processedData.length === 0}
          >
            {isCalculating ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Calcul...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Lancer Fuzzy TOPSIS
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => setActiveSection(4)}>
            ML & Comparaison
            <ChevronDown className="w-4 h-4 ml-2 rotate-[-90deg]" />
          </Button>
        </div>
      </div>

      {/* TFN Configuration */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* TFN Editor */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <Triangle className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Fonctions d'Appartenance (TFN)</h3>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Un TFN (l, m, u) représente une valeur floue avec l=minimum, m=modal, u=maximum
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Variable Selector */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {variables.map((v) => (
              <Button
                key={v}
                variant={selectedVariable === v ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedVariable(v)}
              >
                {v}
              </Button>
            ))}
          </div>

          {/* TFN Sliders */}
          <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin pr-2">
            {Object.entries(localTFN[selectedVariable as keyof typeof localTFN]).map(
              ([label, tfn]) => (
                <div key={label} className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">{label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      ({tfn[0].toFixed(2)}, {tfn[1].toFixed(2)}, {tfn[2].toFixed(2)})
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground">Lower</span>
                      <Slider
                        value={[tfn[0] * 100]}
                        onValueChange={([v]) =>
                          handleTFNChange(selectedVariable, label, 'l', v / 100)
                        }
                        max={100}
                        min={0}
                        step={5}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Modal</span>
                      <Slider
                        value={[tfn[1] * 100]}
                        onValueChange={([v]) =>
                          handleTFNChange(selectedVariable, label, 'm', v / 100)
                        }
                        max={100}
                        min={0}
                        step={5}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Upper</span>
                      <Slider
                        value={[tfn[2] * 100]}
                        onValueChange={([v]) =>
                          handleTFNChange(selectedVariable, label, 'u', v / 100)
                        }
                        max={100}
                        min={0}
                        step={5}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          <Button className="w-full mt-4" variant="outline" onClick={saveTFN}>
            Sauvegarder les TFN
          </Button>
        </div>

        {/* TFN Visualization */}
        <div className="glass-panel p-6">
          <h3 className="font-semibold mb-4">Visualisation - {selectedVariable}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                domain={[0, 1]}
                tickFormatter={(v) => v.toFixed(1)}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                domain={[0, 1]}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              {tfnChartData.map((item, idx) => (
                <Area
                  key={item.label}
                  type="linear"
                  data={item.data}
                  dataKey="y"
                  stroke={item.color}
                  fill={item.color}
                  fillOpacity={0.2}
                  name={item.label}
                />
              ))}
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
          <div className="formula-box mt-4">
            <p className="text-xs text-muted-foreground mb-1">Méthode Vertex (Distance floue)</p>
            <p>d² = 1/3 × [(l₁-l₂)² + (m₁-m₂)² + (u₁-u₂)²]</p>
          </div>
        </div>
      </div>

      {/* Comparison Section */}
      {comparisonData.length > 0 && comparisonData[0].fuzzy > 0 && (
        <div className="space-y-6">
          <h2 className="section-header">
            <span className="step-indicator">2</span>
            Comparaison Crisp vs Fuzzy
          </h2>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Scatter Comparison */}
            <div className="glass-panel p-6">
              <h4 className="font-semibold mb-4">Score Crisp vs Fuzzy</h4>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    dataKey="crisp"
                    name="TOPSIS Classique"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'TOPSIS Classique (%)', position: 'bottom', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="fuzzy"
                    name="Fuzzy TOPSIS"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Fuzzy TOPSIS (%)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ZAxis range={[30, 30]} />
                  <RechartsTooltip
                    content={({ payload }) => {
                      if (!payload || !payload[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="glass-panel p-2 text-sm">
                          <p>Article #{data.id}</p>
                          <p>Crisp: {data.crisp.toFixed(1)}%</p>
                          <p>Fuzzy: {data.fuzzy.toFixed(1)}%</p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={comparisonData} fill="hsl(var(--primary))" />
                  {/* Diagonal line */}
                  <Line
                    type="linear"
                    dataKey="crisp"
                    data={[{ crisp: 0, fuzzy: 0 }, { crisp: 100, fuzzy: 100 }]}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Class Change Matrix */}
            <div className="glass-panel p-6">
              <h4 className="font-semibold mb-4">Matrice de Changement de Classe</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 text-left">Crisp → Fuzzy</th>
                      <th className="p-2 text-center text-class-a">A</th>
                      <th className="p-2 text-center text-class-b">B</th>
                      <th className="p-2 text-center text-class-c">C</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['A', 'B', 'C'].map((from) => (
                      <tr key={from}>
                        <td className={`p-2 font-medium text-class-${from.toLowerCase()}`}>
                          Classe {from}
                        </td>
                        {['A', 'B', 'C'].map((to) => {
                          const key = `${from}→${to}` as keyof typeof classChangeMatrix;
                          const value = classChangeMatrix[key];
                          const isMatch = from === to;
                          return (
                            <td
                              key={to}
                              className={`p-2 text-center font-mono ${
                                isMatch
                                  ? 'bg-primary/20 font-bold'
                                  : value > 0
                                  ? 'bg-destructive/10 text-destructive'
                                  : ''
                              }`}
                            >
                              {value}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Concordance:</strong>{' '}
                  {(
                    ((classChangeMatrix['A→A'] + classChangeMatrix['B→B'] + classChangeMatrix['C→C']) /
                      comparisonData.length) *
                    100
                  ).toFixed(1)}
                  % des articles gardent la même classe
                </p>
              </div>
            </div>
          </div>

          {/* Top Changes */}
          <div className="glass-panel p-6">
            <h4 className="font-semibold mb-4">Articles avec Changement de Classe</h4>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Score TOPSIS</th>
                    <th>Score Fuzzy</th>
                    <th>Écart</th>
                    <th>Classe Crisp</th>
                    <th>Classe Fuzzy</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData
                    .filter((d) => d.crispClass !== d.fuzzyClass)
                    .slice(0, 10)
                    .map((item) => (
                      <tr key={item.id}>
                        <td className="font-mono">{item.id}</td>
                        <td className="font-mono">{item.crisp.toFixed(1)}%</td>
                        <td className="font-mono">{item.fuzzy.toFixed(1)}%</td>
                        <td
                          className={`font-mono ${
                            item.fuzzy > item.crisp ? 'text-class-c' : 'text-class-a'
                          }`}
                        >
                          {item.fuzzy > item.crisp ? '+' : ''}
                          {(item.fuzzy - item.crisp).toFixed(1)}%
                        </td>
                        <td>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold bg-class-${item.crispClass?.toLowerCase()}/20 text-class-${item.crispClass?.toLowerCase()}`}
                          >
                            {item.crispClass}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold bg-class-${item.fuzzyClass?.toLowerCase()}/20 text-class-${item.fuzzyClass?.toLowerCase()}`}
                          >
                            {item.fuzzyClass}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
