import { useCallback, useEffect, useRef, useState } from "react";
import { useControls, folder, button } from "leva";
import { useSourceImage } from "./useSourceImage";
import { useWebGLPipeline, type BlurPoint, type Vortex } from "./useWebGLPipeline";

const HANDLE_RADIUS = 8;
const HIT_THRESHOLD = 15;
const DEG_TO_RAD = Math.PI / 180;
const LERP_SPEED = 0.12;

function makeDefaultBlurPoints(w: number, h: number): BlurPoint[] {
  const insetX = Math.round(w * 0.15);
  const insetY = Math.round(h * 0.15);
  return [
    { x: insetX, y: h - insetY, radius: 16 },
    { x: Math.round(w / 2), y: Math.round(h / 2), radius: 2 },
    { x: w - insetX, y: insetY, radius: 16 },
  ];
}

function drawBlurHandles(
  ctx: CanvasRenderingContext2D,
  points: BlurPoint[],
) {
  for (const pt of points) {
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
}

function drawVortexRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  label?: string,
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(100, 180, 255, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(100, 180, 255, 0.8)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const ch = 12;
  ctx.beginPath();
  ctx.moveTo(x - ch, y);
  ctx.lineTo(x + ch, y);
  ctx.moveTo(x, y - ch);
  ctx.lineTo(x, y + ch);
  ctx.strokeStyle = "rgba(100, 180, 255, 0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();

  if (label) {
    ctx.fillStyle = "rgba(100, 180, 255, 0.9)";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, x, y - 8);
  }
}

type DragTarget =
  | { kind: "vortex"; index: number }
  | { kind: "blur"; index: number }
  | null;

export function LiquifyDemo() {
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const { source, width, height, loaded } = useSourceImage();

  const [blurPoints, setBlurPoints] = useState<BlurPoint[]>([]);
  const [vortexCenters, setVortexCenters] = useState<Array<{ x: number; y: number }>>([]);
  const [initialized, setInitialized] = useState(false);
  const [ditherSeed, setDitherSeed] = useState(42);
  const dragRef = useRef<DragTarget>(null);
  const rafId = useRef(0);

  // Follow-mode refs (no re-renders on mouse move)
  const mousePosRef = useRef({ x: 0, y: 0 });
  const mouseInCanvasRef = useRef(false);
  const currentPosRef = useRef({ x: 0, y: 0 });
  const seedRef = useRef(42);
  const lastSeedTimeRef = useRef(0);

  const { render: renderPipeline } = useWebGLPipeline(
    glCanvasRef,
    source,
    width,
    height,
  );

  useEffect(() => {
    if (!loaded || initialized) return;
    setBlurPoints(makeDefaultBlurPoints(width, height));
    const cx = Math.round(width / 2);
    const cy = Math.round(height / 2);
    setVortexCenters([
      { x: Math.round(width / 3), y: cy },
      { x: Math.round((width * 2) / 3), y: cy },
    ]);
    currentPosRef.current = { x: cx, y: cy };
    mousePosRef.current = { x: cx, y: cy };
    setInitialized(true);
  }, [loaded, initialized, width, height]);

  const minDim = Math.min(width || 400, height || 400);

  const [{ followMode, showGuides, fieldBlurEnabled, blurIntensity, vortexEnabled, v1Angle, v1Radius, v2Angle, v2Radius, ditherEnabled, ditherSharpness, ditherRate }] =
    useControls(() => ({
      followMode: { value: true, label: "Follow Mode" },
      showGuides: { value: true, label: "Show Guides" },
      "Field Blur": folder({
        fieldBlurEnabled: { value: true, label: "Enabled" },
        blurIntensity: { value: 0.4, min: 0, max: 5, step: 0.1, label: "Intensity" },
      }),
      Vortex: folder({
        vortexEnabled: { value: true, label: "Enabled" },
        "Vortex 1": folder({
          v1Angle: { value: 221, min: -720, max: 720, step: 1, label: "Angle (deg)" },
          v1Radius: {
            value: 169,
            min: 20,
            max: minDim || 400,
            step: 1,
            label: "Radius",
          },
        }),
        "Vortex 2": folder({
          v2Angle: { value: -7, min: -720, max: 720, step: 1, label: "Angle (deg)" },
          v2Radius: {
            value: Math.min(450, minDim || 400),
            min: 20,
            max: minDim || 400,
            step: 1,
            label: "Radius",
          },
        }),
      }),
      Dither: folder({
        ditherEnabled: { value: true, label: "Enabled" },
        ditherSharpness: { value: 6, min: 0, max: 100, step: 1, label: "Sharpness" },
        ditherRate: { value: 10, min: 0, max: 60, step: 1, label: "Seed Rate (/s)" },
        Reseed: button(() => setDitherSeed((Date.now() * Math.random()) | 0)),
      }),
    }), [minDim]);

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

  // ========== FOLLOW MODE ==========
  useEffect(() => {
    if (!followMode || !initialized) return;

    let running = true;
    lastSeedTimeRef.current = performance.now();

    const loop = () => {
      if (!running) return;

      const target = mouseInCanvasRef.current
        ? mousePosRef.current
        : { x: width / 2, y: height / 2 };
      const cur = currentPosRef.current;
      cur.x += (target.x - cur.x) * LERP_SPEED;
      cur.y += (target.y - cur.y) * LERP_SPEED;

      if (ditherRate > 0) {
        const now = performance.now();
        const interval = 1000 / ditherRate;
        if (now - lastSeedTimeRef.current >= interval) {
          seedRef.current = (seedRef.current + 1) | 0;
          lastSeedTimeRef.current = now;
        }
      }

      const vortices: Vortex[] = [
        { x: cur.x, y: cur.y, angle: v1Angle * DEG_TO_RAD, radius: v1Radius },
        { x: cur.x, y: cur.y, angle: v2Angle * DEG_TO_RAD, radius: v2Radius },
      ];

      renderPipeline({
        fieldBlurEnabled,
        blurIntensity,
        blurPoints,
        vortexEnabled,
        vortices,
        ditherEnabled,
        ditherSharpness,
        ditherSeed: seedRef.current,
      });

      const canvas = overlayRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, width, height);
        if (showGuides) {
          drawBlurHandles(ctx, blurPoints);
          if (vortexEnabled) {
            drawVortexRing(ctx, cur.x, cur.y, v1Radius);
            if (v2Radius !== v1Radius) {
              drawVortexRing(ctx, cur.x, cur.y, v2Radius);
            }
          }
        }
      }

      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafId.current);
    };
  }, [
    followMode, initialized, width, height, showGuides,
    renderPipeline, fieldBlurEnabled, blurIntensity, blurPoints,
    vortexEnabled, v1Angle, v1Radius, v2Angle, v2Radius,
    ditherEnabled, ditherSharpness, ditherRate,
  ]);

  const handleFollowMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = overlayRef.current!.getBoundingClientRect();
      mousePosRef.current = {
        x: ((e.clientX - rect.left) / rect.width) * width,
        y: ((e.clientY - rect.top) / rect.height) * height,
      };
    },
    [width, height],
  );

  const handleFollowEnter = useCallback(() => {
    mouseInCanvasRef.current = true;
  }, []);

  const handleFollowLeave = useCallback(() => {
    mouseInCanvasRef.current = false;
  }, []);

  // ========== EDIT MODE ==========
  const drawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);

    if (!showGuides) return;

    drawBlurHandles(ctx, blurPoints);

    if (vortexEnabled) {
      const perRadius = [v1Radius, v2Radius];
      for (let vi = 0; vi < vortexCenters.length; vi++) {
        const vc = vortexCenters[vi];
        drawVortexRing(ctx, vc.x, vc.y, perRadius[vi] ?? perRadius[0], `${vi + 1}`);
      }
    }
  }, [showGuides, blurPoints, vortexEnabled, vortexCenters, v1Radius, v2Radius, width, height]);

  const renderAll = useCallback(() => {
    if (!initialized || followMode) return;
    const perAngle = [v1Angle, v2Angle];
    const perRadius = [v1Radius, v2Radius];
    const vortices: Vortex[] = vortexCenters.map((c, i) => ({
      x: c.x,
      y: c.y,
      angle: (perAngle[i] ?? perAngle[0]) * DEG_TO_RAD,
      radius: perRadius[i] ?? perRadius[0],
    }));

    renderPipeline({
      fieldBlurEnabled,
      blurIntensity,
      blurPoints,
      vortexEnabled,
      vortices,
      ditherEnabled,
      ditherSharpness,
      ditherSeed,
    });
    drawOverlay();
  }, [
    initialized, followMode,
    renderPipeline, fieldBlurEnabled, blurIntensity, blurPoints,
    vortexEnabled, vortexCenters, v1Angle, v1Radius, v2Angle, v2Radius,
    ditherEnabled, ditherSharpness, ditherSeed, drawOverlay,
  ]);

  useEffect(() => {
    if (followMode) return;
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(renderAll);
    return () => cancelAnimationFrame(rafId.current);
  }, [followMode, renderAll]);

  // --- Edit-mode pointer interactions ---
  const getCanvasPos = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = overlayRef.current!.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * width,
        y: ((e.clientY - rect.top) / rect.height) * height,
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

  const findVortexHandle = useCallback(
    (px: number, py: number): number => {
      for (let i = vortexCenters.length - 1; i >= 0; i--) {
        const dx = px - vortexCenters[i].x;
        const dy = py - vortexCenters[i].y;
        if (Math.sqrt(dx * dx + dy * dy) < HIT_THRESHOLD) return i;
      }
      return -1;
    },
    [vortexCenters],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (followMode) return;
      const pos = getCanvasPos(e);

      const vortexIdx = findVortexHandle(pos.x, pos.y);
      if (vortexIdx >= 0) {
        dragRef.current = { kind: "vortex", index: vortexIdx };
        overlayRef.current?.setPointerCapture(e.pointerId);
        return;
      }

      const blurIdx = findBlurHandle(pos.x, pos.y);
      if (blurIdx >= 0) {
        dragRef.current = { kind: "blur", index: blurIdx };
        overlayRef.current?.setPointerCapture(e.pointerId);
      }
    },
    [followMode, getCanvasPos, findVortexHandle, findBlurHandle],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (followMode) {
        handleFollowMove(e);
        return;
      }
      const drag = dragRef.current;
      if (!drag) return;
      const pos = getCanvasPos(e);

      if (drag.kind === "vortex") {
        setVortexCenters((prev) =>
          prev.map((c, i) =>
            i === drag.index
              ? { x: Math.round(pos.x), y: Math.round(pos.y) }
              : c,
          ),
        );
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
    [followMode, handleFollowMove, getCanvasPos],
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (followMode) return;
      const rect = overlayRef.current!.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * width;
      const py = ((e.clientY - rect.top) / rect.height) * height;

      if (findBlurHandle(px, py) >= 0) return;

      setBlurPoints((prev) => [
        ...prev,
        { x: Math.round(px), y: Math.round(py), radius: 8 },
      ]);
    },
    [followMode, width, height, findBlurHandle],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (followMode) return;
      const rect = overlayRef.current!.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * width;
      const py = ((e.clientY - rect.top) / rect.height) * height;
      const idx = findBlurHandle(px, py);

      if (idx >= 0 && blurPoints.length > 2) {
        setBlurPoints((prev) => prev.filter((_, i) => i !== idx));
      }
    },
    [followMode, width, height, findBlurHandle, blurPoints.length],
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
      <div className="relative">
        <canvas
          ref={glCanvasRef}
          width={width}
          height={height}
          className="block max-h-screen max-w-screen"
        />
        <canvas
          ref={overlayRef}
          width={width}
          height={height}
          className="absolute inset-0"
          style={{
            cursor: "default",
            width: "100%",
            height: "100%",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerEnter={followMode ? handleFollowEnter : undefined}
          onPointerLeave={followMode ? handleFollowLeave : undefined}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        />
      </div>
    </div>
  );
}
