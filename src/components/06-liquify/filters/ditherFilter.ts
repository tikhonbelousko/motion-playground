export interface DitherParams {
  /** 0 = max noise (linear probability), 100 = sharp edges (step function) */
  sharpness: number;
  /** Seed for the PRNG — deterministic per value, reseed via button */
  seed: number;
}

/** Mulberry32: fast 32-bit seeded PRNG returning 0-1 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Attempt: attempt a symmetric gain curve that pushes values toward 0 or 1.
 * k=1 → linear, k>1 → steeper S-curve.
 */
function gain(t: number, k: number): number {
  if (t < 0.5) {
    return 0.5 * Math.pow(2 * t, k);
  }
  return 1 - 0.5 * Math.pow(2 * (1 - t), k);
}

export function ditherFilter(
  source: ImageData,
  params: DitherParams,
): ImageData {
  const { width: w, height: h } = source;
  const src = source.data;
  const out = new Uint8ClampedArray(src.length);

  const rand = mulberry32(params.seed);
  const k = 1 + (params.sharpness / 100) * 19;

  for (let i = 0; i < src.length; i += 4) {
    const alpha = src[i + 3] / 255;
    const probability = gain(alpha, k);
    const survive = rand() < probability;

    out[i] = src[i];
    out[i + 1] = src[i + 1];
    out[i + 2] = src[i + 2];
    out[i + 3] = survive ? 255 : 0;
  }

  return new ImageData(out, w, h);
}
