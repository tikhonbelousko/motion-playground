export interface BlurPoint {
  x: number;
  y: number;
  radius: number;
}

const STACK_RADII = [0, 1, 2, 4, 6, 8, 12, 16, 24, 32];

/**
 * Single-pass horizontal box blur into `out` from `src`.
 * Both are flat RGBA arrays of size w*h*4.
 */
function boxBlurH(
  src: Uint8ClampedArray,
  out: Uint8ClampedArray,
  w: number,
  h: number,
  r: number,
): void {
  const diam = r + r + 1;
  const invDiam = 1 / diam;

  for (let y = 0; y < h; y++) {
    const rowOff = y * w * 4;
    let ri = 0,
      gi = 0,
      bi = 0,
      ai = 0;

    // seed accumulator
    for (let x = -r; x <= r; x++) {
      const cx = Math.min(Math.max(x, 0), w - 1);
      const idx = rowOff + cx * 4;
      ri += src[idx];
      gi += src[idx + 1];
      bi += src[idx + 2];
      ai += src[idx + 3];
    }

    for (let x = 0; x < w; x++) {
      const idx = rowOff + x * 4;
      out[idx] = (ri * invDiam + 0.5) | 0;
      out[idx + 1] = (gi * invDiam + 0.5) | 0;
      out[idx + 2] = (bi * invDiam + 0.5) | 0;
      out[idx + 3] = (ai * invDiam + 0.5) | 0;

      const addX = Math.min(x + r + 1, w - 1);
      const remX = Math.max(x - r, 0);
      const addIdx = rowOff + addX * 4;
      const remIdx = rowOff + remX * 4;
      ri += src[addIdx] - src[remIdx];
      gi += src[addIdx + 1] - src[remIdx + 1];
      bi += src[addIdx + 2] - src[remIdx + 2];
      ai += src[addIdx + 3] - src[remIdx + 3];
    }
  }
}

function boxBlurV(
  src: Uint8ClampedArray,
  out: Uint8ClampedArray,
  w: number,
  h: number,
  r: number,
): void {
  const diam = r + r + 1;
  const invDiam = 1 / diam;

  for (let x = 0; x < w; x++) {
    let ri = 0,
      gi = 0,
      bi = 0,
      ai = 0;

    for (let y = -r; y <= r; y++) {
      const cy = Math.min(Math.max(y, 0), h - 1);
      const idx = (cy * w + x) * 4;
      ri += src[idx];
      gi += src[idx + 1];
      bi += src[idx + 2];
      ai += src[idx + 3];
    }

    for (let y = 0; y < h; y++) {
      const idx = (y * w + x) * 4;
      out[idx] = (ri * invDiam + 0.5) | 0;
      out[idx + 1] = (gi * invDiam + 0.5) | 0;
      out[idx + 2] = (bi * invDiam + 0.5) | 0;
      out[idx + 3] = (ai * invDiam + 0.5) | 0;

      const addY = Math.min(y + r + 1, h - 1);
      const remY = Math.max(y - r, 0);
      const addIdx = (addY * w + x) * 4;
      const remIdx = (remY * w + x) * 4;
      ri += src[addIdx] - src[remIdx];
      gi += src[addIdx + 1] - src[remIdx + 1];
      bi += src[addIdx + 2] - src[remIdx + 2];
      ai += src[addIdx + 3] - src[remIdx + 3];
    }
  }
}

/** Three-pass box blur approximating Gaussian at the given radius. */
function gaussianApprox(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number,
): Uint8ClampedArray {
  if (radius <= 0) return new Uint8ClampedArray(data);

  const r = Math.max(1, Math.round(radius / 3));
  let a = new Uint8ClampedArray(data);
  const b = new Uint8ClampedArray(data.length);

  for (let pass = 0; pass < 3; pass++) {
    boxBlurH(a, b, w, h, r);
    boxBlurV(b, a, w, h, r);
  }

  return a;
}

function buildBlurStack(
  src: Uint8ClampedArray,
  w: number,
  h: number,
): Uint8ClampedArray[] {
  return STACK_RADII.map((r) => gaussianApprox(src, w, h, r));
}

export function fieldBlur(
  source: ImageData,
  points: BlurPoint[],
): ImageData {
  const { width: w, height: h } = source;
  const stack = buildBlurStack(source.data, w, h);
  const out = new Uint8ClampedArray(source.data.length);

  const epsilon = 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Inverse-distance-weighted radius
      let wSum = 0;
      let rSum = 0;
      for (let i = 0; i < points.length; i++) {
        const dx = x - points[i].x;
        const dy = y - points[i].y;
        const d2 = dx * dx + dy * dy;
        const weight = 1 / Math.max(d2, epsilon);
        wSum += weight;
        rSum += weight * points[i].radius;
      }
      const effR = rSum / wSum;

      // Find bracketing stack levels and lerp
      let lo = 0;
      let hi = 0;
      for (let i = 0; i < STACK_RADII.length - 1; i++) {
        if (STACK_RADII[i] <= effR && STACK_RADII[i + 1] >= effR) {
          lo = i;
          hi = i + 1;
          break;
        }
        if (STACK_RADII[i + 1] < effR) {
          lo = i + 1;
          hi = i + 1;
        }
      }
      if (effR >= STACK_RADII[STACK_RADII.length - 1]) {
        lo = STACK_RADII.length - 1;
        hi = lo;
      }

      const idx = (y * w + x) * 4;
      if (lo === hi) {
        out[idx] = stack[lo][idx];
        out[idx + 1] = stack[lo][idx + 1];
        out[idx + 2] = stack[lo][idx + 2];
        out[idx + 3] = stack[lo][idx + 3];
      } else {
        const t =
          (effR - STACK_RADII[lo]) / (STACK_RADII[hi] - STACK_RADII[lo]);
        const sLo = stack[lo];
        const sHi = stack[hi];
        out[idx] = sLo[idx] + (sHi[idx] - sLo[idx]) * t;
        out[idx + 1] = sLo[idx + 1] + (sHi[idx + 1] - sLo[idx + 1]) * t;
        out[idx + 2] = sLo[idx + 2] + (sHi[idx + 2] - sLo[idx + 2]) * t;
        out[idx + 3] = sLo[idx + 3] + (sHi[idx + 3] - sLo[idx + 3]) * t;
      }
    }
  }

  return new ImageData(out, w, h);
}
