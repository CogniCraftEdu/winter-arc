// Odds model for "will I keep winning every day?"
//
// Each day is a win/loss. We keep a Beta(a, b) belief about the daily win probability p:
//   - the prior is "assumed daily win chance" (p0) worth `n0` days of evidence,
//   - every resolved day adds a win (a += 1) or a loss (b += 1).
// P(win the next k days in a row) = E[p^k] under that belief, which has a closed form:
//   E[p^k] = prod_{i=0..k-1} (a + i) / (a + b + i)
// A "fatigue" parameter lowers the daily odds by `delta` for every week ahead of the forecast date
// (multiplicative, so it factors straight out of the expectation).
// None of this is a measured fact about people; it is a transparent model, and every input is editable.

export function expPow(a, b, k) {
  let r = 1;
  for (let i = 0; i < k; i += 1) r *= (a + i) / (a + b + i);
  return r;
}

// Product of the fatigue multipliers over k days starting at challenge day `from` (1-based).
export function fatigue(from, k, delta) {
  if (!delta) return 1;
  const w0 = Math.floor((from - 1) / 7);
  let m = 1;
  for (let j = from; j < from + k; j += 1) m *= (1 - delta) ** (Math.floor((j - 1) / 7) - w0);
  return m;
}

export const priorOf = (p0, n0) => ({ a: p0 * n0, b: (1 - p0) * n0 });

// Odds, as of the start of challenge day `day`, of winning the next k days in a row.
export function streakOdds({ a, b, day, k, delta }) {
  return expPow(a, b, k) * fatigue(day, k, delta);
}

// Odds of finishing with at least `target` (0-1) of all days won, as of the morning of challenge day `day`,
// given `wins` already banked. Given p, day j is won with probability p * fatigue (independent), so the
// remaining wins follow a Poisson-binomial; we average that over the Beta(a, b) belief about p on a grid.
export function finishOdds({ a, b, wins, day, total, delta, target, grid = 120 }) {
  const R = total - day + 1;
  const need = Math.max(0, Math.ceil(target * total - 1e-9) - wins);
  if (need <= 0) return 1;
  if (need > R) return 0;
  const w0 = Math.floor((day - 1) / 7);
  let sumW = 0;
  let acc = 0;
  const dp = new Float64Array(R + 1);
  for (let g = 0; g < grid; g += 1) {
    const p = (g + 0.5) / grid;
    const w = Math.exp((a - 1) * Math.log(p) + (b - 1) * Math.log(1 - p));
    dp.fill(0); dp[0] = 1;
    for (let j = 0; j < R; j += 1) {
      const q = p * (1 - delta) ** (Math.floor((day + j - 1) / 7) - w0);
      for (let x = j; x >= 0; x -= 1) { dp[x + 1] += dp[x] * q; dp[x] *= 1 - q; }
    }
    let tail = 0;
    for (let x = need; x <= R; x += 1) tail += dp[x];
    acc += w * tail;
    sumW += w;
  }
  return acc / sumW;
}

// results[i] is true/false for challenge day i+1 (only days that are already over).
export function finishHistory({ results, prior, total, delta, target, upToDay }) {
  const out = [];
  let { a, b } = prior;
  let wins = 0;
  for (let d = 1; d <= upToDay; d += 1) {
    out.push({ day: d, p: finishOdds({ a, b, wins, day: d, total, delta, target }) });
    const r = results[d - 1];
    if (r === true) { a += 1; wins += 1; } else if (r === false) b += 1;
  }
  return out;
}

export function posterior({ results, prior }) {
  let { a, b } = prior;
  for (const r of results) { if (r) a += 1; else b += 1; }
  return { a, b, mean: a / (a + b) };
}
