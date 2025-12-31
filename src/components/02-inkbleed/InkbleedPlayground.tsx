import { useControls } from "leva";

export function InkbleedPlayground() {
  const { blur, threshold } = useControls({
    blur: { value: 2, min: 0, max: 20, step: 0.1 },
    threshold: { value: 0.5, min: 0, max: 1, step: 0.01 },
  });

  // Calculate the slope for the threshold effect
  // Higher slope = sharper threshold transition
  const slope = 100;
  const intercept = -threshold * slope;

  return (
    <div className="w-screen h-screen bg-zinc-50 select-none flex items-center justify-center">
      {/* SVG Filter Definition */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter
            id="inkbleed-filter"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            {/* Blur the text */}
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation={blur}
              result="blur"
            />
            {/* Apply threshold to alpha channel */}
            <feComponentTransfer in="blur" result="threshold">
              <feFuncA type="linear" slope={slope} intercept={intercept} />
            </feComponentTransfer>
            {/* Create solid black fill */}
            <feFlood floodColor="#1c1917" floodOpacity="1" result="black" />
            {/* Use thresholded alpha as mask for the solid black */}
            <feComposite in="black" in2="threshold" operator="in" />
          </filter>
        </defs>
      </svg>

      {/* Main Content */}
      <div
        className="text-center font-serif text-9xl tracking-tighter"
        style={{
          filter: "url(#inkbleed-filter)",
        }}
      >
        granola
      </div>
    </div>
  );
}
