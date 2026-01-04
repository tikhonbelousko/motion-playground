import { Route, Switch, Redirect, useLocation } from "wouter";
import { UseMeasureDemo } from "./components/02-transcription-sheet/UseMeasureDemo";
import { ShadowDistortionDemo } from "./components/01-shadow-distortion/ShadowDistortionDemo";
import { InkbleedDemo } from "./components/03-inkbleed/InkbleedDemo";
import { MorphingTextDemo } from "./components/04-morphing-text/MorphingTextDemo";
import { StaggeredRevealDemo } from "./components/05-staggered-reveal/StaggeredRevealDemo";

const demos = [
  {
    id: "staggered-reveal",
    name: "Staggered Reveal",
    component: StaggeredRevealDemo,
  },
  {
    id: "morphing-text",
    name: "Morphing Text",
    component: MorphingTextDemo,
  },
  { id: "inkbleed", name: "Inkbleed", component: InkbleedDemo },
  {
    id: "use-measure",
    name: "Transcription Sheet",
    component: UseMeasureDemo,
  },
  {
    id: "shadow-distortion",
    name: "Shadow Distortion",
    component: ShadowDistortionDemo,
  },
];

function DemoNav() {
  const [location, setLocation] = useLocation();
  const currentDemo = location.replace("/", "") || demos[0].id;

  return (
    <div className="fixed top-4 left-4 z-50">
      <select
        value={currentDemo}
        onChange={(e) => setLocation(`/${e.target.value}`)}
      >
        {demos.map((demo) => (
          <option key={demo.id} value={demo.id}>
            {demo.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function App() {
  return (
    <>
      <DemoNav />
      <Switch>
        {demos.map((demo) => (
          <Route
            key={demo.id}
            path={`/${demo.id}`}
            component={demo.component}
          />
        ))}
        {/* Redirect root and 404 to first demo */}
        <Route path="/">
          <Redirect to={`/${demos[demos.length - 1].id}`} />
        </Route>
        <Route>
          <Redirect to={`/${demos[demos.length - 1].id}`} />
        </Route>
      </Switch>
    </>
  );
}

export default App;
