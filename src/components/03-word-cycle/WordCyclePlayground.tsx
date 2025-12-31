import { useState, useEffect, useId, forwardRef, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
  useIsPresent,
} from "motion/react";
import { useControls } from "leva";

const CYCLING_WORDS = [
  "Granola",
  "Innovation",
  "Creativity",
  "Excellence",
  "Discovery",
  "Adventure",
  "Tomorrow",
];

interface AnimatedWordProps {
  word: string;
  blurAmount: number;
  threshold: number;
  duration: number;
}

const AnimatedWord = forwardRef<HTMLSpanElement, AnimatedWordProps>(
  function AnimatedWord({ word, blurAmount, threshold, duration }, ref) {
    const id = useId();
    const filterId = `inkbleed-filter-${id}`;
    const [blur, setBlur] = useState(blurAmount);
    const isPresent = useIsPresent();
    const hasAnimatedIn = useRef(false);

    const blurValue = useMotionValue(blurAmount);

    // Calculate the slope for the threshold effect
    const slope = 100;
    const intercept = -(threshold * slope) + 0.5 * slope;

    useEffect(() => {
      return blurValue.on("change", (v) => setBlur(v));
    }, [blurValue]);

    // Animate blur based on presence
    useEffect(() => {
      if (isPresent && !hasAnimatedIn.current) {
        // Entering: blur from blurAmount to 0
        hasAnimatedIn.current = true;
        animate(blurValue, 0, {
          duration: duration,
          ease: [0.25, 0.1, 0.25, 1],
        });
      } else if (!isPresent) {
        // Exiting: blur from 0 to blurAmount
        animate(blurValue, blurAmount, {
          duration: duration,
          ease: [0.25, 0.1, 0.25, 1],
        });
      }
    }, [isPresent, blurValue, blurAmount, duration]);

    return (
      <motion.div
        ref={ref}
        className="text-center w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{
          opacity: 0,
        }}
        transition={{
          duration: duration,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        style={{ filter: `url(#${filterId})` }}
      >
        {/* SVG Filter for this specific word */}
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation={blur}
                result="blur"
              />
              <feComponentTransfer in="blur" result="threshold">
                <feFuncA type="linear" slope={slope} intercept={intercept} />
              </feComponentTransfer>
              <feFlood floodColor="#1c1917" floodOpacity="1" result="black" />
              <feComposite in="black" in2="threshold" operator="in" />
            </filter>
          </defs>
        </svg>
        {word}
      </motion.div>
    );
  }
);

export function WordCyclePlayground() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { duration, blurAmount, threshold } = useControls({
    duration: { value: 0.6, min: 0.2, max: 2, step: 0.1 },
    blurAmount: { value: 8, min: 0, max: 20, step: 1 },
    threshold: { value: 0.8, min: 0.5, max: 1, step: 0.01 },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CYCLING_WORDS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-screen h-screen bg-zinc-50 select-none flex items-center justify-center">
      <div className="w-full text-center font-serif text-9xl tracking-tighter relative">
        <AnimatePresence mode="popLayout">
          <AnimatedWord
            key={currentIndex}
            word={CYCLING_WORDS[currentIndex]}
            blurAmount={blurAmount}
            threshold={threshold}
            duration={duration}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}
