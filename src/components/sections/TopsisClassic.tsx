import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, ChevronDown, Star, XCircle, HelpCircle } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import {
  applyMappings,
  calculateAggregations,
  calculateEntropyWeights,
  calculateTOPSIS,
  classifyABC,
} from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  Legend,
  ZAxis,
} from 'recharts';

const CLASS_COLORS = {
  A: '#FF6B6B',
  B: '#FFD93D',
  C: '#6BCF7F',
};

export function TopsisClassic() {
  const {
    rawData,
    mappingTables,
    aggregationWeights,
    abcThresholds,
    setAbcThresholds,
    entropyWeights,
    setEntropyWeights,
    processedData,
    setProcessedData,
    setActiveSection,
  } = useAnalysisStore();

  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationStep, setCalculationStep] = useState(0);

  // Run TOPSIS calculation
  const runTOPSIS = async () => {
    setIsCalculating(true);
    setCalculationStep(1);

    await new Promise((r) => setTimeout(r, 300));

    // Step 1: Apply mappings
    const mapped = applyMappings(rawData, mappingTables);
    setCalculationStep(2);
    await new Promise((r) => setTimeout(r, 300));

    // Step 2: Calculate aggregations
    const aggregated = calculateAggregations(mapped, aggregationWeights);
    setCalculationStep(3);
    await new Promise((r) => setTimeout(r, 300));

    // Step 3: Calculate entropy weights
    const weights = calculateEntropyWeights(aggregated);
    setEntropyWeights(weights);
    setCalculationStep(4);
    await new Promise((r) => setTimeout(r, 300));

    // Step 4: Calculate TOPSIS scores
    const topsisResults = calculateTOPSIS(aggregated, weights);
    setCalculationStep(5);
    await new Promise((r) => setTimeout(r, 300));

    // Step 5: Classify ABC
    const classified = classifyABC(topsisResults, abcThresholds, 'TOPSIS_Score');
    setProcessedData(classified);

    setIsCalculating(false);
    setCalculationStep(6);
  };

  // Re-classify when thresholds change
  useEffect(() => {
    if (processedData.length > 0 && processedData[0].TOPSIS_Score !== undefined) {
      const reclassified = classifyABC(processedData, abcThresholds, 'TOPSIS_Score');
      setProcessedData(reclassified);
    }
  }, [abcThresholds]);

  // Prepare chart data
  const weightsChartData = entropyWeights
    ? Object.entries(entropyWeights).map(([name, value]) => ({
        name: name.replace('_Agg', '').replace('_Score', ''),
        value: value * 100,
      }))
    : [];

  const classDistribution = processedData.reduce(
    (acc, item) => {
      if (item.Class) acc[item.Class]++;
      return acc;
    },
    { A: 0, B: 0, C: 0 }
  );

  const pieData = [
    { name: 'Classe A', value: classDistribution.A, color: CLASS_COLORS.A },
    { name: 'Classe B', value: classDistribution.B, color: CLASS_COLORS.B },
    { name: 'Classe C', value: classDistribution.C, color: CLASS_COLORS.C },
  ];

  const scatterData = processedData.map((item) => ({
    x: item.TOPSIS_Score ?? 0,
    y: item['Unit cost'],
    class: item.Class,
    id: item.id,
  }));

  // Top 10 items
  const top10 = [...processedData]
    .sort((a, b) => (b.TOPSIS_Score ?? 0) - (a.TOPSIS_Score ?? 0))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">TOPSIS Classique</h1>
          <p className="text-muted-foreground">
            Méthode de l'Entropie + TOPSIS + Classification ABC
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runTOPSIS}
            disabled={isCalculating || rawData.length === 0}
          >
            {isCalculating ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Calcul en cours...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                {processedData.length > 0 && processedData[0].TOPSIS_Score
                  ? 'Recalculer'
                  : 'Lancer TOPSIS'}
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => setActiveSection(3)}>
            Fuzzy TOPSIS
            <ChevronDown className="w-4 h-4 ml-2 rotate-[-90deg]" />
          </Button>
        </div>
      </div>

      {/* Calculation Steps Accordion */}
      <Accordion type="single" collapsible defaultValue="entropy">
        {/* Entropy Weights */}
        <AccordionItem value="entropy">
          <AccordionTrigger className="glass-panel px-4">
            <div className="flex items-center gap-3">
              <span className="step-indicator">1</span>
              <span>Poids par Méthode Entropie</span>
              {entropyWeights && (
                <span className="ml-auto text-sm text-primary">Calculé ✓</span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Formulas */}
              <div className="space-y-4">
                <div className="formula-box">
                  <p className="text-xs text-muted-foreground mb-2">Étape 1: Proportion</p>
                  <p>P<sub>ij</sub> = x<sub>ij</sub> / Σx<sub>ij</sub></p>
                </div>
                <div className="formula-box">
                  <p className="text-xs text-muted-foreground mb-2">Étape 2: Entropie</p>
                  <p>E<sub>j</sub> = -k × Σ(P<sub>ij</sub> × ln(P<sub>ij</sub>))</p>
                  <p className="text-xs mt-1">où k = 1/ln(n) = 1/ln({rawData.length})</p>
                </div>
                <div className="formula-box">
                  <p className="text-xs text-muted-foreground mb-2">Étape 3: Diversité</p>
                  <p>D<sub>j</sub> = 1 - E<sub>j</sub></p>
                </div>
                <div className="formula-box">
                  <p className="text-xs text-muted-foreground mb-2">Étape 4: Poids</p>
                  <p>W<sub>j</sub> = D<sub>j</sub> / ΣD<sub>j</sub></p>
                </div>
              </div>

              {/* Weights Chart */}
              <div className="glass-panel p-4">
                <h4 className="font-semibold mb-4">Poids Finaux</h4>
                {weightsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weightsChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        domain={[0, 50]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={80}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <RechartsTooltip
                        formatter={(value: number) => `${value.toFixed(2)}%`}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Lancez le calcul TOPSIS pour voir les poids
                  </div>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* TOPSIS Solution */}
        <AccordionItem value="topsis">
          <AccordionTrigger className="glass-panel px-4">
            <div className="flex items-center gap-3">
              <span className="step-indicator">2</span>
              <span>Solutions Idéales & Scores TOPSIS</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="glass-panel p-4 border-l-4 border-l-primary">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">FPIS (Solution Idéale Positive)</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Maximum pour critères bénéfiques (Criticality, Demand, Size)
                  <br />
                  Minimum pour critères de coût (Supply, Unit cost)
                </p>
              </div>
              <div className="glass-panel p-4 border-l-4 border-l-destructive">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <h4 className="font-semibold">FNIS (Solution Idéale Négative)</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Minimum pour critères bénéfiques
                  <br />
                  Maximum pour critères de coût
                </p>
              </div>
            </div>

            <div className="formula-box mb-6">
              <p className="text-xs text-muted-foreground mb-2">Score de Proximité Relative</p>
              <p>CC<sub>i</sub> = d<sup>-</sup><sub>i</sub> / (d<sup>+</sup><sub>i</sub> + d<sup>-</sup><sub>i</sub>)</p>
              <p className="text-xs mt-1 text-muted-foreground">
                Plus le score est élevé, plus l'article est prioritaire (Classe A)
              </p>
            </div>

            {/* Top 10 Table */}
            {top10.length > 0 && (
              <div className="glass-panel p-4">
                <h4 className="font-semibold mb-4">Top 10 Articles</h4>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Rang</th>
                        <th>ID</th>
                        <th>Score TOPSIS</th>
                        <th>Classe</th>
                        <th>Risk</th>
                        <th>Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top10.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="font-mono">{idx + 1}</td>
                          <td className="font-mono">{item.id}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 progress-bar">
                                <div
                                  className="progress-bar-fill"
                                  style={{
                                    width: `${(item.TOPSIS_Score ?? 0) * 100}%`,
                                    backgroundColor:
                                      CLASS_COLORS[item.Class as keyof typeof CLASS_COLORS] ||
                                      'hsl(var(--primary))',
                                  }}
                                />
                              </div>
                              <span className="font-mono text-sm w-16">
                                {((item.TOPSIS_Score ?? 0) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                item.Class === 'A'
                                  ? 'bg-class-a/20 text-class-a'
                                  : item.Class === 'B'
                                  ? 'bg-class-b/20 text-class-b'
                                  : 'bg-class-c/20 text-class-c'
                              }`}
                            >
                              {item.Class}
                            </span>
                          </td>
                          <td>{item.Risk}</td>
                          <td className="font-mono">{item['Unit cost'].toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ABC Classification */}
      {processedData.length > 0 && processedData[0].Class && (
        <div className="space-y-6">
          <h2 className="section-header">
            <span className="step-indicator">3</span>
            Classification ABC
          </h2>

          {/* Threshold Sliders */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <h4 className="font-semibold">Seuils de Classification</h4>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  Ajustez les pourcentages pour définir les frontières des classes A, B, C
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-class-a font-medium">Classe A (Top)</span>
                  <span className="font-mono">{abcThresholds.A}%</span>
                </div>
                <Slider
                  value={[abcThresholds.A]}
                  onValueChange={([v]) =>
                    setAbcThresholds({
                      ...abcThresholds,
                      A: v,
                      C: 100 - v - abcThresholds.B,
                    })
                  }
                  max={50}
                  min={5}
                  step={5}
                  className="[&_[role=slider]]:bg-class-a"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-class-b font-medium">Classe B (Mid)</span>
                  <span className="font-mono">{abcThresholds.B}%</span>
                </div>
                <Slider
                  value={[abcThresholds.B]}
                  onValueChange={([v]) =>
                    setAbcThresholds({
                      ...abcThresholds,
                      B: v,
                      C: 100 - abcThresholds.A - v,
                    })
                  }
                  max={50}
                  min={10}
                  step={5}
                  className="[&_[role=slider]]:bg-class-b"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-class-c font-medium">Classe C (Rest)</span>
                  <span className="font-mono">{abcThresholds.C}%</span>
                </div>
                <Slider value={[abcThresholds.C]} disabled className="opacity-50" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="glass-panel p-6">
              <h4 className="font-semibold mb-4">Répartition des Classes</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [
                      `${value} articles`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm">
                      {entry.name}: {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scatter Plot */}
            <div className="glass-panel p-6">
              <h4 className="font-semibold mb-4">Score TOPSIS vs Coût Unitaire</h4>
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Score TOPSIS"
                    tickFormatter={(v) => (v * 100).toFixed(0) + '%'}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Unit Cost"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ZAxis range={[40, 40]} />
                  <RechartsTooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload || !payload[0]) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="glass-panel p-2 text-sm">
                          <p>Article #{data.id}</p>
                          <p>Score: {(data.x * 100).toFixed(1)}%</p>
                          <p>Cost: {data.y.toFixed(2)}</p>
                          <p>Classe: {data.class}</p>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Scatter
                    name="Classe A"
                    data={scatterData.filter((d) => d.class === 'A')}
                    fill={CLASS_COLORS.A}
                  />
                  <Scatter
                    name="Classe B"
                    data={scatterData.filter((d) => d.class === 'B')}
                    fill={CLASS_COLORS.B}
                  />
                  <Scatter
                    name="Classe C"
                    data={scatterData.filter((d) => d.class === 'C')}
                    fill={CLASS_COLORS.C}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
