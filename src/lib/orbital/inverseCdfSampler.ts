/**
 * Build a 1-D sampler for an arbitrary (unnormalized, non-negative) density over
 * [a, b] by inverse-CDF lookup: tabulate the density on `bins` intervals, form the
 * cumulative (trapezoidal) distribution, normalize, then map u ∈ [0,1) back to x
 * with a binary search + linear interpolation. Cheap to build, O(log bins) to draw.
 */
export function makeInverseCdfSampler(
  density: (x: number) => number,
  a: number,
  b: number,
  bins = 1024,
): (u: number) => number {
  const dx = (b - a) / bins
  const cdf = new Float64Array(bins + 1)
  let acc = 0
  let prev = Math.max(density(a), 0)
  for (let i = 1; i <= bins; i++) {
    const d = Math.max(density(a + i * dx), 0)
    acc += 0.5 * (prev + d) * dx // trapezoid
    cdf[i] = acc
    prev = d
  }

  const total = acc || 1
  for (let i = 0; i <= bins; i++) cdf[i]! /= total

  return (u: number): number => {
    // smallest i with cdf[i] >= u
    let lo = 1
    let hi = bins
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cdf[mid]! < u) lo = mid + 1
      else hi = mid
    }
    const c0 = cdf[lo - 1]!
    const c1 = cdf[lo]!
    const t = c1 > c0 ? (u - c0) / (c1 - c0) : 0
    return a + (lo - 1 + t) * dx
  }
}
