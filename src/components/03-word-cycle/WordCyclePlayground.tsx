import { useState, useEffect, useId, forwardRef, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  animate,
  useIsPresent,
} from "motion/react";
import { useControls, Leva } from "leva";

const CYCLING_WORDS = ["Dream.", "Build.", "Ship.", "Repeat."];

// Word Filter defaults
const DEFAULT_WORD_ENTER_BLUR_START = 7;
const DEFAULT_WORD_ENTER_THRESHOLD_START = 1;
const DEFAULT_WORD_BLUR_MIDDLE = 0; // shared: enter end & exit start
const DEFAULT_WORD_THRESHOLD_MIDDLE = 0; // shared: enter end & exit start
const DEFAULT_WORD_EXIT_BLUR_END = 10;
const DEFAULT_WORD_EXIT_THRESHOLD_END = 1;

// Container Filter defaults
const DEFAULT_CONTAINER_BLUR_START = 2;
const DEFAULT_CONTAINER_BLUR_PEAK = 8;
const DEFAULT_CONTAINER_BLUR_END = 2;
const DEFAULT_CONTAINER_THRESHOLD_START = 0.1;
const DEFAULT_CONTAINER_THRESHOLD_PEAK = 0.4;
const DEFAULT_CONTAINER_THRESHOLD_END = 0.1;

// Timing defaults (all in seconds)
const DEFAULT_CYCLE_INTERVAL = 2;
const DEFAULT_WORD_DURATION = 1.8;
const DEFAULT_CONTAINER_DURATION = 1.4;
const DEFAULT_STAGGER = 0.05;

// Layer colors
const DEFAULT_COLOR_LAYER_1 = "#a793dc";
const DEFAULT_COLOR_LAYER_2 = "#febe29";
const DEFAULT_COLOR_LAYER_3 = "#ff8a0d";
const DEFAULT_COLOR_LAYER_4 = "#292929";
const DEFAULT_COLOR_BACKGROUND = "#E9EBE5";

interface AnimatedWordProps {
  word: string;
  color: string;
  // Enter animation
  enterBlurStart: number;
  enterBlurEnd: number;
  enterThresholdStart: number;
  enterThresholdEnd: number;
  // Exit animation
  exitBlurStart: number;
  exitBlurEnd: number;
  exitThresholdStart: number;
  exitThresholdEnd: number;
  duration: number;
  exitDuration: number;
  filterEnabled: boolean;
}

// Individual word with its own blur + threshold filter
const AnimatedWord = forwardRef<HTMLDivElement, AnimatedWordProps>(
  function AnimatedWord(
    {
      word,
      color,
      enterBlurStart,
      enterBlurEnd,
      enterThresholdStart,
      enterThresholdEnd,
      exitBlurStart,
      exitBlurEnd,
      exitThresholdStart,
      exitThresholdEnd,
      duration,
      exitDuration,
      filterEnabled,
    },
    ref
  ) {
    const id = useId();
    const filterId = `word-filter-${id}`;
    const isPresent = useIsPresent();
    const hasAnimatedIn = useRef(false);

    // Entering word: blur starts at enterBlurStart, threshold starts at enterThresholdStart
    // Exiting word: blur goes from exitBlurStart to exitBlurEnd
    const [blur, setBlur] = useState(enterBlurStart);
    const [threshold, setThreshold] = useState(enterThresholdStart);

    const blurValue = useMotionValue(enterBlurStart);
    const thresholdValue = useMotionValue(enterThresholdStart);

    useEffect(() => {
      return blurValue.on("change", (v) => setBlur(v));
    }, [blurValue]);

    useEffect(() => {
      return thresholdValue.on("change", (v) => setThreshold(v));
    }, [thresholdValue]);

    // Animate based on presence
    useEffect(() => {
      if (isPresent && !hasAnimatedIn.current) {
        // Entering: blur from enterBlurStart to enterBlurEnd
        hasAnimatedIn.current = true;
        animate(blurValue, enterBlurEnd, {
          duration: duration,
          ease: [0.25, 0.1, 0.25, 1],
        });
        animate(thresholdValue, enterThresholdEnd, {
          duration: duration,
          ease: [0.25, 0.1, 0.25, 1],
        });
      } else if (!isPresent) {
        // Exiting: blur from exitBlurStart to exitBlurEnd
        blurValue.set(exitBlurStart);
        thresholdValue.set(exitThresholdStart);
        animate(blurValue, exitBlurEnd, {
          duration: exitDuration,
          ease: [0.25, 0.1, 0.25, 1],
        });
        animate(thresholdValue, exitThresholdEnd, {
          duration: exitDuration,
          ease: [0.25, 0.1, 0.25, 1],
        });
      }
    }, [
      isPresent,
      blurValue,
      thresholdValue,
      enterBlurStart,
      enterBlurEnd,
      enterThresholdStart,
      enterThresholdEnd,
      exitBlurStart,
      exitBlurEnd,
      exitThresholdStart,
      exitThresholdEnd,
      duration,
      exitDuration,
    ]);

    const slope = 100;
    const intercept = -threshold * slope;

    return (
      <motion.div
        ref={ref}
        className="text-center w-full absolute inset-0 flex items-center justify-center"
        style={filterEnabled ? { filter: `url(#${filterId})` } : undefined}
        // Need exit prop with actual animation to keep element present during exit
        exit={{ opacity: 0.99, transition: { duration: exitDuration } }}
      >
        {/* SVG Filter for this individual word */}
        {filterEnabled && (
          <svg width="0" height="0" style={{ position: "absolute" }}>
            <defs>
              <filter
                id={filterId}
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation={blur}
                  result="blur"
                />
                <feComponentTransfer in="blur" result="threshold">
                  <feFuncA type="linear" slope={slope} intercept={intercept} />
                </feComponentTransfer>
                <feFlood floodColor={color} floodOpacity="1" result="black" />
                <feComposite in="black" in2="threshold" operator="in" />
              </filter>
            </defs>
          </svg>
        )}
        {word}
      </motion.div>
    );
  }
);

interface WordCycleLayerProps {
  delay: number;
  color: string;
  // Word filter props
  wordFilterEnabled: boolean;
  enterBlurStart: number;
  middleBlur: number;
  enterThresholdStart: number;
  middleThreshold: number;
  exitBlurEnd: number;
  exitThresholdEnd: number;
  // Container filter props
  containerFilterEnabled: boolean;
  containerBlurStart: number;
  containerBlurPeak: number;
  containerBlurEnd: number;
  containerThresholdStart: number;
  containerThresholdPeak: number;
  containerThresholdEnd: number;
  // Timing
  wordDuration: number;
  containerDuration: number;
  cycleInterval: number;
}

function WordCycleLayer({
  delay,
  color,
  wordFilterEnabled,
  enterBlurStart,
  middleBlur,
  enterThresholdStart,
  middleThreshold,
  exitBlurEnd,
  exitThresholdEnd,
  containerFilterEnabled,
  containerBlurStart,
  containerBlurPeak,
  containerBlurEnd,
  containerThresholdStart,
  containerThresholdPeak,
  containerThresholdEnd,
  wordDuration,
  containerDuration,
  cycleInterval,
}: WordCycleLayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [keyCounter, setKeyCounter] = useState(0);
  const [started, setStarted] = useState(false);
  const containerId = useId();
  const containerFilterId = `container-filter-${containerId}`;
  const prevIndex = useRef(currentIndex);

  // Container filter state
  const [containerThreshold, setContainerThreshold] = useState(
    containerThresholdStart
  );
  const [containerBlur, setContainerBlur] = useState(containerBlurStart);
  const containerThresholdValue = useMotionValue(containerThresholdStart);
  const containerBlurValue = useMotionValue(containerBlurStart);

  useEffect(() => {
    return containerThresholdValue.on("change", (v) =>
      setContainerThreshold(v)
    );
  }, [containerThresholdValue]);

  useEffect(() => {
    return containerBlurValue.on("change", (v) => setContainerBlur(v));
  }, [containerBlurValue]);

  // Start after delay
  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  // Animate container filter when index changes
  useEffect(() => {
    if (prevIndex.current !== currentIndex) {
      // Threshold: start -> peak -> end
      animate(
        containerThresholdValue,
        [
          containerThresholdStart,
          containerThresholdPeak,
          containerThresholdEnd,
        ],
        {
          duration: containerDuration,
          ease: "easeInOut",
        }
      );
      // Blur: start -> peak -> end
      animate(
        containerBlurValue,
        [containerBlurStart, containerBlurPeak, containerBlurEnd],
        {
          duration: containerDuration,
          ease: "easeInOut",
        }
      );
      prevIndex.current = currentIndex;
    }
  }, [
    currentIndex,
    containerDuration,
    containerThresholdValue,
    containerBlurValue,
    containerThresholdStart,
    containerThresholdPeak,
    containerThresholdEnd,
    containerBlurStart,
    containerBlurPeak,
    containerBlurEnd,
  ]);

  useEffect(() => {
    if (!started) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CYCLING_WORDS.length);
      setKeyCounter((prev) => prev + 1);
    }, cycleInterval * 1000);

    return () => clearInterval(interval);
  }, [cycleInterval, started]);

  const containerSlope = 100;
  const containerIntercept = -containerThreshold * containerSlope;

  // When the cycle interval is shorter than the word duration, finish the exit
  // animation exactly at the end of the word duration so words don't linger.
  const wordExitDuration =
    cycleInterval < wordDuration
      ? Math.max(wordDuration - cycleInterval, 0.01)
      : wordDuration;

  if (!started) return null;

  return (
    <div className="w-full h-full" style={{ gridArea: "1/1" }}>
      {/* Container SVG Filter - blends the two words together */}
      {containerFilterEnabled && (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <filter
              id={containerFilterId}
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation={containerBlur}
                result="blur"
              />
              <feComponentTransfer in="blur" result="threshold">
                <feFuncA
                  type="linear"
                  slope={containerSlope}
                  intercept={containerIntercept}
                />
              </feComponentTransfer>
              <feFlood floodColor={color} floodOpacity="1" result="black" />
              <feComposite in="black" in2="threshold" operator="in" />
            </filter>
          </defs>
        </svg>
      )}

      <div
        className="w-full h-40 text-center font-serif font-light text-[200px] tracking-tighter relative"
        style={
          containerFilterEnabled
            ? { filter: `url(#${containerFilterId})` }
            : undefined
        }
      >
        <AnimatePresence mode="popLayout">
          <AnimatedWord
            key={keyCounter}
            word={CYCLING_WORDS[currentIndex]}
            color={color}
            enterBlurStart={enterBlurStart}
            enterBlurEnd={middleBlur}
            enterThresholdStart={enterThresholdStart}
            enterThresholdEnd={middleThreshold}
            exitBlurStart={middleBlur}
            exitBlurEnd={exitBlurEnd}
            exitThresholdStart={middleThreshold}
            exitThresholdEnd={exitThresholdEnd}
            duration={wordDuration}
            exitDuration={wordExitDuration}
            filterEnabled={wordFilterEnabled}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}

export function WordCyclePlayground() {
  // Word filter controls
  const { wordFilterEnabled } = useControls("Word Filter", {
    wordFilterEnabled: { value: true, label: "Enabled" },
  });

  // Word Enter controls
  const { enterBlurStart, enterThresholdStart } = useControls(
    "Word Filter.Enter",
    {
      enterBlurStart: {
        value: DEFAULT_WORD_ENTER_BLUR_START,
        min: 0,
        max: 30,
        step: 1,
        label: "Blur Start",
      },
      enterThresholdStart: {
        value: DEFAULT_WORD_ENTER_THRESHOLD_START,
        min: 0,
        max: 1,
        step: 0.01,
        label: "Threshold Start",
      },
    }
  );

  // Shared middle point (enter end = exit start)
  const { middleBlur, middleThreshold } = useControls("Word Filter.Middle", {
    middleBlur: {
      value: DEFAULT_WORD_BLUR_MIDDLE,
      min: 0,
      max: 30,
      step: 1,
      label: "Blur",
    },
    middleThreshold: {
      value: DEFAULT_WORD_THRESHOLD_MIDDLE,
      min: 0,
      max: 1,
      step: 0.01,
      label: "Threshold",
    },
  });

  // Word Exit controls
  const { exitBlurEnd, exitThresholdEnd } = useControls("Word Filter.Exit", {
    exitBlurEnd: {
      value: DEFAULT_WORD_EXIT_BLUR_END,
      min: 0,
      max: 30,
      step: 1,
      label: "Blur End",
    },
    exitThresholdEnd: {
      value: DEFAULT_WORD_EXIT_THRESHOLD_END,
      min: 0,
      max: 1,
      step: 0.01,
      label: "Threshold End",
    },
  });

  // Container filter controls
  const {
    containerFilterEnabled,
    containerBlurStart,
    containerBlurPeak,
    containerBlurEnd,
    containerThresholdStart,
    containerThresholdPeak,
    containerThresholdEnd,
  } = useControls("Container Filter", {
    containerFilterEnabled: { value: true, label: "Enabled" },
    containerBlurStart: {
      value: DEFAULT_CONTAINER_BLUR_START,
      min: 0,
      max: 30,
      step: 1,
    },
    containerBlurPeak: {
      value: DEFAULT_CONTAINER_BLUR_PEAK,
      min: 0,
      max: 30,
      step: 1,
    },
    containerBlurEnd: {
      value: DEFAULT_CONTAINER_BLUR_END,
      min: 0,
      max: 30,
      step: 1,
    },
    containerThresholdStart: {
      value: DEFAULT_CONTAINER_THRESHOLD_START,
      min: 0,
      max: 1,
      step: 0.01,
    },
    containerThresholdPeak: {
      value: DEFAULT_CONTAINER_THRESHOLD_PEAK,
      min: 0,
      max: 1,
      step: 0.01,
    },
    containerThresholdEnd: {
      value: DEFAULT_CONTAINER_THRESHOLD_END,
      min: 0,
      max: 1,
      step: 0.01,
    },
  });

  // Timing controls
  const { wordDuration, containerDuration, cycleInterval, stagger } =
    useControls("Timing", {
      cycleInterval: {
        value: DEFAULT_CYCLE_INTERVAL,
        min: 0.5,
        max: 4,
        step: 0.1,
      },
      wordDuration: {
        value: DEFAULT_WORD_DURATION,
        min: 0.1,
        max: 4,
        step: 0.1,
      },
      containerDuration: {
        value: DEFAULT_CONTAINER_DURATION,
        min: 0.1,
        max: 4,
        step: 0.1,
      },
      stagger: {
        value: DEFAULT_STAGGER,
        min: 0,
        max: 1,
        step: 0.01,
        label: "Stagger",
      },
    });

  // Color controls
  const {
    colorLayer1,
    colorLayer2,
    colorLayer3,
    colorLayer4,
    colorBackground,
  } = useControls("Colors", {
    colorLayer1: { value: DEFAULT_COLOR_LAYER_1, label: "Layer 1" },
    colorLayer2: { value: DEFAULT_COLOR_LAYER_2, label: "Layer 2" },
    colorLayer3: { value: DEFAULT_COLOR_LAYER_3, label: "Layer 3" },
    colorLayer4: { value: DEFAULT_COLOR_LAYER_4, label: "Layer 4" },
    colorBackground: { value: DEFAULT_COLOR_BACKGROUND, label: "Background" },
  });

  const sharedProps = {
    wordFilterEnabled,
    enterBlurStart,
    middleBlur,
    enterThresholdStart,
    middleThreshold,
    exitBlurEnd,
    exitThresholdEnd,
    containerFilterEnabled,
    containerBlurStart,
    containerBlurPeak,
    containerBlurEnd,
    containerThresholdStart,
    containerThresholdPeak,
    containerThresholdEnd,
    wordDuration,
    containerDuration,
    cycleInterval,
  };

  return (
    <div
      className="w-screen h-screen select-none flex items-center justify-center"
      style={{ backgroundColor: colorBackground }}
    >
      <Leva
        titleBar={{ title: "Word Cycle" }}
        theme={{ sizes: { rootWidth: "400px" } }}
        collapsed
      />
      <div className="grid w-full h-40" key={stagger}>
        <WordCycleLayer delay={0} color={colorLayer1} {...sharedProps} />
        <WordCycleLayer
          delay={stagger * 1000}
          color={colorLayer2}
          {...sharedProps}
        />
        <WordCycleLayer
          delay={stagger * 2000}
          color={colorLayer3}
          {...sharedProps}
        />
        <WordCycleLayer
          delay={stagger * 3000}
          color={colorLayer4}
          {...sharedProps}
        />
      </div>
    </div>
  );
}
