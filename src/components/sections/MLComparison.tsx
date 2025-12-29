import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, CheckCircle2, Award, BarChart3 } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { simulateMLClassification } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';

const CLASS_COLORS = {
  A: '#FF6B6B',
  B: '#FFD93D',
  C: '#6BCF7F',
};

const ML_MODELS = [
  { id: 'rf', name: 'Random Forest', default: true },
  { id: 'xgb', name: 'XGBoost', default: false },
  { id: 'svm', name: 'SVM', default: false },
  { id: 'knn', name: 'KNN', default: false },
  { id: 'lr', name: 'Logistic Regression', default: false },
];

export function MLComparison() {
  const { processedData, setProcessedData, mlMetrics, setMLMetrics } = useAnalysisStore();

  const [selectedModels, setSelectedModels] = useState<string[]>(['rf']);
  const [testSize, setTestSize] = useState(30);
  const [isTraining, setIsTraining] = useState(false);

  const runMLClassification = async () => {
    if (processedData.length === 0 || !processedData[0].Class) return;

    setIsTraining(true);
    await new Promise((r) => setTimeout(r, 1000));

    const { predictions, metrics } = simulateMLClassification(processedData);
    setProcessedData(predictions);
    setMLMetrics(metrics);

    setIsTraining(false);
  };

  // Prepare chart data
  const featureImportanceData = mlMetrics
    ? Object.entries(mlMetrics.featureImportance)
        .map(([name, value]) => ({
          name: name.replace('_Score', '').replace('_', ' '),
          value: value * 100,
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const metricsRadarData = mlMetrics
    ? [
        {
          metric: 'Accuracy',
          value: mlMetrics.accuracy * 100,
        },
        {
          metric: 'Precision A',
          value: mlMetrics.precision.A * 100,
        },
        {
          metric: 'Recall A',
          value: mlMetrics.recall.A * 100,
        },
        {
          metric: 'F1 A',
          value: mlMetrics.f1Score.A * 100,
        },
        {
          metric: 'Precision B',
          value: mlMetrics.precision.B * 100,
        },
        {
          metric: 'Recall C',
          value: mlMetrics.recall.C * 100,
        },
      ]
    : [];

  // Comparison table data
  const comparisonSummary = processedData.reduce(
    (acc, item) => {
      acc.total++;
      if (item.Class === item.ML_Predicted_Class) acc.match++;
      if (item.Class === item.Fuzzy_Class) acc.fuzzyMatch++;
      return acc;
    },
    { total: 0, match: 0, fuzzyMatch: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Machine Learning & Comparaison</h1>
          <p className="text-muted-foreground">
            Classification ML et analyse comparative des méthodes
          </p>
        </div>
      </div>

      {/* ML Configuration */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Model Selection */}
        <div className="glass-panel p-6">
          <h3 className="font-semibold mb-4">Sélection des Modèles</h3>
          <div className="space-y-3">
            {ML_MODELS.map((model) => (
              <div key={model.id} className="flex items-center gap-3">
                <Checkbox
                  id={model.id}
                  checked={selectedModels.includes(model.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedModels([...selectedModels, model.id]);
                    } else {
                      setSelectedModels(selectedModels.filter((m) => m !== model.id));
                    }
                  }}
                />
                <label htmlFor={model.id} className="text-sm cursor-pointer">
                  {model.name}
                </label>
                {model.default && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                    Recommandé
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Configuration */}
        <div className="glass-panel p-6">
          <h3 className="font-semibold mb-4">Configuration</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Test Size</span>
                <span className="font-mono">{testSize}%</span>
              </div>
              <Slider
                value={[testSize]}
                onValueChange={([v]) => setTestSize(v)}
                min={20}
                max={40}
                step={5}
              />
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-sm">
              <p className="text-muted-foreground">
                Train: {processedData.length > 0 ? Math.round(processedData.length * (1 - testSize / 100)) : 0} articles
              </p>
              <p className="text-muted-foreground">
                Test: {processedData.length > 0 ? Math.round(processedData.length * (testSize / 100)) : 0} articles
              </p>
            </div>
          </div>
        </div>

        {/* Run Button */}
        <div className="glass-panel p-6 flex flex-col justify-center">
          <Button
            size="lg"
            className="w-full"
            onClick={runMLClassification}
            disabled={
              isTraining ||
              selectedModels.length === 0 ||
              processedData.length === 0 ||
              !processedData[0].Class
            }
          >
            {isTraining ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Entraînement...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Lancer l'entraînement ML
              </>
            )}
          </Button>
          {!processedData[0]?.Class && (
            <p className="text-sm text-muted-foreground text-center mt-3">
              Lancez d'abord TOPSIS classique
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      {mlMetrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card border-l-4 border-l-primary">
              <span className="stat-value text-primary">
                {(mlMetrics.accuracy * 100).toFixed(1)}%
              </span>
              <span className="stat-label">Accuracy</span>
            </div>
            <div className="stat-card border-l-4 border-l-class-a">
              <span className="stat-value text-class-a">
                {(mlMetrics.precision.A * 100).toFixed(1)}%
              </span>
              <span className="stat-label">Precision (A)</span>
            </div>
            <div className="stat-card border-l-4 border-l-class-b">
              <span className="stat-value text-class-b">
                {(mlMetrics.recall.B * 100).toFixed(1)}%
              </span>
              <span className="stat-label">Recall (B)</span>
            </div>
            <div className="stat-card border-l-4 border-l-class-c">
              <span className="stat-value text-class-c">
                {(mlMetrics.f1Score.C * 100).toFixed(1)}%
              </span>
              <span className="stat-label">F1-Score (C)</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Confusion Matrix */}
            <div className="glass-panel p-6">
              <h4 className="font-semibold mb-4">Matrice de Confusion</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 text-left">Réel / Prédit</th>
                      <th className="p-2 text-center text-class-a">A</th>
                      <th className="p-2 text-center text-class-b">B</th>
                      <th className="p-2 text-center text-class-c">C</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['A', 'B', 'C'].map((actual, i) => (
                      <tr key={actual}>
                        <td className={`p-2 font-medium text-class-${actual.toLowerCase()}`}>
                          Classe {actual}
                        </td>
                        {mlMetrics.confusionMatrix[i].map((val, j) => {
                          const isMatch = i === j;
                          const total = mlMetrics.confusionMatrix[i].reduce((a, b) => a + b, 0);
                          const percent = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
                          return (
                            <td
                              key={j}
                              className={`p-2 text-center font-mono ${
                                isMatch
                                  ? 'bg-primary/20 font-bold text-lg'
                                  : val > 0
                                  ? 'bg-destructive/10'
                                  : ''
                              }`}
                            >
                              {val}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({percent}%)
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Feature Importance */}
            <div className="glass-panel p-6">
              <h4 className="font-semibold mb-4">Importance des Features</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={featureImportanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    domain={[0, 30]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <RechartsTooltip
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Global Comparison Dashboard */}
          <div className="glass-panel p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Tableau de Bord Comparatif
            </h3>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Method Cards */}
              <div className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold">TOPSIS Classique</h4>
                  </div>
                  <p className="text-2xl font-bold">{comparisonSummary.total} articles</p>
                  <p className="text-sm text-muted-foreground">Classification de référence</p>
                </div>

                <div className="p-4 bg-chart-2/10 rounded-lg border border-chart-2/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-chart-2" />
                    <h4 className="font-semibold">Fuzzy TOPSIS</h4>
                  </div>
                  <p className="text-2xl font-bold">
                    {comparisonSummary.total > 0
                      ? ((comparisonSummary.fuzzyMatch / comparisonSummary.total) * 100).toFixed(1)
                      : 0}
                    %
                  </p>
                  <p className="text-sm text-muted-foreground">Concordance avec Crisp</p>
                </div>

                <div className="p-4 bg-chart-5/10 rounded-lg border border-chart-5/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-chart-5" />
                    <h4 className="font-semibold">Random Forest</h4>
                  </div>
                  <p className="text-2xl font-bold">
                    {(mlMetrics.accuracy * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Accuracy globale</p>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={metricsRadarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <Radar
                      name="Performance"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Classification Report */}
          <div className="glass-panel p-6">
            <h4 className="font-semibold mb-4">Rapport de Classification</h4>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Classe</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1-Score</th>
                    <th>Support</th>
                  </tr>
                </thead>
                <tbody>
                  {['A', 'B', 'C'].map((cls, idx) => (
                    <tr key={cls}>
                      <td>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold bg-class-${cls.toLowerCase()}/20 text-class-${cls.toLowerCase()}`}
                        >
                          Classe {cls}
                        </span>
                      </td>
                      <td className="font-mono">
                        {(mlMetrics.precision[cls] * 100).toFixed(1)}%
                      </td>
                      <td className="font-mono">
                        {(mlMetrics.recall[cls] * 100).toFixed(1)}%
                      </td>
                      <td className="font-mono">
                        {(mlMetrics.f1Score[cls] * 100).toFixed(1)}%
                      </td>
                      <td className="font-mono">
                        {mlMetrics.confusionMatrix[idx].reduce((a, b) => a + b, 0)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-semibold bg-muted/30">
                    <td>Moyenne</td>
                    <td className="font-mono">
                      {(
                        (Object.values(mlMetrics.precision).reduce((a, b) => a + b, 0) / 3) *
                        100
                      ).toFixed(1)}
                      %
                    </td>
                    <td className="font-mono">
                      {(
                        (Object.values(mlMetrics.recall).reduce((a, b) => a + b, 0) / 3) *
                        100
                      ).toFixed(1)}
                      %
                    </td>
                    <td className="font-mono">
                      {(
                        (Object.values(mlMetrics.f1Score).reduce((a, b) => a + b, 0) / 3) *
                        100
                      ).toFixed(1)}
                      %
                    </td>
                    <td className="font-mono">{processedData.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
