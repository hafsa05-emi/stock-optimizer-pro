import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface InventoryItem {
  id: number;
  Risk: string;
  'Demand fluctuation': string;
  'Average stock': number;
  'Daily usage': number;
  'Unit cost': number;
  'Lead time': number;
  'Consignment stock': string;
  'Unit size': string;
  // Computed values
  Risk_Score?: number;
  Fluctuation_Score?: number;
  Consignment_Score?: number;
  Size_Score?: number;
  Criticality_Agg?: number;
  Demand_Agg?: number;
  Supply_Agg?: number;
  TOPSIS_Score?: number;
  Fuzzy_TOPSIS_Score?: number;
  ML_Predicted_Class?: string;
  Class?: 'A' | 'B' | 'C';
  Fuzzy_Class?: 'A' | 'B' | 'C';
}

export interface MappingTable {
  Risk: Record<string, number>;
  'Demand fluctuation': Record<string, number>;
  'Consignment stock': Record<string, number>;
  'Unit size': Record<string, number>;
}

export interface AggregationWeights {
  Criticality: { Risk: number; Fluctuation: number };
  Demand: { DailyUsage: number; AverageStock: number };
  Supply: { LeadTime: number; Consignment: number };
}

export interface FuzzyTFN {
  Risk: Record<string, [number, number, number]>;
  'Demand fluctuation': Record<string, [number, number, number]>;
  'Consignment stock': Record<string, [number, number, number]>;
  'Unit size': Record<string, [number, number, number]>;
}

export interface EntropyWeights {
  Criticality_Agg: number;
  Demand_Agg: number;
  Supply_Agg: number;
  'Unit cost': number;
  Size_Score: number;
}

export interface MLMetrics {
  accuracy: number;
  precision: Record<string, number>;
  recall: Record<string, number>;
  f1Score: Record<string, number>;
  confusionMatrix: number[][];
  featureImportance: Record<string, number>;
}

export interface AnalysisState {
  // Navigation
  activeSection: number;
  setActiveSection: (section: number) => void;

  // Data
  rawData: InventoryItem[];
  setRawData: (data: InventoryItem[]) => void;
  processedData: InventoryItem[];
  setProcessedData: (data: InventoryItem[]) => void;

  // Mapping tables
  mappingTables: MappingTable;
  setMappingTables: (tables: MappingTable) => void;

  // Aggregation weights
  aggregationWeights: AggregationWeights;
  setAggregationWeights: (weights: AggregationWeights) => void;

  // Fuzzy TFN
  fuzzyTFN: FuzzyTFN;
  setFuzzyTFN: (tfn: FuzzyTFN) => void;

  // Entropy weights
  entropyWeights: EntropyWeights | null;
  setEntropyWeights: (weights: EntropyWeights) => void;

  // ABC thresholds
  abcThresholds: { A: number; B: number; C: number };
  setAbcThresholds: (thresholds: { A: number; B: number; C: number }) => void;

  // ML metrics
  mlMetrics: MLMetrics | null;
  setMLMetrics: (metrics: MLMetrics) => void;

  // Analysis status
  isDataLoaded: boolean;
  isTopsisCalculated: boolean;
  isFuzzyCalculated: boolean;
  isMLCalculated: boolean;

  // Reset
  resetAnalysis: () => void;
}

const defaultMappingTables: MappingTable = {
  Risk: { High: 0.47, Normal: 0.35, Low: 0.18 },
  'Demand fluctuation': { Increasing: 0.36, Stable: 0.28, Unknown: 0.20, Decreasing: 0.16, Ending: 0.00 },
  'Consignment stock': { No: 0.80, Yes: 0.20 },
  'Unit size': { Large: 0.53, Medium: 0.31, Small: 0.13 },
};

const defaultAggregationWeights: AggregationWeights = {
  Criticality: { Risk: 0.78, Fluctuation: 0.22 },
  Demand: { DailyUsage: 0.71, AverageStock: 0.29 },
  Supply: { LeadTime: 0.75, Consignment: 0.25 },
};

const defaultFuzzyTFN: FuzzyTFN = {
  Risk: {
    High: [0.7, 0.9, 1.0],
    Normal: [0.3, 0.5, 0.7],
    Low: [0.0, 0.1, 0.3],
  },
  'Demand fluctuation': {
    Increasing: [0.7, 0.9, 1.0],
    Stable: [0.4, 0.6, 0.8],
    Unknown: [0.2, 0.4, 0.6],
    Decreasing: [0.1, 0.2, 0.4],
    Ending: [0.0, 0.0, 0.1],
  },
  'Consignment stock': {
    No: [0.6, 0.8, 1.0],
    Yes: [0.0, 0.2, 0.4],
  },
  'Unit size': {
    Large: [0.6, 0.8, 1.0],
    Medium: [0.3, 0.5, 0.7],
    Small: [0.0, 0.2, 0.4],
  },
};

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set) => ({
      activeSection: 0,
      setActiveSection: (section) => set({ activeSection: section }),

      rawData: [],
      setRawData: (data) => set({ rawData: data, isDataLoaded: data.length > 0 }),
      processedData: [],
      setProcessedData: (data) => set({ processedData: data }),

      mappingTables: defaultMappingTables,
      setMappingTables: (tables) => set({ mappingTables: tables }),

      aggregationWeights: defaultAggregationWeights,
      setAggregationWeights: (weights) => set({ aggregationWeights: weights }),

      fuzzyTFN: defaultFuzzyTFN,
      setFuzzyTFN: (tfn) => set({ fuzzyTFN: tfn }),

      entropyWeights: null,
      setEntropyWeights: (weights) => set({ entropyWeights: weights }),

      abcThresholds: { A: 20, B: 30, C: 50 },
      setAbcThresholds: (thresholds) => set({ abcThresholds: thresholds }),

      mlMetrics: null,
      setMLMetrics: (metrics) => set({ mlMetrics: metrics, isMLCalculated: true }),

      isDataLoaded: false,
      isTopsisCalculated: false,
      isFuzzyCalculated: false,
      isMLCalculated: false,

      resetAnalysis: () =>
        set({
          rawData: [],
          processedData: [],
          entropyWeights: null,
          mlMetrics: null,
          isDataLoaded: false,
          isTopsisCalculated: false,
          isFuzzyCalculated: false,
          isMLCalculated: false,
        }),
    }),
    {
      name: 'abc-analysis-storage',
      partialize: (state) => ({
        rawData: state.rawData,
        processedData: state.processedData,
        mappingTables: state.mappingTables,
        aggregationWeights: state.aggregationWeights,
        fuzzyTFN: state.fuzzyTFN,
        abcThresholds: state.abcThresholds,
      }),
    }
  )
);
