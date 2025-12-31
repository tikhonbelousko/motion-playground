import { useState } from "react";
import { UseMeasurePlaygroud } from "./components/01-transcription-sheet/UseMeasurePlaygroud";
import { LayoutIdPlayground } from "./components/01-transcription-sheet/LayoutIdPlayground";
import { InkbleedPlayground } from "./components/02-inkbleed/InkbleedPlayground";
import { WordCyclePlayground } from "./components/03-word-cycle/WordCyclePlayground";

const demos = [
  { id: "word-cycle", name: "Word Cycle", component: WordCyclePlayground },
  { id: "inkbleed", name: "Inkbleed", component: InkbleedPlayground },
  {
    id: "use-measure",
    name: "Transcription Sheet",
    component: UseMeasurePlaygroud,
  },
  { id: "layout-id", name: "Layout ID", component: LayoutIdPlayground },
];

type DemoId = (typeof demos)[number]["id"];

function App() {
  const [activeDemo, setActiveDemo] = useState<DemoId>("word-cycle");
  const ActiveComponent =
    demos.find((d) => d.id === activeDemo)?.component ?? demos[0].component;

  return (
    <>
      <div className="fixed top-4 left-4 z-50">
        <select
          value={activeDemo}
          onChange={(e) => setActiveDemo(e.target.value as DemoId)}
        >
          {demos.map((demo) => (
            <option key={demo.id} value={demo.id}>
              {demo.name}
            </option>
          ))}
        </select>
      </div>
      <ActiveComponent />
    </>
  );
}

export default App;
