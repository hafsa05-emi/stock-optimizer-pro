import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Edit3, Save, RotateCcw, HelpCircle } from 'lucide-react';
import { useAnalysisStore } from '@/store/analysisStore';
import { applyMappings, calculateAggregations } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const CHART_COLORS = ['#4ECDC4', '#FF6B6B', '#FFD93D', '#6BCF7F'];

export function Transformation() {
  const {
    rawData,
    mappingTables,
    setMappingTables,
    aggregationWeights,
    setAggregationWeights,
    setProcessedData,
    setActiveSection,
  } = useAnalysisStore();

  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [localMappings, setLocalMappings] = useState(mappingTables);
  const [localWeights, setLocalWeights] = useState(aggregationWeights);

  // Process data with current mappings
  useEffect(() => {
    if (rawData.length > 0) {
      const mapped = applyMappings(rawData, localMappings);
      const aggregated = calculateAggregations(mapped, localWeights);
      setProcessedData(aggregated);
    }
  }, [rawData, localMappings, localWeights, setProcessedData]);

  const handleMappingChange = (table: string, key: string, value: number) => {
    setLocalMappings((prev) => ({
      ...prev,
      [table]: {
        ...prev[table as keyof typeof prev],
        [key]: Math.max(0, Math.min(1, value)),
      },
    }));
  };

  const saveMappings = () => {
    setMappingTables(localMappings);
    setEditingTable(null);
  };

  const resetMappings = () => {
    setLocalMappings(mappingTables);
    setEditingTable(null);
  };

  const handleWeightChange = (
    criterion: keyof typeof localWeights,
    key: string,
    value: number
  ) => {
    setLocalWeights((prev) => {
      const other = Object.keys(prev[criterion]).find((k) => k !== key);
      return {
        ...prev,
        [criterion]: {
          [key]: value,
          [other!]: 1 - value,
        },
      };
    });
  };

  const saveWeights = () => {
    setAggregationWeights(localWeights);
  };

  // Sample radar data for visualization
  const radarData = rawData.slice(0, 5).map((item, idx) => {
    const mapped = applyMappings([item], localMappings)[0];
    const aggregated = calculateAggregations([mapped], localWeights)[0];
    return {
      name: `Art. ${idx + 1}`,
      Criticality: (aggregated.Criticality_Agg ?? 0) * 100,
      Demand: (aggregated.Demand_Agg ?? 0) * 100,
      Supply: (aggregated.Supply_Agg ?? 0) * 100,
    };
  });

  const mappingTableConfig = [
    { key: 'Risk', title: 'Risque', description: 'Impact sur la criticité' },
    { key: 'Demand fluctuation', title: 'Fluctuation Demande', description: 'Variabilité de la demande' },
    { key: 'Consignment stock', title: 'Stock Consignation', description: 'Capital immobilisé' },
    { key: 'Unit size', title: 'Taille Unitaire', description: 'Complexité logistique' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transformation & Agrégation</h1>
          <p className="text-muted-foreground">
            Configurez les tables de mapping et les poids d'agrégation
          </p>
        </div>
        <Button onClick={() => setActiveSection(2)}>
          Continuer vers TOPSIS
          <ChevronDown className="w-4 h-4 ml-2 rotate-[-90deg]" />
        </Button>
      </div>

      {/* Mapping Tables */}
      <div>
        <h2 className="section-header">
          <span className="step-indicator">1</span>
          Tables de Conversion
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Les valeurs qualitatives sont converties en scores normalisés [0-1] pour le calcul TOPSIS.
            </TooltipContent>
          </Tooltip>
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mappingTableConfig.map(({ key, title, description }) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold">{title}</h4>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    editingTable === key ? saveMappings() : setEditingTable(key)
                  }
                >
                  {editingTable === key ? (
                    <Save className="w-4 h-4" />
                  ) : (
                    <Edit3 className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                {Object.entries(
                  localMappings[key as keyof typeof localMappings]
                ).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-sm truncate flex-1">{label}</span>
                    {editingTable === key ? (
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={value}
                        onChange={(e) =>
                          handleMappingChange(key, label, parseFloat(e.target.value))
                        }
                        className="w-20 h-7 text-sm"
                      />
                    ) : (
                      <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                        {value.toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {editingTable === key && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3"
                  onClick={resetMappings}
                >
                  <RotateCcw className="w-3 h-3 mr-2" />
                  Réinitialiser
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Aggregation Weights */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="section-header">
            <span className="step-indicator">2</span>
            Poids d'Agrégation
          </h2>

          <div className="space-y-6">
            {/* Criticality */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel p-5"
            >
              <h4 className="font-semibold text-class-a mb-4">Criticality</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Risk</span>
                    <span className="font-mono">
                      {(localWeights.Criticality.Risk * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[localWeights.Criticality.Risk * 100]}
                    onValueChange={([v]) =>
                      handleWeightChange('Criticality', 'Risk', v / 100)
                    }
                    max={100}
                    step={1}
                    className="[&_[role=slider]]:bg-class-a"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Fluctuation</span>
                    <span className="font-mono">
                      {(localWeights.Criticality.Fluctuation * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[localWeights.Criticality.Fluctuation * 100]}
                    onValueChange={([v]) =>
                      handleWeightChange('Criticality', 'Fluctuation', v / 100)
                    }
                    max={100}
                    step={1}
                    disabled
                    className="opacity-50"
                  />
                </div>
              </div>
              <div className="formula-box mt-4">
                Criticality = {localWeights.Criticality.Risk.toFixed(2)}×Risk +{' '}
                {localWeights.Criticality.Fluctuation.toFixed(2)}×Fluctuation
              </div>
            </motion.div>

            {/* Demand */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-panel p-5"
            >
              <h4 className="font-semibold text-class-b mb-4">Demand</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Daily Usage</span>
                    <span className="font-mono">
                      {(localWeights.Demand.DailyUsage * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[localWeights.Demand.DailyUsage * 100]}
                    onValueChange={([v]) =>
                      handleWeightChange('Demand', 'DailyUsage', v / 100)
                    }
                    max={100}
                    step={1}
                    className="[&_[role=slider]]:bg-class-b"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Average Stock</span>
                    <span className="font-mono">
                      {(localWeights.Demand.AverageStock * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[localWeights.Demand.AverageStock * 100]}
                    onValueChange={([v]) =>
                      handleWeightChange('Demand', 'AverageStock', v / 100)
                    }
                    max={100}
                    step={1}
                    disabled
                    className="opacity-50"
                  />
                </div>
              </div>
              <div className="formula-box mt-4">
                Demand = {localWeights.Demand.DailyUsage.toFixed(2)}×Usage +{' '}
                {localWeights.Demand.AverageStock.toFixed(2)}×Stock
              </div>
            </motion.div>

            {/* Supply */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel p-5"
            >
              <h4 className="font-semibold text-class-c mb-4">Supply</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Lead Time</span>
                    <span className="font-mono">
                      {(localWeights.Supply.LeadTime * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[localWeights.Supply.LeadTime * 100]}
                    onValueChange={([v]) =>
                      handleWeightChange('Supply', 'LeadTime', v / 100)
                    }
                    max={100}
                    step={1}
                    className="[&_[role=slider]]:bg-class-c"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Consignment</span>
                    <span className="font-mono">
                      {(localWeights.Supply.Consignment * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[localWeights.Supply.Consignment * 100]}
                    onValueChange={([v]) =>
                      handleWeightChange('Supply', 'Consignment', v / 100)
                    }
                    max={100}
                    step={1}
                    disabled
                    className="opacity-50"
                  />
                </div>
              </div>
              <div className="formula-box mt-4">
                Supply = {localWeights.Supply.LeadTime.toFixed(2)}×LeadTime +{' '}
                {localWeights.Supply.Consignment.toFixed(2)}×Consignment
              </div>
            </motion.div>

            <Button onClick={saveWeights} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder les Poids
            </Button>
          </div>
        </div>

        {/* Radar Chart Preview */}
        <div className="glass-panel p-6">
          <h3 className="font-semibold mb-4">Aperçu des Critères Agrégés</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Visualisation des 5 premiers articles
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="name"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <Radar
                name="Criticality"
                dataKey="Criticality"
                stroke="hsl(var(--class-a))"
                fill="hsl(var(--class-a))"
                fillOpacity={0.3}
              />
              <Radar
                name="Demand"
                dataKey="Demand"
                stroke="hsl(var(--class-b))"
                fill="hsl(var(--class-b))"
                fillOpacity={0.3}
              />
              <Radar
                name="Supply"
                dataKey="Supply"
                stroke="hsl(var(--class-c))"
                fill="hsl(var(--class-c))"
                fillOpacity={0.3}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
