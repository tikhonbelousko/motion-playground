export interface VortexParams {
  centerX: number;
  centerY: number;
  radius: number;
  /** Twist angle in radians */
  angle: number;
}

function bilinearSample(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  sx: number,
  sy: number,
): [number, number, number, number] {
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = Math.min(x0 + 1, w - 1);
  const y1 = Math.min(y0 + 1, h - 1);
  const fx = sx - x0;
  const fy = sy - y0;

  const cx0 = Math.max(x0, 0);
  const cy0 = Math.max(y0, 0);

  const i00 = (cy0 * w + cx0) * 4;
  const i10 = (cy0 * w + x1) * 4;
  const i01 = (y1 * w + cx0) * 4;
  const i11 = (y1 * w + x1) * 4;

  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;

  return [
    data[i00] * w00 + data[i10] * w10 + data[i01] * w01 + data[i11] * w11,
    data[i00 + 1] * w00 + data[i10 + 1] * w10 + data[i01 + 1] * w01 + data[i11 + 1] * w11,
    data[i00 + 2] * w00 + data[i10 + 2] * w10 + data[i01 + 2] * w01 + data[i11 + 2] * w11,
    data[i00 + 3] * w00 + data[i10 + 3] * w10 + data[i01 + 3] * w01 + data[i11 + 3] * w11,
  ];
}

export function vortexFilter(
  source: ImageData,
  params: VortexParams,
): ImageData {
  const { width: w, height: h } = source;
  const { centerX: cx, centerY: cy, radius, angle } = params;
  const src = source.data;
  const out = new Uint8ClampedArray(src.length);
  out.set(src);

  const r2 = radius * radius;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;

      if (d2 >= r2) continue;

      const d = Math.sqrt(d2);
      const t = 1 - d / radius;
      const theta = angle * t * t;

      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const sx = cosT * dx - sinT * dy + cx;
      const sy = sinT * dx + cosT * dy + cy;

      if (sx < 0 || sx >= w - 1 || sy < 0 || sy >= h - 1) continue;

      const [r, g, b, a] = bilinearSample(src, w, h, sx, sy);
      const idx = (y * w + x) * 4;
      out[idx] = r;
      out[idx + 1] = g;
      out[idx + 2] = b;
      out[idx + 3] = a;
    }
  }

  return new ImageData(out, w, h);
}
