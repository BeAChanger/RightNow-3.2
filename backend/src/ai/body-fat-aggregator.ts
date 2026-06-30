export interface BodyFatSample {
  provider: string;
  value: number | null;
  confidence?: number | null;
  signals?: string[];
  error?: string;
}

export interface BodyFatAggregateBreakdown {
  provider: string;
  value: number | null;
  confidence: number | null;
  signals: string[];
  kept: boolean;
  rejectionReason?: 'out_of_range' | 'mad_outlier' | 'failed';
  error?: string;
}

export interface BodyFatAggregateResult {
  final: number | null;
  median: number | null;
  spread: number | null;
  keptCount: number;
  totalCount: number;
  breakdown: BodyFatAggregateBreakdown[];
}

const MIN_PLAUSIBLE = 3;
const MAX_PLAUSIBLE = 60;
const CLAMP_LOW = 8;
const CLAMP_HIGH = 45;
const MAD_K = 1.5;
const MAD_SIGMA = 1.4826;
const MIN_KEPT = 2;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function aggregateBodyFat(samples: BodyFatSample[]): BodyFatAggregateResult {
  const breakdown: BodyFatAggregateBreakdown[] = samples.map((s) => ({
    provider: s.provider,
    value: typeof s.value === 'number' && Number.isFinite(s.value) ? s.value : null,
    confidence:
      typeof s.confidence === 'number' && Number.isFinite(s.confidence) ? s.confidence : null,
    signals: s.signals ?? [],
    kept: false,
    rejectionReason: s.error || s.value == null ? 'failed' : undefined,
    error: s.error,
  }));

  const inRange = breakdown.filter(
    (b) => b.value != null && b.value >= MIN_PLAUSIBLE && b.value <= MAX_PLAUSIBLE,
  );
  breakdown.forEach((b) => {
    if (b.value != null && (b.value < MIN_PLAUSIBLE || b.value > MAX_PLAUSIBLE)) {
      b.rejectionReason = 'out_of_range';
    }
  });

  if (inRange.length < MIN_KEPT) {
    return {
      final: null,
      median: inRange.length ? median(inRange.map((b) => b.value as number)) : null,
      spread: null,
      keptCount: 0,
      totalCount: samples.length,
      breakdown,
    };
  }

  const values = inRange.map((b) => b.value as number);
  const med = median(values);
  const mad = median(values.map((v) => Math.abs(v - med)));
  const threshold = mad === 0 ? Infinity : MAD_K * MAD_SIGMA * mad;

  inRange.forEach((b) => {
    if (Math.abs((b.value as number) - med) <= threshold) {
      b.kept = true;
    } else {
      b.rejectionReason = 'mad_outlier';
    }
  });

  let kept = breakdown.filter((b) => b.kept);
  if (kept.length < MIN_KEPT) {
    inRange.forEach((b) => {
      b.kept = true;
      b.rejectionReason = undefined;
    });
    kept = breakdown.filter((b) => b.kept);
  }

  const weightSum = kept.reduce((acc, b) => acc + (b.confidence ?? 0.5), 0);
  const weightedSum = kept.reduce(
    (acc, b) => acc + (b.value as number) * (b.confidence ?? 0.5),
    0,
  );
  const weighted = weightSum > 0 ? weightedSum / weightSum : med;
  const clamped = Math.max(CLAMP_LOW, Math.min(CLAMP_HIGH, weighted));
  const final = Number(clamped.toFixed(1));

  const keptValues = kept.map((b) => b.value as number);
  const spread = keptValues.length > 1 ? Math.max(...keptValues) - Math.min(...keptValues) : 0;

  return {
    final,
    median: med,
    spread: Number(spread.toFixed(2)),
    keptCount: kept.length,
    totalCount: samples.length,
    breakdown,
  };
}
