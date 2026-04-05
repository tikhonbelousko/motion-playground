export interface DitherParams {
  /** 0-100: lower = more pixels survive (lighter), higher = more knocked out (darker) */
  threshold: number;
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

export function ditherFilter(
  source: ImageData,
  params: DitherParams,
): ImageData {
  const { width: w, height: h } = source;
  const src = source.data;
  const out = new Uint8ClampedArray(src.length);

  const rand = mulberry32(params.seed);
  const bias = (params.threshold - 50) / 50;

  for (let i = 0; i < src.length; i += 4) {
    const alpha = src[i + 3] / 255;
    const probability = Math.max(0, Math.min(1, alpha - bias));
    const survive = rand() < probability;

    out[i] = src[i];
    out[i + 1] = src[i + 1];
    out[i + 2] = src[i + 2];
    out[i + 3] = survive ? 255 : 0;
  }

  return new ImageData(out, w, h);
}
