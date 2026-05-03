import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "motion/react";
import { Leva, useControls } from "leva";

type Particle = {
  id: number;
  src: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  age: number;
  life: number;
};

type ShakeMode = "kick" | "wobble" | "earthquake";
type TextAlignment = "left" | "center" | "right";

const assetModules = import.meta.glob("./assets/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const ASSET_URLS = Object.values(assetModules) as string[];
const MAX_PARTICLES = 450;
const DEFAULT_ORIGIN = { x: 0, y: 0 };
const FADE_OUT_DURATION = 0.1;
const TYPING_FONT_FAMILY = '"Quadrant Notepad", serif';
const TYPING_TEXT_CLASS =
  "min-h-[32vh] w-full whitespace-pre-wrap break-words border-none bg-transparent font-serif leading-[0.9] tracking-[-0.02em] outline-none";

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function isTypableKey(event: React.KeyboardEvent<HTMLDivElement>) {
  return (
    event.key.length === 1 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey
  );
}

function getCaretOrigin(editor: HTMLDivElement | null) {
  const selection = window.getSelection();

  if (!editor || !selection || selection.rangeCount === 0) {
    return DEFAULT_ORIGIN;
  }

  const range = selection.getRangeAt(0).cloneRange();
  const rects = range.getClientRects();
  const rect = rects[rects.length - 1] ?? range.getBoundingClientRect();

  if (rect.width > 0 || rect.height > 0) {
    return { x: rect.right, y: rect.top + rect.height / 2 };
  }

  const editorRect = editor.getBoundingClientRect();
  return {
    x: editorRect.left + editorRect.width / 2,
    y: editorRect.top + editorRect.height / 2,
  };
}

function makeParticles(
  origin: { x: number; y: number },
  count: number,
  force: number,
  spread: number,
  minSize: number,
  maxSize: number,
  life: number,
) {
  return Array.from({ length: count }, (_, index) => {
    const angle =
      -Math.PI / 2 + randomBetween(-spread / 2, spread / 2) * (Math.PI / 180);
    const speed = force * randomBetween(0.45, 1.25);
    const src = ASSET_URLS[Math.floor(Math.random() * ASSET_URLS.length)];

    return {
      id: Date.now() + index + Math.random(),
      src,
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed + randomBetween(-force * 0.25, force * 0.25),
      vy: Math.sin(angle) * speed + randomBetween(-force * 0.25, force * 0.15),
      rotation: randomBetween(-35, 35),
      rotationSpeed: randomBetween(-420, 420),
      size: randomBetween(minSize, maxSize),
      age: 0,
      life,
    };
  });
}

function TypingParticle({ particle }: { particle: Particle }) {
  const timeLeft = particle.life - particle.age;
  const opacity =
    timeLeft > FADE_OUT_DURATION ? 1 : Math.max(0, timeLeft / FADE_OUT_DURATION);

  return (
    <img
      src={particle.src}
      alt=""
      className="pointer-events-none fixed left-0 top-0 z-20 select-none object-contain"
      style={{
        width: particle.size,
        height: particle.size,
        opacity,
        transform: `translate3d(${particle.x}px, ${particle.y}px, 0) translate(-50%, -50%) rotate(${particle.rotation}deg)`,
      }}
    />
  );
}

export function TypingDemo() {
  const editorRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number | null>(null);
  const controls = useAnimationControls();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [text, setText] = useState("");

  const [{
    count,
    gravity,
    force,
    spread,
    damping,
    minSize,
    maxSize,
    life,
  }] = useControls("Explosion", () => ({
    count: { value: 4, min: 1, max: 48, step: 1, label: "Count" },
    force: { value: 410, min: 80, max: 1800, step: 10, label: "Force" },
    spread: { value: 67, min: 10, max: 360, step: 1, label: "Spread" },
    gravity: { value: 1550, min: 0, max: 3600, step: 25, label: "Gravity" },
    damping: { value: 0.98, min: 0.9, max: 1, step: 0.001, label: "Damping" },
    life: { value: 4, min: 0.25, max: 4, step: 0.05, label: "Life (s)" },
    minSize: { value: 30, min: 12, max: 120, step: 1, label: "Min Size" },
    maxSize: { value: 70, min: 12, max: 180, step: 1, label: "Max Size" },
  }));

  const [{
    shakeMode,
    shakeIntensity,
    shakeRotation,
    shakeDuration,
  }] = useControls("Shake", () => ({
    shakeMode: {
      value: "wobble" as ShakeMode,
      options: ["kick", "wobble", "earthquake"] as ShakeMode[],
      label: "Type",
    },
    shakeIntensity: { value: 2, min: 0, max: 42, step: 1, label: "Intensity" },
    shakeRotation: { value: 0.7, min: 0, max: 8, step: 0.1, label: "Rotation" },
    shakeDuration: { value: 0.1, min: 0.05, max: 0.8, step: 0.01, label: "Duration" },
  }));

  const [{ fontSize, textAlign }] = useControls("Typography", () => ({
    fontSize: { value: 52, min: 48, max: 240, step: 1, label: "Font Size" },
    textAlign: {
      value: "left" as TextAlignment,
      options: ["left", "center", "right"] as TextAlignment[],
      label: "Text Align",
    },
  }));

  const triggerShake = useCallback(() => {
    if (shakeIntensity <= 0) return;

    const xSign = Math.random() > 0.5 ? 1 : -1;
    const ySign = Math.random() > 0.5 ? 1 : -1;
    const rotationSign = Math.random() > 0.5 ? 1 : -1;
    const common = {
      duration: shakeDuration,
      ease: "easeOut" as const,
    };

    if (shakeMode === "kick") {
      controls.start({
        x: [0, xSign * shakeIntensity, 0],
        y: [0, ySign * shakeIntensity * 0.3, 0],
        rotate: [0, rotationSign * shakeRotation, 0],
        transition: common,
      });
      return;
    }

    if (shakeMode === "earthquake") {
      controls.start({
        x: [
          0,
          xSign * shakeIntensity,
          -xSign * shakeIntensity * 0.8,
          xSign * shakeIntensity * 0.55,
          0,
        ],
        y: [
          0,
          ySign * shakeIntensity * 0.55,
          -ySign * shakeIntensity * 0.45,
          ySign * shakeIntensity * 0.35,
          0,
        ],
        rotate: [
          0,
          rotationSign * shakeRotation,
          -rotationSign * shakeRotation,
          rotationSign * shakeRotation * 0.35,
          0,
        ],
        transition: common,
      });
      return;
    }

    controls.start({
      x: [0, xSign * shakeIntensity, -xSign * shakeIntensity * 0.45, 0],
      y: [0, ySign * shakeIntensity * 0.35, -ySign * shakeIntensity * 0.25, 0],
      rotate: [0, rotationSign * shakeRotation, -rotationSign * shakeRotation * 0.5, 0],
      transition: common,
    });
  }, [controls, shakeDuration, shakeIntensity, shakeMode, shakeRotation]);

  const explode = useCallback(() => {
    const origin = getCaretOrigin(editorRef.current);
    const minParticleSize = Math.min(minSize, maxSize);
    const maxParticleSize = Math.max(minSize, maxSize);
    const nextParticles = makeParticles(
      origin,
      count,
      force,
      spread,
      minParticleSize,
      maxParticleSize,
      life,
    );

    particlesRef.current = [...particlesRef.current, ...nextParticles].slice(
      -MAX_PARTICLES,
    );
    setParticles(particlesRef.current);
    triggerShake();
  }, [count, force, life, maxSize, minSize, spread, triggerShake]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isTypableKey(event) && event.key !== "Backspace" && event.key !== "Enter") {
      return;
    }

    requestAnimationFrame(explode);
  };

  const handleInput = () => {
    setText(editorRef.current?.innerText ?? "");
  };

  useEffect(() => {
    let frame = 0;

    const tick = (time: number) => {
      const lastTime = lastTimeRef.current ?? time;
      const dt = Math.min((time - lastTime) / 1000, 0.033);
      lastTimeRef.current = time;

      particlesRef.current = particlesRef.current
        .map((particle) => {
          const nextVy = particle.vy + gravity * dt;
          const dampingFactor = Math.pow(damping, dt * 60);

          return {
            ...particle,
            age: particle.age + dt,
            x: particle.x + particle.vx * dt,
            y: particle.y + nextVy * dt,
            vx: particle.vx * dampingFactor,
            vy: nextVy * dampingFactor,
            rotation: particle.rotation + particle.rotationSpeed * dt,
          };
        })
        .filter((particle) => particle.age < particle.life);

      setParticles(particlesRef.current);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [damping, gravity]);

  useEffect(() => {
    editorRef.current?.focus();
  }, []);

  const hasText = text.trim().length > 0;
  const typingTextStyle = {
    fontFamily: TYPING_FONT_FAMILY,
    fontSize,
    textAlign,
  };

  return (
    <>
      <Leva collapsed={false} />
      <motion.div
        animate={controls}
        className="relative h-screen w-screen overflow-hidden bg-[#f4f1e8] text-[#221f1a]"
      >
        <main className="flex h-full w-full items-center justify-center px-6">
          <div className="relative mx-auto w-full max-w-[600px]">
            {!hasText && (
              <div
                className={`pointer-events-none absolute inset-0 text-black/20 ${TYPING_TEXT_CLASS}`}
                style={typingTextStyle}
              >
                {/* <span>Hey</span> */}
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              className={`relative z-10 cursor-text text-[#221f1a] ${TYPING_TEXT_CLASS}`}
              style={typingTextStyle}
              aria-label="Typing explosion area"
            />
          </div>
        </main>
        <div className="pointer-events-none fixed inset-0 z-30">
          {particles.map((particle) => (
            <TypingParticle key={particle.id} particle={particle} />
          ))}
        </div>
      </motion.div>
    </>
  );
}
