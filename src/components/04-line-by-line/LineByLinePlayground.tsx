import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useControls, Leva, button } from "leva";
import { TEXTS } from "./texts";

// Color presets
const COLOR_PRESETS = {
  sunset: {
    layer1: "#a793dc",
    layer2: "#febe29",
    layer3: "#ff8a0d",
    layer4: "#292929",
    background: "#FCFCF8",
  },
  botanical: {
    layer1: "#FFD4EE",
    layer2: "#B2C248",
    layer3: "#5B6B2B",
    layer4: "#333332",
    background: "#FCFCF8",
  },
};

type ColorPresetName = keyof typeof COLOR_PRESETS;

type AnimateBy = "line" | "word";

// Animation presets
const ANIMATION_PRESETS = {
  typewriter: {
    animateBy: "word" as AnimateBy,
    staggerDelay: 0.01,
    duration: 0.1,
    durationDecay: 0.9,
    layerStagger: 0.05,
  },
  cascade: {
    animateBy: "line" as AnimateBy,
    staggerDelay: 0.05,
    duration: 0.2,
    durationDecay: 1,
    layerStagger: 0.05,
  },
};

type AnimationPresetName = keyof typeof ANIMATION_PRESETS;

// Calculate duration for a layer based on decay factor
// Each layer's duration = baseDuration * decay^layerIndex
// With decay = 1: all layers same duration (linear)
// With decay = 0.5: each layer is half the duration of the previous
function getLayerDuration(
  baseDuration: number,
  layerIndex: number,
  decay: number
): number {
  return baseDuration * Math.pow(decay, layerIndex);
}

interface TextLayerProps {
  lines: string[];
  color: string;
  staggerDelay: number;
  duration: number;
  layerDelay: number;
  animationKey: number;
  animateBy: AnimateBy;
}

function TextLayer({
  lines,
  color,
  staggerDelay,
  duration,
  layerDelay,
  animationKey,
  animateBy,
}: TextLayerProps) {
  const variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  // For word mode, we need to track a global word index across lines
  let globalWordIndex = 0;

  return (
    <div className="max-w-6xl px-8" style={{ gridArea: "1/1" }}>
      <AnimatePresence mode="wait">
        <motion.div key={animationKey} initial="hidden" animate="visible">
          {lines.map((line, lineIndex) => {
            if (animateBy === "line") {
              return (
                <motion.div
                  key={lineIndex}
                  variants={variants}
                  transition={{
                    duration,
                    delay: layerDelay + lineIndex * staggerDelay,
                    ease: "easeOut",
                  }}
                  className={`
                    font-sans text-lg
                    leading-relaxed tracking-tight
                    ${line.trim() === "" ? "h-8" : ""}
                  `}
                  style={{ color }}
                >
                  {line || "\u00A0"}
                </motion.div>
              );
            }

            // Word mode
            const words = line.split(/(\s+)/); // Keep whitespace as separate elements
            if (line.trim() === "") {
              return <div key={lineIndex} className="h-8" />;
            }

            return (
              <div
                key={lineIndex}
                className="font-sans text-lg leading-relaxed tracking-tight"
              >
                {words.map((word, wordIndex) => {
                  // Skip animating whitespace-only segments
                  if (word.match(/^\s+$/)) {
                    return <span key={wordIndex}>{word}</span>;
                  }

                  const currentWordIndex = globalWordIndex;
                  globalWordIndex++;

                  return (
                    <motion.span
                      key={wordIndex}
                      variants={variants}
                      transition={{
                        duration,
                        delay: layerDelay + currentWordIndex * staggerDelay,
                        ease: "easeOut",
                      }}
                      style={{ color, display: "inline-block" }}
                    >
                      {word}
                    </motion.span>
                  );
                })}
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function LineByLinePlayground() {
  const [key, setKey] = useState(0);

  const [
    {
      textChoice,
      animateBy,
      staggerDelay,
      duration,
      durationDecay,
      layerStagger,
    },
    setAnimation,
  ] = useControls(() => ({
    animationPreset: {
      value: "typewriter" as AnimationPresetName,
      options: Object.keys(ANIMATION_PRESETS) as AnimationPresetName[],
      label: "Preset",
      onChange: (value: AnimationPresetName) => {
        const preset = ANIMATION_PRESETS[value];
        setAnimation({
          animateBy: preset.animateBy,
          staggerDelay: preset.staggerDelay,
          duration: preset.duration,
          durationDecay: preset.durationDecay,
          layerStagger: preset.layerStagger,
        });
      },
    },
    textChoice: {
      value: "medium",
      options: ["short", "medium", "long"],
      label: "Text",
    },
    animateBy: {
      value: ANIMATION_PRESETS.typewriter.animateBy,
      options: ["line", "word"] as AnimateBy[],
      label: "Animate By",
    },
    staggerDelay: {
      value: ANIMATION_PRESETS.typewriter.staggerDelay,
      min: 0.01,
      max: 0.5,
      step: 0.01,
      label: "Stagger",
    },
    duration: {
      value: ANIMATION_PRESETS.typewriter.duration,
      min: 0,
      max: 2,
      step: 0.01,
      label: "Duration",
    },
    durationDecay: {
      value: ANIMATION_PRESETS.typewriter.durationDecay,
      min: 0.3,
      max: 1,
      step: 0.05,
      label: "Duration Decay",
    },
    layerStagger: {
      value: ANIMATION_PRESETS.typewriter.layerStagger,
      min: 0,
      max: 1,
      step: 0.01,
      label: "Layer Stagger",
    },
  }));

  const [
    { colorLayer1, colorLayer2, colorLayer3, colorLayer4, colorBackground },
    setColors,
  ] = useControls(
    "Colors",
    () => ({
      preset: {
        value: "sunset" as ColorPresetName,
        options: Object.keys(COLOR_PRESETS) as ColorPresetName[],
        label: "Preset",
        onChange: (value: ColorPresetName) => {
          const colors = COLOR_PRESETS[value];
          setColors({
            colorLayer1: colors.layer1,
            colorLayer2: colors.layer2,
            colorLayer3: colors.layer3,
            colorLayer4: colors.layer4,
            colorBackground: colors.background,
          });
        },
      },
      colorLayer1: { value: COLOR_PRESETS.sunset.layer1, label: "Layer 1" },
      colorLayer2: { value: COLOR_PRESETS.sunset.layer2, label: "Layer 2" },
      colorLayer3: { value: COLOR_PRESETS.sunset.layer3, label: "Layer 3" },
      colorLayer4: { value: COLOR_PRESETS.sunset.layer4, label: "Layer 4" },
      colorBackground: {
        value: COLOR_PRESETS.sunset.background,
        label: "Background",
      },
    }),
    { collapsed: true }
  );

  useControls({
    replay: button(() => setKey((k) => k + 1)),
  });

  const lines = TEXTS[textChoice].split("\n");

  const sharedProps = {
    lines,
    staggerDelay,
    animationKey: key,
    animateBy,
  };

  return (
    <div
      className="w-screen h-screen select-none flex items-center justify-center overflow-y-auto py-16 px-8"
      style={{ backgroundColor: colorBackground }}
    >
      <Leva
        titleBar={{ title: "Line by Line" }}
        theme={{ sizes: { rootWidth: "320px" } }}
      />

      <div
        className="grid"
        key={`${staggerDelay}-${duration}-${durationDecay}-${layerStagger}`}
      >
        <TextLayer
          {...sharedProps}
          color={colorLayer1}
          layerDelay={0}
          duration={getLayerDuration(duration, 0, durationDecay)}
        />
        <TextLayer
          {...sharedProps}
          color={colorLayer2}
          layerDelay={layerStagger}
          duration={getLayerDuration(duration, 1, durationDecay)}
        />
        <TextLayer
          {...sharedProps}
          color={colorLayer3}
          layerDelay={layerStagger * 2}
          duration={getLayerDuration(duration, 2, durationDecay)}
        />
        <TextLayer
          {...sharedProps}
          color={colorLayer4}
          layerDelay={layerStagger * 3}
          duration={getLayerDuration(duration, 3, durationDecay)}
        />
      </div>
    </div>
  );
}
