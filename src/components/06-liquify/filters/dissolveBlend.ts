export interface DissolveParams {
  /** 0–1 range (0 = fully off, 1 = fully on) */
  opacity: number;
  mode: "blend" | "transparent";
  seed: number;
}

function hash(x: number, y: number, seed: number): number {
  const v = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.7585) * 43758.5453;
  return v - Math.floor(v);
}

export function dissolveBlend(
  original: ImageData,
  filtered: ImageData,
  params: DissolveParams,
): ImageData {
  const { opacity, mode, seed } = params;
  const w = original.width;
  const h = original.height;
  const src = original.data;
  const flt = filtered.data;
  const out = new Uint8ClampedArray(src.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const h01 = hash(x, y, seed);

      if (h01 < opacity) {
        out[idx] = flt[idx];
        out[idx + 1] = flt[idx + 1];
        out[idx + 2] = flt[idx + 2];
        out[idx + 3] = flt[idx + 3];
      } else if (mode === "blend") {
        out[idx] = src[idx];
        out[idx + 1] = src[idx + 1];
        out[idx + 2] = src[idx + 2];
        out[idx + 3] = src[idx + 3];
      } else {
        out[idx] = 0;
        out[idx + 1] = 0;
        out[idx + 2] = 0;
        out[idx + 3] = 0;
      }
    }
  }

  return new ImageData(out, w, h);
}
