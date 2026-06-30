/**
 * Self-contained spec for aggregateBodyFat — no jest dependency.
 * Run with: npx ts-node src/ai/body-fat-aggregator.spec.ts
 */
import { aggregateBodyFat, BodyFatSample } from './body-fat-aggregator';

let passed = 0;
let failed = 0;

function approx(actual: number | null, expected: number, tol = 0.2): boolean {
  return actual != null && Math.abs(actual - expected) <= tol;
}

function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    passed++;
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    // eslint-disable-next-line no-console
    console.error(`  ✗ ${name}`, detail ?? '');
  }
}

function sample(provider: string, value: number | null, confidence?: number, error?: string): BodyFatSample {
  return { provider, value, confidence, signals: [], error };
}

// --- 1. 五个聚集值，无离群 → 加权平均落在簇内 ---
{
  const r = aggregateBodyFat([
    sample('a', 18.0, 0.8),
    sample('b', 18.5, 0.7),
    sample('c', 19.0, 0.9),
    sample('d', 19.5, 0.6),
    sample('e', 20.0, 0.5),
  ]);
  check('case 1: cluster keeps all 5', r.keptCount === 5, r);
  check('case 1: weighted average ≈ 18.8', approx(r.final, 18.8, 0.3), r.final);
  check('case 1: spread = 2.0', r.spread === 2.0, r.spread);
}

// --- 2. 一个明显离群 [18,19,20,21,38] → 38 被剔除 ---
{
  const r = aggregateBodyFat([
    sample('a', 18, 0.7),
    sample('b', 19, 0.7),
    sample('c', 20, 0.7),
    sample('d', 21, 0.7),
    sample('e', 38, 0.7),
  ]);
  const outlier = r.breakdown.find((b) => b.provider === 'e');
  check('case 2: outlier 38 rejected', outlier?.kept === false && outlier?.rejectionReason === 'mad_outlier', outlier);
  check('case 2: keptCount = 4', r.keptCount === 4, r);
  check('case 2: final ≈ 19.5', approx(r.final, 19.5, 0.3), r.final);
}

// --- 3. 仅 1 个有效 → final = null ---
{
  const r = aggregateBodyFat([
    sample('a', 20, 0.8),
    sample('b', null, undefined, 'http_500'),
    sample('c', null, undefined, 'timeout'),
  ]);
  check('case 3: only 1 valid → final null', r.final === null, r);
  check('case 3: keptCount 0', r.keptCount === 0, r);
}

// --- 4. confidence 全缺省 → 等权平均 ---
{
  const r = aggregateBodyFat([
    sample('a', 20),
    sample('b', 22),
    sample('c', 24),
  ]);
  check('case 4: equal-weight mean ≈ 22', approx(r.final, 22, 0.1), r.final);
}

// --- 5. 极值钳制：超 [3,60] 直接剔除；最终落入 [8,45] ---
{
  const r = aggregateBodyFat([
    sample('a', 1, 0.9), // out of range
    sample('b', 80, 0.9), // out of range
    sample('c', 18, 0.8),
    sample('d', 19, 0.8),
  ]);
  const aBad = r.breakdown.find((b) => b.provider === 'a');
  const bBad = r.breakdown.find((b) => b.provider === 'b');
  check('case 5a: <3 rejected as out_of_range', aBad?.rejectionReason === 'out_of_range', aBad);
  check('case 5b: >60 rejected as out_of_range', bBad?.rejectionReason === 'out_of_range', bBad);
  check('case 5: final inside [8,45]', r.final != null && r.final >= 8 && r.final <= 45, r.final);
}

// --- 6. MAD = 0（全部相同）→ 不剔除任何样本 ---
{
  const r = aggregateBodyFat([
    sample('a', 20, 0.5),
    sample('b', 20, 0.5),
    sample('c', 20, 0.5),
  ]);
  check('case 6: MAD=0 keeps all', r.keptCount === 3, r);
  check('case 6: final = 20.0', r.final === 20.0, r.final);
  check('case 6: spread = 0', r.spread === 0, r.spread);
}

// --- 7. 钳制上界：极高聚类 ≥ 45 → 钳到 45 ---
{
  const r = aggregateBodyFat([
    sample('a', 50, 0.9),
    sample('b', 52, 0.9),
    sample('c', 51, 0.9),
  ]);
  check('case 7: clamped to 45', r.final === 45.0, r.final);
}

// --- 8. 兜底：MAD 剔除后剩 < 2 → 回退保留全部 inRange ---
{
  const r = aggregateBodyFat([
    sample('a', 15, 0.9),
    sample('b', 25, 0.9), // 中位数 20 + MAD = 5 → threshold ≈ 11.1，两侧都在内
  ]);
  check('case 8: 2-sample retains both', r.keptCount === 2, r);
  check('case 8: final ≈ 20', approx(r.final, 20, 0.2), r.final);
}

// eslint-disable-next-line no-console
console.log(`\nbody-fat-aggregator: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
