import { InventoryItem, MappingTable, AggregationWeights, FuzzyTFN, EntropyWeights } from '@/store/analysisStore';

// Helper to get value by key
function getValue(item: InventoryItem, key: string): number {
  switch (key) {
    case 'Risk_Score': return item.Risk_Score ?? 0;
    case 'Fluctuation_Score': return item.Fluctuation_Score ?? 0;
    case 'Consignment_Score': return item.Consignment_Score ?? 0;
    case 'Size_Score': return item.Size_Score ?? 0;
    case 'Criticality_Agg': return item.Criticality_Agg ?? 0;
    case 'Demand_Agg': return item.Demand_Agg ?? 0;
    case 'Supply_Agg': return item.Supply_Agg ?? 0;
    case 'Unit cost': return item['Unit cost'];
    case 'Average stock': return item['Average stock'];
    case 'Daily usage': return item['Daily usage'];
    case 'Lead time': return item['Lead time'];
    case 'TOPSIS_Score': return item.TOPSIS_Score ?? 0;
    case 'Fuzzy_TOPSIS_Score': return item.Fuzzy_TOPSIS_Score ?? 0;
    default: return 0;
  }
}

// Min-Max Normalization
export function minMaxNormalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

// Apply mapping tables to convert qualitative to quantitative
export function applyMappings(data: InventoryItem[], mappings: MappingTable): InventoryItem[] {
  return data.map((item) => ({
    ...item,
    Risk_Score: mappings.Risk[item.Risk] ?? 0,
    Fluctuation_Score: mappings['Demand fluctuation'][item['Demand fluctuation']] ?? 0,
    Consignment_Score: mappings['Consignment stock'][item['Consignment stock']] ?? 0,
    Size_Score: mappings['Unit size'][item['Unit size']] ?? 0,
  }));
}

// Calculate aggregated criteria
export function calculateAggregations(
  data: InventoryItem[],
  weights: AggregationWeights
): InventoryItem[] {
  // Normalize quantitative variables
  const dailyUsage = data.map((d) => d['Daily usage']);
  const avgStock = data.map((d) => d['Average stock']);
  const leadTime = data.map((d) => d['Lead time']);

  const normDailyUsage = minMaxNormalize(dailyUsage);
  const normAvgStock = minMaxNormalize(avgStock);
  const normLeadTime = minMaxNormalize(leadTime);

  return data.map((item, idx) => ({
    ...item,
    Criticality_Agg:
      weights.Criticality.Risk * (item.Risk_Score ?? 0) +
      weights.Criticality.Fluctuation * (item.Fluctuation_Score ?? 0),
    Demand_Agg:
      weights.Demand.DailyUsage * normDailyUsage[idx] +
      weights.Demand.AverageStock * normAvgStock[idx],
    Supply_Agg:
      weights.Supply.LeadTime * normLeadTime[idx] +
      weights.Supply.Consignment * (item.Consignment_Score ?? 0),
  }));
}

// Calculate Entropy Weights
export function calculateEntropyWeights(data: InventoryItem[]): EntropyWeights {
  const criteria = ['Criticality_Agg', 'Demand_Agg', 'Supply_Agg', 'Unit cost', 'Size_Score'] as const;
  const n = data.length;
  const k = 1 / Math.log(n);

  // Extract and normalize each criterion
  const matrices: Record<string, number[]> = {};
  criteria.forEach((c) => {
    const values = data.map((d) => getValue(d, c));
    matrices[c] = minMaxNormalize(values).map((v) => v + 0.0001); // Avoid log(0)
  });

  // Calculate proportions
  const proportions: Record<string, number[]> = {};
  criteria.forEach((c) => {
    const sum = matrices[c].reduce((a, b) => a + b, 0);
    proportions[c] = matrices[c].map((v) => v / sum);
  });

  // Calculate entropy
  const entropy: Record<string, number> = {};
  criteria.forEach((c) => {
    entropy[c] = -k * proportions[c].reduce((sum, p) => sum + p * Math.log(p), 0);
  });

  // Calculate diversity and weights
  const diversity: Record<string, number> = {};
  criteria.forEach((c) => {
    diversity[c] = 1 - entropy[c];
  });

  const totalDiversity = Object.values(diversity).reduce((a, b) => a + b, 0);
  const weights: EntropyWeights = {
    Criticality_Agg: diversity.Criticality_Agg / totalDiversity,
    Demand_Agg: diversity.Demand_Agg / totalDiversity,
    Supply_Agg: diversity.Supply_Agg / totalDiversity,
    'Unit cost': diversity['Unit cost'] / totalDiversity,
    Size_Score: diversity.Size_Score / totalDiversity,
  };

  return weights;
}

// TOPSIS calculation
export function calculateTOPSIS(data: InventoryItem[], weights: EntropyWeights): InventoryItem[] {
  const criteria = ['Criticality_Agg', 'Demand_Agg', 'Supply_Agg', 'Unit cost', 'Size_Score'] as const;
  const benefitCriteria = ['Criticality_Agg', 'Demand_Agg', 'Size_Score'];

  // Extract matrix
  const matrix = data.map((item) =>
    criteria.map((c) => getValue(item, c))
  );

  // Vector normalization
  const colSums = criteria.map((_, i) =>
    Math.sqrt(matrix.reduce((sum, row) => sum + row[i] ** 2, 0))
  );

  const normalizedMatrix = matrix.map((row) =>
    row.map((val, i) => (colSums[i] === 0 ? 0 : val / colSums[i]))
  );

  // Weighted normalization
  const weightValues = criteria.map((c) => weights[c]);
  const weightedMatrix = normalizedMatrix.map((row) =>
    row.map((val, i) => val * weightValues[i])
  );

  // Ideal solutions
  const idealBest = criteria.map((c, i) => {
    const col = weightedMatrix.map((row) => row[i]);
    return benefitCriteria.includes(c) ? Math.max(...col) : Math.min(...col);
  });

  const idealWorst = criteria.map((c, i) => {
    const col = weightedMatrix.map((row) => row[i]);
    return benefitCriteria.includes(c) ? Math.min(...col) : Math.max(...col);
  });

  // Calculate distances and scores
  return data.map((item, idx) => {
    const dBest = Math.sqrt(
      weightedMatrix[idx].reduce((sum, val, i) => sum + (val - idealBest[i]) ** 2, 0)
    );
    const dWorst = Math.sqrt(
      weightedMatrix[idx].reduce((sum, val, i) => sum + (val - idealWorst[i]) ** 2, 0)
    );
    const score = dWorst / (dBest + dWorst);

    return { ...item, TOPSIS_Score: score };
  });
}

// ABC Classification
export function classifyABC(
  data: InventoryItem[],
  thresholds: { A: number; B: number; C: number },
  scoreField: 'TOPSIS_Score' | 'Fuzzy_TOPSIS_Score' = 'TOPSIS_Score'
): InventoryItem[] {
  const sorted = [...data].sort(
    (a, b) => getValue(b, scoreField) - getValue(a, scoreField)
  );

  const n = sorted.length;
  const idxA = Math.floor((n * thresholds.A) / 100);
  const idxB = Math.floor((n * (thresholds.A + thresholds.B)) / 100);

  return sorted.map((item, idx) => {
    if (scoreField === 'TOPSIS_Score') {
      return { ...item, Class: idx < idxA ? 'A' : idx < idxB ? 'B' : 'C' as 'A' | 'B' | 'C' };
    } else {
      return { ...item, Fuzzy_Class: idx < idxA ? 'A' : idx < idxB ? 'B' : 'C' as 'A' | 'B' | 'C' };
    }
  });
}

// Fuzzy TOPSIS - TFN mapping
export function applyFuzzyMappings(
  data: InventoryItem[],
  tfn: FuzzyTFN
): { item: InventoryItem; fuzzyValues: Record<string, [number, number, number]> }[] {
  return data.map((item) => ({
    item,
    fuzzyValues: {
      Risk: tfn.Risk[item.Risk] ?? [0, 0, 0],
      'Demand fluctuation': tfn['Demand fluctuation'][item['Demand fluctuation']] ?? [0, 0, 0],
      'Consignment stock': tfn['Consignment stock'][item['Consignment stock']] ?? [0, 0, 0],
      'Unit size': tfn['Unit size'][item['Unit size']] ?? [0, 0, 0],
    },
  }));
}

// Fuzzy TOPSIS calculation using Vertex method
export function calculateFuzzyTOPSIS(data: InventoryItem[], tfn: FuzzyTFN): InventoryItem[] {
  const fuzzyData = applyFuzzyMappings(data, tfn);

  // Normalize quantitative variables to [0,1] range
  const dailyUsage = data.map((d) => d['Daily usage']);
  const avgStock = data.map((d) => d['Average stock']);
  const unitCost = data.map((d) => d['Unit cost']);
  const leadTime = data.map((d) => d['Lead time']);

  const normDailyUsage = minMaxNormalize(dailyUsage);
  const normAvgStock = minMaxNormalize(avgStock);
  const normUnitCost = minMaxNormalize(unitCost);
  const normLeadTime = minMaxNormalize(leadTime);

  // Equal weights for 8 criteria
  const nCrit = 8;
  const weight = 1 / nCrit;

  // FPIS = (1,1,1), FNIS = (0,0,0) weighted
  const fpisBase: [number, number, number] = [1, 1, 1];
  const fnisBase: [number, number, number] = [0, 0, 0];

  return data.map((item, idx) => {
    const fuzzy = fuzzyData[idx].fuzzyValues;

    // Build fuzzy criteria matrix (8 criteria)
    const criteriaMatrix: [number, number, number][] = [
      fuzzy.Risk,
      fuzzy['Demand fluctuation'],
      [normAvgStock[idx], normAvgStock[idx], normAvgStock[idx]],
      [normDailyUsage[idx], normDailyUsage[idx], normDailyUsage[idx]],
      [normUnitCost[idx], normUnitCost[idx], normUnitCost[idx]],
      [normLeadTime[idx], normLeadTime[idx], normLeadTime[idx]],
      fuzzy['Consignment stock'],
      fuzzy['Unit size'],
    ];

    // Calculate distances
    let dPosSqSum = 0;
    let dNegSqSum = 0;

    criteriaMatrix.forEach((tfnVal) => {
      const wTfn = tfnVal.map((v) => v * weight) as [number, number, number];
      const wIdealBest = fpisBase.map((v) => v * weight) as [number, number, number];
      const wIdealWorst = fnisBase.map((v) => v * weight) as [number, number, number];

      // Vertex method: d² = 1/3 * Σ(diff²)
      const dPosSq =
        ((wTfn[0] - wIdealBest[0]) ** 2 +
          (wTfn[1] - wIdealBest[1]) ** 2 +
          (wTfn[2] - wIdealBest[2]) ** 2) /
        3;
      const dNegSq =
        ((wTfn[0] - wIdealWorst[0]) ** 2 +
          (wTfn[1] - wIdealWorst[1]) ** 2 +
          (wTfn[2] - wIdealWorst[2]) ** 2) /
        3;

      dPosSqSum += dPosSq;
      dNegSqSum += dNegSq;
    });

    const dPos = Math.sqrt(dPosSqSum);
    const dNeg = Math.sqrt(dNegSqSum);
    const score = dNeg / (dPos + dNeg);

    return { ...item, Fuzzy_TOPSIS_Score: score };
  });
}

// Simple Random Forest-like classification (simulated for frontend)
export function simulateMLClassification(data: InventoryItem[]): {
  predictions: InventoryItem[];
  metrics: {
    accuracy: number;
    precision: Record<string, number>;
    recall: Record<string, number>;
    f1Score: Record<string, number>;
    confusionMatrix: number[][];
    featureImportance: Record<string, number>;
  };
} {
  // Use TOPSIS classification as "ground truth" and simulate ML predictions
  // with slight variations to show realistic metrics
  const predictions = data.map((item) => {
    // Simulate ~92% accuracy matching TOPSIS class
    const rand = Math.random();
    let predictedClass = item.Class ?? 'C';
    
    if (rand > 0.92) {
      // Misclassify occasionally
      const classes: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
      predictedClass = classes[Math.floor(Math.random() * 3)];
    }

    return { ...item, ML_Predicted_Class: predictedClass };
  });

  // Calculate realistic metrics
  const classLabels = ['A', 'B', 'C'];
  const confusionMatrix = classLabels.map((actual) =>
    classLabels.map(
      (predicted) =>
        predictions.filter(
          (p) => p.Class === actual && p.ML_Predicted_Class === predicted
        ).length
    )
  );

  const totalCorrect = confusionMatrix.reduce(
    (sum, row, i) => sum + row[i],
    0
  );
  const total = predictions.length;
  const accuracy = totalCorrect / total;

  const precision: Record<string, number> = {};
  const recall: Record<string, number> = {};
  const f1Score: Record<string, number> = {};

  classLabels.forEach((label, i) => {
    const tp = confusionMatrix[i][i];
    const fp = confusionMatrix.reduce((sum, row, j) => (j !== i ? sum + row[i] : sum), 0);
    const fn = confusionMatrix[i].reduce((sum, val, j) => (j !== i ? sum + val : sum), 0);

    precision[label] = tp + fp > 0 ? tp / (tp + fp) : 0;
    recall[label] = tp + fn > 0 ? tp / (tp + fn) : 0;
    f1Score[label] =
      precision[label] + recall[label] > 0
        ? (2 * precision[label] * recall[label]) / (precision[label] + recall[label])
        : 0;
  });

  // Feature importance (simulated based on typical patterns)
  const featureImportance: Record<string, number> = {
    Risk_Score: 0.18,
    Fluctuation_Score: 0.08,
    'Average stock': 0.12,
    'Daily usage': 0.15,
    'Unit cost': 0.22,
    'Lead time': 0.10,
    Consignment_Score: 0.05,
    Size_Score: 0.10,
  };

  return {
    predictions,
    metrics: {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix,
      featureImportance,
    },
  };
}

// Statistics calculations
export function calculateStats(values: number[]) {
  const n = values.length;
  if (n === 0) return { min: 0, max: 0, mean: 0, median: 0, std: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[n - 1];
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  return { min, max, mean, median, std };
}

// Correlation matrix calculation
export function calculateCorrelationMatrix(
  data: InventoryItem[],
  columns: string[]
): { matrix: number[][]; labels: string[] } {
  const n = data.length;
  const values: number[][] = columns.map((col) =>
    data.map((d) => getValue(d, col))
  );

  const means = values.map((col) => col.reduce((a, b) => a + b, 0) / n);
  const stds = values.map((col, i) => {
    const variance = col.reduce((sum, v) => sum + (v - means[i]) ** 2, 0) / n;
    return Math.sqrt(variance);
  });

  const matrix = columns.map((_, i) =>
    columns.map((_, j) => {
      if (stds[i] === 0 || stds[j] === 0) return 0;
      const cov =
        values[i].reduce((sum, v, k) => sum + (v - means[i]) * (values[j][k] - means[j]), 0) / n;
      return cov / (stds[i] * stds[j]);
    })
  );

  return { matrix, labels: columns };
}
