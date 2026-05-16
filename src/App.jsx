import { lazy, Suspense, useState } from "react";
import { motion } from "framer-motion";
import { Atom, Beaker, CircuitBoard, Home, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TrigDerivativeVisualizer = lazy(() => import("./visualizations/TrigDerivativeVisualizer"));
const CircleTangentVisualization = lazy(() => import("./visualizations/CircleTangentVisualization"));

const visualizations = [
  {
    id: "trig",
    title: "Trig Derivative Visualizer",
    summary: "Connect unit-circle motion to sin, cos, tan, and their derivatives.",
    icon: Sigma,
    component: TrigDerivativeVisualizer,
    tag: "Math",
  },
  {
    id: "circle",
    title: "3D Circle Tangent Visualization",
    summary: "Explore tangent direction, vectors, and geometry on a rotating 3D scene.",
    icon: Atom,
    component: CircleTangentVisualization,
    tag: "Physics",
  },
];

export default function App() {
  const [active, setActive] = useState("home");
  const selected = visualizations.find((item) => item.id === active);
  const ActiveComponent = selected?.component;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700">VizLab</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Interactive visual explanations for math, physics, and chemistry.
              </h1>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActive("home")}>
              <Home className="mr-2 h-4 w-4" />
              Gallery
            </Button>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            VizLab is built as a static GitHub Pages app. Each visualization is a self-contained React module that can be launched from the gallery.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {active === "home" ? (
          <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="grid gap-4 md:grid-cols-2">
              {visualizations.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.id} className="overflow-hidden border-slate-200/80 bg-white/90 shadow-soft">
                    <CardContent className="p-0">
                      <div className="flex h-full flex-col justify-between gap-4 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                              {item.tag}
                            </div>
                            <h2 className="mt-3 text-xl font-semibold text-slate-950">{item.title}</h2>
                            <p className="mt-2 max-w-prose text-sm leading-6 text-slate-600">{item.summary}</p>
                          </div>
                          <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                            <Icon className="h-6 w-6" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Open on GitHub Pages</div>
                          <Button onClick={() => setActive(item.id)}>Launch</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <section className="mt-8 grid gap-4 md:grid-cols-3">
              <Card className="border-slate-200/80 bg-white/80">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <CircuitBoard className="h-4 w-4 text-cyan-700" />
                    Static hosting
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Built for deploys to `gh-pages` from the `dist` output.</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 bg-white/80">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Beaker className="h-4 w-4 text-cyan-700" />
                    Modular layout
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Each visualization lives under `src/visualizations` with reusable UI components.</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/80 bg-white/80">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Atom className="h-4 w-4 text-cyan-700" />
                    Expandable
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Add more math, physics, or chemistry modules without changing the deployment model.</p>
                </CardContent>
              </Card>
            </section>
          </motion.section>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">{selected?.tag}</div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{selected?.title}</h2>
              </div>
              <Button variant="outline" onClick={() => setActive("home")}>Back to gallery</Button>
            </div>
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft">
              <Suspense
                fallback={
                  <div className="flex min-h-[40vh] items-center justify-center px-6 py-16 text-sm text-slate-500">
                    Loading visualization...
                  </div>
                }
              >
                {ActiveComponent ? <ActiveComponent /> : null}
              </Suspense>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
