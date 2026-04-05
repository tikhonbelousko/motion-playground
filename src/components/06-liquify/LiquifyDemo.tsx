import { useCallback, useEffect, useRef, useState } from "react";
import { useControls, folder, button } from "leva";
import { useSourceImage } from "./useSourceImage";
import { vortexFilter } from "./filters/vortexFilter";
import { fieldBlur, type BlurPoint } from "./filters/fieldBlur";
import { ditherFilter } from "./filters/ditherFilter";

const HANDLE_RADIUS = 8;
const HIT_THRESHOLD = 15;
const DEG_TO_RAD = Math.PI / 180;

function makeDefaultBlurPoints(w: number, h: number): BlurPoint[] {
  const insetX = Math.round(w * 0.15);
  const insetY = Math.round(h * 0.15);
  return [
    { x: insetX, y: h - insetY, radius: 16 },
    { x: Math.round(w / 2), y: Math.round(h / 2), radius: 2 },
    { x: w - insetX, y: insetY, radius: 16 },
  ];
}

type DragTarget =
  | { kind: "vortex" }
  | { kind: "blur"; index: number }
  | null;

export function LiquifyDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { imageData, width, height, loaded } = useSourceImage();

  const [blurPoints, setBlurPoints] = useState<BlurPoint[]>([]);
  const [vortexCenter, setVortexCenter] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [initialized, setInitialized] = useState(false);
  const [ditherSeed, setDitherSeed] = useState(42);
  const dragRef = useRef<DragTarget>(null);
  const rafId = useRef(0);

  useEffect(() => {
    if (!loaded || initialized) return;
    setBlurPoints(makeDefaultBlurPoints(width, height));
    setVortexCenter({ x: Math.round(width / 2), y: Math.round(height / 2) });
    setInitialized(true);
  }, [loaded, initialized, width, height]);

  const minDim = Math.min(width || 400, height || 400);

  const [{ fieldBlurEnabled, blurIntensity, vortexEnabled, vortexAngle, vortexRadius, ditherEnabled, ditherSharpness }] =
    useControls(() => ({
      "Field Blur": folder({
        fieldBlurEnabled: { value: true, label: "Enabled" },
        blurIntensity: { value: 1, min: 0, max: 5, step: 0.1, label: "Intensity" },
      }),
      Vortex: folder({
        vortexEnabled: { value: true, label: "Enabled" },
        vortexAngle: { value: 180, min: -720, max: 720, step: 1, label: "Angle (deg)" },
        vortexRadius: {
          value: Math.round(minDim * 0.5),
          min: 20,
          max: minDim || 400,
          step: 1,
          label: "Radius",
        },
      }),
      Dither: folder({
        ditherEnabled: { value: false, label: "Enabled" },
        ditherSharpness: { value: 0, min: 0, max: 100, step: 1, label: "Sharpness" },
        Reseed: button(() => setDitherSeed((Date.now() * Math.random()) | 0)),
      }),
    }), [minDim]);

  // Dynamic Leva controls for blur point radii
  const pointRadii = useControls(
    "Blur Points",
    () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const schema: Record<string, any> = {};
      for (let i = 0; i < blurPoints.length; i++) {
        schema[`Point ${i + 1} radius`] = {
          value: blurPoints[i].radius,
          min: 0,
          max: 50,
          step: 0.5,
        };
      }
      schema["Reset points"] = button(() => {
        if (width && height) {
          setBlurPoints(makeDefaultBlurPoints(width, height));
        }
      });
      return schema;
    },
    [blurPoints.length],
  );

  // Sync Leva radius values back into blurPoints (only if a radius actually changed)
  useEffect(() => {
    setBlurPoints((prev) => {
      let changed = false;
      const next = prev.map((pt, i) => {
        const key = `Point ${i + 1} radius`;
        const newR = (pointRadii as unknown as Record<string, number>)[key];
        if (newR !== undefined && newR !== pt.radius) {
          changed = true;
          return { ...pt, radius: newR };
        }
        return pt;
      });
      return changed ? next : prev;
    });
  }, [pointRadii]);

  // --- Rendering pipeline ---
  const render = useCallback(() => {
    if (!imageData || !canvasRef.current || !initialized) return;
    const ctx = canvasRef.current.getContext("2d")!;

    let current: ImageData = imageData;

    if (fieldBlurEnabled && blurPoints.length >= 2) {
      current = fieldBlur(current, blurPoints, blurIntensity);
    }

    if (vortexEnabled) {
      current = vortexFilter(current, {
        centerX: vortexCenter.x,
        centerY: vortexCenter.y,
        radius: vortexRadius,
        angle: vortexAngle * DEG_TO_RAD,
      });
    }

    if (ditherEnabled) {
      current = ditherFilter(current, {
        sharpness: ditherSharpness,
        seed: ditherSeed,
      });
    }

    ctx.putImageData(current, 0, 0);

    // --- Overlays ---
    // Blur point handles
    for (let i = 0; i < blurPoints.length; i++) {
      const pt = blurPoints[i];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${Math.round(pt.radius)}`, pt.x, pt.y);
    }

    // Vortex center + radius ring
    if (vortexEnabled) {
      ctx.beginPath();
      ctx.arc(vortexCenter.x, vortexCenter.y, vortexRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(100, 180, 255, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(vortexCenter.x, vortexCenter.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(100, 180, 255, 0.8)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Crosshair
      const ch = 12;
      ctx.beginPath();
      ctx.moveTo(vortexCenter.x - ch, vortexCenter.y);
      ctx.lineTo(vortexCenter.x + ch, vortexCenter.y);
      ctx.moveTo(vortexCenter.x, vortexCenter.y - ch);
      ctx.lineTo(vortexCenter.x, vortexCenter.y + ch);
      ctx.strokeStyle = "rgba(100, 180, 255, 0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [
    imageData,
    initialized,
    fieldBlurEnabled,
    blurIntensity,
    blurPoints,
    vortexEnabled,
    vortexCenter,
    vortexRadius,
    vortexAngle,
    ditherEnabled,
    ditherSharpness,
    ditherSeed,
  ]);

  useEffect(() => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId.current);
  }, [render]);

  // --- Pointer interactions ---
  const getCanvasPos = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [width, height],
  );

  const findBlurHandle = useCallback(
    (px: number, py: number): number => {
      for (let i = blurPoints.length - 1; i >= 0; i--) {
        const dx = px - blurPoints[i].x;
        const dy = py - blurPoints[i].y;
        if (Math.sqrt(dx * dx + dy * dy) < HIT_THRESHOLD) return i;
      }
      return -1;
    },
    [blurPoints],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const pos = getCanvasPos(e);
      const blurIdx = findBlurHandle(pos.x, pos.y);

      if (blurIdx >= 0) {
        dragRef.current = { kind: "blur", index: blurIdx };
      } else {
        dragRef.current = { kind: "vortex" };
        setVortexCenter({ x: Math.round(pos.x), y: Math.round(pos.y) });
      }

      canvasRef.current?.setPointerCapture(e.pointerId);
    },
    [getCanvasPos, findBlurHandle],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      if (!drag) return;
      const pos = getCanvasPos(e);

      if (drag.kind === "vortex") {
        setVortexCenter({ x: Math.round(pos.x), y: Math.round(pos.y) });
      } else if (drag.kind === "blur") {
        setBlurPoints((prev) =>
          prev.map((pt, i) =>
            i === drag.index
              ? { ...pt, x: Math.round(pos.x), y: Math.round(pos.y) }
              : pt,
          ),
        );
      }
    },
    [getCanvasPos],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;

      if (findBlurHandle(px, py) >= 0) return;

      setBlurPoints((prev) => [
        ...prev,
        { x: Math.round(px), y: Math.round(py), radius: 8 },
      ]);
    },
    [width, height, findBlurHandle],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const rect = canvasRef.current!.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      const idx = findBlurHandle(px, py);

      if (idx >= 0 && blurPoints.length > 2) {
        setBlurPoints((prev) => prev.filter((_, i) => i !== idx));
      }
    },
    [width, height, findBlurHandle, blurPoints.length],
  );

  if (!loaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        Loading image...
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="max-h-full max-w-full object-contain"
        style={{ cursor: "crosshair" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}
