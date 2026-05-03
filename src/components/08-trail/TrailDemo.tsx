import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Leva, useControls } from "leva";

type Point = {
  x: number;
  y: number;
  time: number;
};

type TrailParticle = {
  id: number;
  src: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotateIn: number;
  spin: number;
  sizeMix: number;
  strokeDistance: number;
  taperOverride: number | null;
  age: number;
  life: number;
};

const assetModules = import.meta.glob("./assets/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const ASSET_URLS = Object.values(assetModules) as string[];
const TAPER_END_MIN_SIZE = 4;
const TAPER_END_MAX_SIZE = 10;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function smoothStep(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

function plateauFade(progress: number, edgeSize: number) {
  const fadeIn = smoothStep(clamp(progress / edgeSize, 0, 1));
  const fadeOut = smoothStep(clamp((1 - progress) / edgeSize, 0, 1));

  return Math.min(fadeIn, fadeOut);
}

function getStrokeTaper(
  particleDistance: number,
  currentStrokeDistance: number,
  taperLength: number,
) {
  if (currentStrokeDistance <= 0) return 1;

  const safeTaperLength = Math.max(taperLength, 1);
  const startTaper = clamp(particleDistance / safeTaperLength, 0, 1);
  const headTaper = clamp(
    (currentStrokeDistance - particleDistance) / safeTaperLength,
    0,
    1,
  );

  return Math.min(startTaper, headTaper);
}

function getBiasedOffsetDistance(radius: number, spreadBias: number) {
  const exponent = 0.5 * Math.pow(4, -spreadBias);

  return Math.pow(Math.random(), exponent) * radius;
}

function getRandomAsset() {
  return ASSET_URLS[Math.floor(Math.random() * ASSET_URLS.length)];
}

function TrailImage({
  particle,
  startScale,
  peakScale,
  opacityPeak,
  minSize,
  maxSize,
  currentStrokeDistance,
  taperLength,
  taperEndScale,
}: {
  particle: TrailParticle;
  startScale: number;
  peakScale: number;
  opacityPeak: number;
  minSize: number;
  maxSize: number;
  currentStrokeDistance: number;
  taperLength: number;
  taperEndScale: number;
}) {
  const progress = clamp(particle.age / particle.life, 0, 1);
  const bloom = Math.sin(progress * Math.PI);
  const scale = lerp(startScale, peakScale, bloom);
  const opacity = opacityPeak * plateauFade(progress, 0.12);
  const sizeMin = Math.min(minSize, maxSize);
  const sizeMax = Math.max(minSize, maxSize);
  const strokeTaper =
    particle.taperOverride ??
    getStrokeTaper(particle.strokeDistance, currentStrokeDistance, taperLength);
  const taperEndMinSize = TAPER_END_MIN_SIZE * taperEndScale;
  const taperEndMaxSize = TAPER_END_MAX_SIZE * taperEndScale;
  const taperedSize = lerp(
    lerp(taperEndMinSize, taperEndMaxSize, particle.sizeMix),
    lerp(sizeMin, sizeMax, particle.sizeMix),
    strokeTaper,
  );
  const rotateInProgress = clamp(progress * 2, 0, 1);
  const rotation =
    particle.rotation +
    particle.rotateIn * (1 - rotateInProgress) +
    particle.spin * progress;

  return (
    <img
      src={particle.src}
      alt=""
      className="pointer-events-none fixed left-0 top-0 z-20 select-none object-contain"
      style={{
        width: taperedSize,
        height: taperedSize,
        opacity,
        transform: `translate3d(${particle.x}px, ${particle.y}px, 0) translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
      }}
    />
  );
}

export function TrailDemo() {
  const particlesRef = useRef<TrailParticle[]>([]);
  const lastPointRef = useRef<Point | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const strokeDistanceRef = useRef(0);
  const idRef = useRef(0);
  const [particles, setParticles] = useState<TrailParticle[]>([]);
  const [currentStrokeDistance, setCurrentStrokeDistance] = useState(0);

  const [{
    spacing,
    imagesPerStamp,
    minThickness,
    maxThickness,
    speedForMaxThickness,
    spreadBias,
    taperStrength,
    taperLength,
    maxStampsPerMove,
  }] = useControls("Brush", () => ({
    spacing: { value: 26, min: 4, max: 80, step: 1, label: "Spacing" },
    imagesPerStamp: { value: 2, min: 1, max: 8, step: 1, label: "Images / Stamp" },
    minThickness: { value: 10, min: 0, max: 120, step: 1, label: "Min Thickness" },
    maxThickness: { value: 122, min: 8, max: 360, step: 1, label: "Max Thickness" },
    speedForMaxThickness: {
      value: 1400,
      min: 120,
      max: 4000,
      step: 20,
      label: "Speed For Max",
    },
    spreadBias: { value: 0, min: -1, max: 1, step: 0.01, label: "Spread Bias" },
    taperStrength: { value: 0.97, min: 0, max: 1, step: 0.01, label: "Taper" },
    taperLength: { value: 150, min: 20, max: 600, step: 5, label: "Taper Length" },
    maxStampsPerMove: { value: 26, min: 1, max: 48, step: 1, label: "Max Stamps" },
  }));

  const [{ minSize, maxSize, taperEndScale, life, maxImages }] = useControls("Images", () => ({
    minSize: { value: 48, min: 12, max: 160, step: 1, label: "Min Size" },
    maxSize: { value: 172, min: 12, max: 260, step: 1, label: "Max Size" },
    taperEndScale: {
      value: 0.25,
      min: 0.25,
      max: 8,
      step: 0.05,
      label: "Taper End Scale",
    },
    life: { value: 0.54, min: 0.2, max: 3, step: 0.02, label: "Life (s)" },
    maxImages: { value: 610, min: 50, max: 1400, step: 10, label: "Max Images" },
  }));

  const [{ startScale, peakScale, opacityPeak, rotationRange, spinRange, drift }] =
    useControls("Animation", () => ({
      startScale: { value: 0.5, min: 0.1, max: 1, step: 0.01, label: "Start Scale" },
      peakScale: { value: 1, min: 0.5, max: 2, step: 0.01, label: "Peak Scale" },
      opacityPeak: { value: 1, min: 0.05, max: 1, step: 0.01, label: "Peak Opacity" },
      rotationRange: { value: 42, min: 0, max: 180, step: 1, label: "Rotate In" },
      spinRange: { value: 34, min: 0, max: 360, step: 1, label: "Spin" },
      drift: { value: 26, min: 0, max: 260, step: 1, label: "Drift" },
    }));

  const [{
    explodeCount,
    explodeForce,
    explodeRadius,
    blastForce,
    blastRadius,
  }] = useControls(
    "Click Explosion",
    () => ({
      explodeCount: { value: 25, min: 0, max: 80, step: 1, label: "Count" },
      explodeForce: { value: 290, min: 0, max: 1600, step: 10, label: "Force" },
      explodeRadius: { value: 29, min: 0, max: 140, step: 1, label: "Radius" },
      blastForce: { value: 620, min: 0, max: 1200, step: 10, label: "Blast Force" },
      blastRadius: { value: 600, min: 0, max: 600, step: 5, label: "Blast Radius" },
    }),
  );

  const addParticle = useCallback(
    (
      x: number,
      y: number,
      radius: number,
      strokeDistance: number,
      options: { taperOverride?: number; vx?: number; vy?: number } = {},
    ) => {
      const offsetAngle = randomBetween(0, Math.PI * 2);
      const offsetDistance = getBiasedOffsetDistance(radius, spreadBias);
      const driftAngle = randomBetween(0, Math.PI * 2);
      const driftSpeed = randomBetween(0, drift);

      return {
        id: idRef.current++,
        src: getRandomAsset(),
        x: x + Math.cos(offsetAngle) * offsetDistance,
        y: y + Math.sin(offsetAngle) * offsetDistance,
        vx: options.vx ?? Math.cos(driftAngle) * driftSpeed,
        vy: options.vy ?? Math.sin(driftAngle) * driftSpeed,
        rotation: randomBetween(-12, 12),
        rotateIn: randomBetween(-rotationRange, rotationRange),
        spin: randomBetween(-spinRange, spinRange),
        sizeMix: Math.random(),
        strokeDistance,
        taperOverride: options.taperOverride ?? null,
        age: 0,
        life,
      };
    },
    [drift, life, rotationRange, spinRange, spreadBias],
  );

  const emitBetweenPoints = useCallback(
    (from: Point, to: Point) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 1) return;

      const elapsed = Math.max((to.time - from.time) / 1000, 0.008);
      const speed = distance / elapsed;
      const speedAmount = clamp(speed / speedForMaxThickness, 0, 1);
      const thickness = lerp(minThickness, maxThickness, speedAmount);
      const stampCount = clamp(
        Math.ceil((distance / spacing) * lerp(1, 2.35, speedAmount)),
        1,
        maxStampsPerMove,
      );
      const strokeStartDistance = strokeDistanceRef.current;
      const nextParticles: TrailParticle[] = [];

      for (let stampIndex = 0; stampIndex < stampCount; stampIndex++) {
        const progress =
          stampCount === 1 ? 0.5 : stampIndex / Math.max(stampCount - 1, 1);
        const sizeTaper = stampCount === 1 ? 1 : Math.sin(progress * Math.PI);
        const segmentTaper =
          stampCount === 1
            ? 1
            : lerp(1 - taperStrength, 1, sizeTaper);
        const stampX = lerp(from.x, to.x, progress);
        const stampY = lerp(from.y, to.y, progress);
        const stampStrokeDistance = strokeStartDistance + distance * progress;
        const radius = thickness * segmentTaper;
        const imageCount = Math.max(
          1,
          Math.round(imagesPerStamp * lerp(0.55, 1.2, speedAmount) * segmentTaper),
        );

        for (let imageIndex = 0; imageIndex < imageCount; imageIndex++) {
          nextParticles.push(addParticle(stampX, stampY, radius, stampStrokeDistance));
        }
      }

      strokeDistanceRef.current += distance;
      setCurrentStrokeDistance(strokeDistanceRef.current);
      particlesRef.current = [...particlesRef.current, ...nextParticles].slice(
        -maxImages,
      );
      setParticles(particlesRef.current);
    },
    [
      addParticle,
      imagesPerStamp,
      maxImages,
      maxStampsPerMove,
      maxThickness,
      minThickness,
      spacing,
      speedForMaxThickness,
      taperStrength,
    ],
  );

  const explodeAtPoint = useCallback(
    (point: Point) => {
      const nextParticles = Array.from({ length: explodeCount }, () => {
        const angle = randomBetween(0, Math.PI * 2);
        const speed = explodeForce * randomBetween(0.45, 1.15);

        return addParticle(point.x, point.y, explodeRadius, strokeDistanceRef.current, {
          taperOverride: 1,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
        });
      });
      const pushedParticles = particlesRef.current.map((particle) => {
        if (blastForce <= 0 || blastRadius <= 0) return particle;

        const dx = particle.x - point.x;
        const dy = particle.y - point.y;
        const distance = Math.hypot(dx, dy);

        if (distance > blastRadius) return particle;

        const angle =
          distance > 0.001 ? Math.atan2(dy, dx) : randomBetween(0, Math.PI * 2);
        const falloff = Math.pow(1 - distance / blastRadius, 2);
        const force = blastForce * falloff * randomBetween(0.75, 1.15);

        return {
          ...particle,
          vx: particle.vx + Math.cos(angle) * force,
          vy: particle.vy + Math.sin(angle) * force,
        };
      });

      particlesRef.current = [...pushedParticles, ...nextParticles].slice(-maxImages);
      setParticles(particlesRef.current);
    },
    [
      addParticle,
      blastForce,
      blastRadius,
      explodeCount,
      explodeForce,
      explodeRadius,
      maxImages,
    ],
  );

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = { x: event.clientX, y: event.clientY, time: performance.now() };
    const lastPoint = lastPointRef.current;

    if (lastPoint) {
      emitBetweenPoints(lastPoint, point);
    }

    lastPointRef.current = point;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    explodeAtPoint({
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    });
  };

  const resetPointer = () => {
    lastPointRef.current = null;
    strokeDistanceRef.current = 0;
    setCurrentStrokeDistance(0);
  };

  useEffect(() => {
    let frame = 0;

    const tick = (time: number) => {
      const lastFrame = lastFrameRef.current ?? time;
      const dt = Math.min((time - lastFrame) / 1000, 0.033);
      lastFrameRef.current = time;

      particlesRef.current = particlesRef.current
        .map((particle) => ({
          ...particle,
          age: particle.age + dt,
          x: particle.x + particle.vx * dt,
          y: particle.y + particle.vy * dt,
        }))
        .filter((particle) => particle.age < particle.life);

      setParticles(particlesRef.current);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <Leva collapsed={false} />
      <div
        className="relative h-screen w-screen overflow-hidden bg-[#f4f1e8] text-[#221f1a] select-none"
        onPointerEnter={resetPointer}
        onPointerLeave={resetPointer}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-6 text-center">
          <div className="max-w-md text-balance text-[10px] leading-[0.86] tracking-[0.04em] text-[#221f1a]/30 uppercase">
            Move your mouse to paint a trail
          </div>
        </div>
        <div className="pointer-events-none fixed inset-0 z-30">
          {particles.map((particle) => (
            <TrailImage
              key={particle.id}
              particle={particle}
              startScale={startScale}
              peakScale={peakScale}
              opacityPeak={opacityPeak}
              minSize={minSize}
              maxSize={maxSize}
              currentStrokeDistance={currentStrokeDistance}
              taperLength={taperLength}
              taperEndScale={taperEndScale}
            />
          ))}
        </div>
      </div>
    </>
  );
}
