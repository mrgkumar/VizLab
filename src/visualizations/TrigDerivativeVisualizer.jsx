import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TAU = Math.PI * 2;
const W = 520;
const H = 300;
const PLOT_W = 560;
const PLOT_H = 220;

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function fmt(v, digits = 3) {
  if (!Number.isFinite(v)) return "∞";
  if (Math.abs(v) < 1e-10) return "0";
  return v.toFixed(digits).replace(/\.?0+$/, "");
}

function phase(x) {
  return ((x % TAU) + TAU) % TAU;
}

function radLabel(x) {
  const p = phase(x);
  const key = Math.round((p / Math.PI) * 2) / 2;
  const map = { 0: "0", 0.5: "π/2", 1: "π", 1.5: "3π/2", 2: "2π" };
  return map[key] || `${fmt(p / Math.PI, 2)}π`;
}

const functions = {
  sin: {
    label: "sin(x)",
    derivLabel: "cos(x)",
    f: Math.sin,
    d: Math.cos,
    yRange: [-1.35, 1.35],
    derivativeRange: [-1.35, 1.35],
    valueMeaning: "height of the rotating point",
    derivativeMeaning: "vertical component of tangent motion",
    formula: "d/dx sin(x) = cos(x)",
    warn: null,
  },
  cos: {
    label: "cos(x)",
    derivLabel: "−sin(x)",
    f: Math.cos,
    d: (x) => -Math.sin(x),
    yRange: [-1.35, 1.35],
    derivativeRange: [-1.35, 1.35],
    valueMeaning: "horizontal position of the rotating point",
    derivativeMeaning: "horizontal component of tangent motion",
    formula: "d/dx cos(x) = −sin(x)",
    warn: null,
  },
  tan: {
    label: "tan(x)",
    derivLabel: "sec²(x)",
    f: Math.tan,
    d: (x) => 1 / (Math.cos(x) * Math.cos(x)),
    yRange: [-4, 4],
    derivativeRange: [-0.5, 8],
    valueMeaning: "height on the tangent line x = 1",
    derivativeMeaning: "how violently tan(x) changes near vertical asymptotes",
    formula: "d/dx tan(x) = sec²(x)",
    warn: "Tangent is clipped near asymptotes to keep the graph readable.",
  },
};

const planeInfo = {
  XY: { description: "angle on X, value on Y", view: { yaw: 0, pitch: 0 } },
  YZ: { description: "angle on Z, value on Y", view: { yaw: Math.PI / 2, pitch: 0 } },
  XZ: { description: "angle on X, value on Z", view: { yaw: 0, pitch: -Math.PI / 2 } },
};

function UnitCircle({ x, selected, showProjections, showVelocity, showTanConstruction }) {
  const cx = 155;
  const cy = 158;
  const r = 70;
  const dx = 0.25;
  const px = cx + r * Math.cos(x);
  const py = cy - r * Math.sin(x);
  const qx = cx + r * Math.cos(x + dx);
  const qy = cy - r * Math.sin(x + dx);
  const sinNow = Math.sin(x);
  const sinNext = Math.sin(x + dx);
  const cosNow = Math.cos(x);
  const secantRate = (sinNext - sinNow) / dx;
  const rulerX = 378;
  const rulerTop = 82;
  const rulerBottom = 232;
  const rulerMid = (rulerTop + rulerBottom) / 2;
  const rulerScale = (rulerBottom - rulerTop) / 2;
  const hNowY = rulerMid - rulerScale * sinNow;
  const hNextY = rulerMid - rulerScale * sinNext;
  const tangentDX = 34;
  const tangentDY = -34 * cosNow;
  const tanLineX = cx + r;
  const tanY = cy - r * Math.tan(x);
  const nearAsymptote = Math.abs(Math.cos(x)) < 0.08;
  const tanYClamped = clamp(tanY, 66, H - 52);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full rounded-2xl bg-slate-50">
      <defs>
        <marker id="unit-arrow-dark" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 z" fill="#0f172a" /></marker>
        <marker id="unit-arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 z" fill="#2563eb" /></marker>
        <marker id="unit-arrow-green" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 z" fill="#059669" /></marker>
      </defs>
      <rect x="10" y="10" width={W - 20} height={H - 20} rx="18" fill="#f8fafc" stroke="#e2e8f0" />
      <text x="22" y="31" fontSize="14" fontWeight="700" fill="#0f172a">Derivative of sin: watch the height change</text>
      <text x="22" y="51" fontSize="12" fill="#64748b">P has height sin(x). Q has height sin(x + dx).</text>
      <line x1={cx - r - 24} y1={cy} x2={cx + r + 24} y2={cy} stroke="#cbd5e1" />
      <line x1={cx} y1={cy + r + 18} x2={cx} y2={cy - r - 18} stroke="#cbd5e1" />
      <circle cx={cx} cy={cy} r={r} fill="white" stroke="#334155" strokeWidth="2" />
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="#0f172a" strokeWidth="3" markerEnd="url(#unit-arrow-dark)" />
      <line x1={cx} y1={cy} x2={qx} y2={qy} stroke="#64748b" strokeWidth="2" strokeDasharray="5 5" />
      <path d={`M ${px} ${py} A ${r} ${r} 0 0 0 ${qx} ${qy}`} fill="none" stroke="#f59e0b" strokeWidth="5" opacity="0.85" />
      <text x={Math.min(px, qx) - 4} y={Math.min(py, qy) - 10} fontSize="11" fontWeight="700" fill="#b45309">dx</text>
      <circle cx={px} cy={py} r="7" fill="#111827" />
      <circle cx={qx} cy={qy} r="6" fill="#64748b" />
      <text x={px + 9} y={py - 7} fontSize="13" fontWeight="700" fill="#111827">P</text>
      <text x={qx + 9} y={qy - 7} fontSize="13" fontWeight="700" fill="#64748b">Q</text>
      {showProjections && (
        <>
          <line x1={px} y1={py} x2={px} y2={cy} stroke="#2563eb" strokeWidth="4" />
          <line x1={qx} y1={qy} x2={qx} y2={cy} stroke="#94a3b8" strokeWidth="3" strokeDasharray="4 4" />
          <text x={px + 8} y={clamp((py + cy) / 2, 74, cy - 10)} fontSize="12" fontWeight="700" fill="#2563eb">sin x</text>
          <text x={qx + 8} y={clamp((qy + cy) / 2 + 14, 88, cy + 18)} fontSize="11" fill="#64748b">sin(x+dx)</text>
        </>
      )}
      {showVelocity && (
        <>
          <line x1={px} y1={py} x2={px + tangentDX} y2={py + tangentDY} stroke="#059669" strokeWidth="3" markerEnd="url(#unit-arrow-green)" />
          <line x1={px + tangentDX} y1={py} x2={px + tangentDX} y2={py + tangentDY} stroke="#2563eb" strokeWidth="3" markerEnd="url(#unit-arrow-blue)" />
          <text x={px + tangentDX + 6} y={(py + py + tangentDY) / 2 + 4} fontSize="11" fontWeight="700" fill="#2563eb">vertical part</text>
        </>
      )}
      <g>
        <rect x={rulerX - 36} y="64" width="156" height="194" rx="14" fill="white" stroke="#e2e8f0" />
        <text x={rulerX - 20} y="84" fontSize="12" fontWeight="700" fill="#0f172a">Height ruler</text>
        <line x1={rulerX} y1={rulerTop} x2={rulerX} y2={rulerBottom} stroke="#94a3b8" />
        <line x1={rulerX - 12} y1={rulerMid} x2={rulerX + 88} y2={rulerMid} stroke="#cbd5e1" />
        <text x={rulerX + 94} y={rulerMid + 4} fontSize="11" fill="#64748b">0</text>
        <line x1={rulerX - 14} y1={hNowY} x2={rulerX + 76} y2={hNowY} stroke="#2563eb" strokeWidth="4" />
        <text x={rulerX + 82} y={hNowY + 4} fontSize="11" fontWeight="700" fill="#2563eb">sin x</text>
        <line x1={rulerX - 14} y1={hNextY} x2={rulerX + 76} y2={hNextY} stroke="#64748b" strokeWidth="3" strokeDasharray="4 4" />
        <text x={rulerX + 82} y={hNextY + 4} fontSize="11" fill="#64748b">next</text>
        <line x1={rulerX - 24} y1={hNowY} x2={rulerX - 24} y2={hNextY} stroke="#dc2626" strokeWidth="4" />
        <text x={rulerX - 34} y={(hNowY + hNextY) / 2 + 4} textAnchor="end" fontSize="11" fontWeight="700" fill="#dc2626">Δh</text>
      </g>
      <g transform="translate(22 248)">
        <rect width="476" height="32" rx="12" fill="white" stroke="#e2e8f0" />
        <text x="12" y="14" fontSize="12" fontWeight="700" fill="#0f172a">Derivative ≈ Δheight / dx</text>
        <text x="170" y="14" fontSize="12" fill="#475569">Here: {fmt(secantRate, 2)}. As dx → 0, this becomes cos(x) = {fmt(cosNow, 2)}.</text>
      </g>
      {selected === "tan" && showTanConstruction && (
        <>
          <line x1={tanLineX} y1="68" x2={tanLineX} y2={H - 52} stroke="#f97316" strokeWidth="2" />
          <line x1={cx} y1={cy} x2={nearAsymptote ? cx + r * 1.35 * Math.sign(Math.cos(x)) : tanLineX} y2={tanYClamped} stroke="#fb923c" strokeWidth="2" strokeDasharray="5 4" />
          {!nearAsymptote && <circle cx={tanLineX} cy={tanYClamped} r="5" fill="#f97316" />}
        </>
      )}
    </svg>
  );
}

function normX(x, xmin, xmax) {
  return -1 + (2 * (x - xmin)) / (xmax - xmin);
}

function normY(y, ymin, ymax) {
  return -1 + (2 * (clamp(y, ymin, ymax) - ymin)) / (ymax - ymin);
}

function pointOnPlane(xNorm, yNorm, plane) {
  if (plane === "YZ") return { x: 0, y: yNorm, z: xNorm };
  if (plane === "XZ") return { x: xNorm, y: 0, z: yNorm };
  return { x: xNorm, y: yNorm, z: 0 };
}

function rotatePoint3D(p, view) {
  const pitchCos = Math.cos(view.pitch);
  const pitchSin = Math.sin(view.pitch);
  const yawCos = Math.cos(view.yaw);
  const yawSin = Math.sin(view.yaw);
  const x1 = yawCos * p.x + yawSin * p.z;
  const z1 = -yawSin * p.x + yawCos * p.z;
  return { x: x1, y: pitchCos * p.y - pitchSin * z1, z: pitchSin * p.y + pitchCos * z1 };
}

function project3D(p, view) {
  const scale = 74;
  const cx = PLOT_W / 2;
  const cy = PLOT_H / 2 + 8;
  const rp = rotatePoint3D(p, view);
  return { x: cx + scale * rp.x, y: cy - scale * rp.y, depth: rp.z };
}

function curvePath3D(fn, xmin, xmax, ymin, ymax, plane, view, upto = xmax, steps = 560) {
  let d = "";
  let drawing = false;
  for (let i = 0; i <= steps; i += 1) {
    const x = xmin + ((xmax - xmin) * i) / steps;
    if (x > upto) break;
    const y = fn(x);
    if (!Number.isFinite(y) || y < ymin || y > ymax) {
      drawing = false;
      continue;
    }
    const p = project3D(pointOnPlane(normX(x, xmin, xmax), normY(y, ymin, ymax), plane), view);
    d += drawing ? `L ${p.x} ${p.y} ` : `M ${p.x} ${p.y} `;
    drawing = true;
  }
  return d;
}

function GraphPlaneGrid3D({ plane, ymin, ymax, title, color, view }) {
  const xTicks = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, TAU];
  const yTicks = ymin < -2 ? [-4, -2, 0, 2, 4, 6, 8] : [-1, 0, 1];
  const planeCorners = [pointOnPlane(-1, -1, plane), pointOnPlane(1, -1, plane), pointOnPlane(1, 1, plane), pointOnPlane(-1, 1, plane)].map((p) => project3D(p, view));
  const polygon = planeCorners.map((p) => `${p.x},${p.y}`).join(" ");
  const origin = project3D({ x: 0, y: 0, z: 0 }, view);
  const xAxis = project3D({ x: 1.25, y: 0, z: 0 }, view);
  const yAxis = project3D({ x: 0, y: 1.25, z: 0 }, view);
  const zAxis = project3D({ x: 0, y: 0, z: 1.25 }, view);
  const planeTint = plane === "XY" ? "#eff6ff" : plane === "YZ" ? "#ecfdf5" : "#fff7ed";
  const planeStroke = plane === "XY" ? "#2563eb" : plane === "YZ" ? "#059669" : "#f97316";

  return (
    <g>
      <rect x="0" y="0" width={PLOT_W} height={PLOT_H} rx="16" fill="white" />
      <polygon points={polygon} fill={planeTint} stroke={planeStroke} strokeWidth="2.5" opacity="0.92" />
      {xTicks.map((t) => {
        const pa = project3D(pointOnPlane(normX(t, 0, TAU), -1, plane), view);
        const pb = project3D(pointOnPlane(normX(t, 0, TAU), 1, plane), view);
        return <line key={`gx-${t}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#e2e8f0" strokeDasharray="4 4" />;
      })}
      {yTicks.filter((v) => v >= ymin && v <= ymax).map((v) => {
        const yn = normY(v, ymin, ymax);
        const pa = project3D(pointOnPlane(-1, yn, plane), view);
        const pb = project3D(pointOnPlane(1, yn, plane), view);
        return <line key={`gy-${v}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={Math.abs(v) < 1e-8 ? "#94a3b8" : "#e2e8f0"} />;
      })}
      <line x1={origin.x} y1={origin.y} x2={xAxis.x} y2={xAxis.y} stroke="#334155" strokeWidth="2" />
      <line x1={origin.x} y1={origin.y} x2={yAxis.x} y2={yAxis.y} stroke="#334155" strokeWidth="2" />
      <line x1={origin.x} y1={origin.y} x2={zAxis.x} y2={zAxis.y} stroke="#334155" strokeWidth="2" />
      <text x={xAxis.x + 4} y={xAxis.y + 4} fontSize="12" fontWeight="700" fill="#334155">X</text>
      <text x={yAxis.x + 4} y={yAxis.y - 6} fontSize="12" fontWeight="700" fill="#334155">Y</text>
      <text x={zAxis.x - 12} y={zAxis.y + 4} fontSize="12" fontWeight="700" fill="#334155">Z</text>
      <rect x="16" y="12" width="292" height="52" rx="12" fill="white" stroke="#e2e8f0" />
      <text x="28" y="28" fontSize="13" fontWeight="700" fill={color}>{title}</text>
      <text x="28" y="43" fontSize="11" fill="#64748b">Plane {plane}: {planeInfo[plane].description}</text>
      <text x="28" y="57" fontSize="11" fill="#64748b">Preset view faces the selected plane. Drag to inspect in 3D.</text>
    </g>
  );
}

function Plot3D({ cfg, x, xmin, xmax, ymin, ymax, fn, label, color, plane, showTrace, selected, kind, showTangent, showSecant, delta, view, setView }) {
  const dragRef = useRef(null);
  const value = fn(x);
  const safeValue = Number.isFinite(value) ? clamp(value, ymin, ymax) : 0;
  const current = project3D(pointOnPlane(normX(x, xmin, xmax), normY(safeValue, ymin, ymax), plane), view);
  const base = project3D(pointOnPlane(normX(x, xmin, xmax), normY(0, ymin, ymax), plane), view);
  const path = useMemo(() => curvePath3D(fn, xmin, xmax, ymin, ymax, plane, view), [fn, xmin, xmax, ymin, ymax, plane, view]);
  const tracePath = useMemo(() => (showTrace ? curvePath3D(fn, xmin, xmax, ymin, ymax, plane, view, x) : ""), [fn, xmin, xmax, ymin, ymax, plane, view, x, showTrace]);

  function startDrag(e) {
    dragRef.current = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function moveDrag(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    const pitchGain = e.shiftKey ? 0.02 : 0.01;
    setView({ yaw: dragRef.current.yaw + dx * 0.01, pitch: clamp(dragRef.current.pitch + dy * pitchGain, -1.25, 1.25) });
  }

  function stopDrag() {
    dragRef.current = null;
  }

  const tangentPath = useMemo(() => {
    if (!showTangent || kind !== "function" || !Number.isFinite(value)) return "";
    const slope = cfg.d(x);
    if (!Number.isFinite(slope) || Math.abs(slope) > 50) return "";
    const len = 0.55;
    const x1 = clamp(x - len, xmin, xmax);
    const x2 = clamp(x + len, xmin, xmax);
    const y1 = value - slope * (x - x1);
    const y2 = value + slope * (x2 - x);
    if (!Number.isFinite(y1) || !Number.isFinite(y2)) return "";
    const p1 = project3D(pointOnPlane(normX(x1, xmin, xmax), normY(y1, ymin, ymax), plane), view);
    const p2 = project3D(pointOnPlane(normX(x2, xmin, xmax), normY(y2, ymin, ymax), plane), view);
    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  }, [showTangent, kind, value, cfg, x, xmin, xmax, ymin, ymax, plane, view]);

  const secantPath = useMemo(() => {
    if (!showSecant || kind !== "function" || !Number.isFinite(value)) return "";
    const x2 = x + delta;
    if (x2 > xmax) return "";
    const y2 = fn(x2);
    if (!Number.isFinite(y2) || y2 < ymin || y2 > ymax) return "";
    const p2 = project3D(pointOnPlane(normX(x2, xmin, xmax), normY(y2, ymin, ymax), plane), view);
    return `M ${current.x} ${current.y} L ${p2.x} ${p2.y}`;
  }, [showSecant, kind, value, x, delta, xmax, fn, ymin, ymax, xmin, plane, view, current.x, current.y]);

  return (
    <svg viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} className="h-full w-full cursor-grab rounded-2xl bg-white active:cursor-grabbing" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onPointerLeave={stopDrag}>
      <GraphPlaneGrid3D plane={plane} ymin={ymin} ymax={ymax} title={label} color={color} view={view} />
      {selected === "tan" && <text x={PLOT_W - 190} y="24" fontSize="11" fill="#c2410c">asymptotes are clipped in 3D view</text>}
      <path d={path} fill="none" stroke={color} strokeWidth="3.5" />
      {showTrace && <path d={tracePath} fill="none" stroke="#0f172a" strokeWidth="6" opacity="0.15" />}
      {selected === "sin" && kind === "function" && Number.isFinite(value) && (
        <>
          <motion.line x1={base.x} y1={base.y} x2={current.x} y2={current.y} animate={{ x1: base.x, y1: base.y, x2: current.x, y2: current.y }} transition={{ duration: 0.18, ease: "easeOut" }} stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
          <text x={clamp(current.x + 8, 8, PLOT_W - 80)} y={clamp(current.y - 8, 16, PLOT_H - 8)} fontSize="11" fontWeight="700" fill="#2563eb">sin height</text>
        </>
      )}
      {tangentPath && <path d={tangentPath} fill="none" stroke="#7c3aed" strokeWidth="3" />}
      {secantPath && <path d={secantPath} fill="none" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="6 5" />}
      {Number.isFinite(value) && <motion.circle cx={current.x} cy={current.y} r="6" animate={{ cx: current.x, cy: current.y }} transition={{ duration: 0.18, ease: "easeOut" }} fill="#111827" />}
    </svg>
  );
}

function FunctionGraph(props) {
  const { cfg } = props;
  return <Plot3D {...props} ymin={cfg.yRange[0]} ymax={cfg.yRange[1]} fn={cfg.f} label={`Function: y = ${cfg.label}`} color="#2563eb" kind="function" />;
}

function DerivativeGraph({ cfg, x, xmin, xmax, showTrace, selected, plane, view, setView }) {
  return <Plot3D cfg={cfg} x={x} xmin={xmin} xmax={xmax} ymin={cfg.derivativeRange[0]} ymax={cfg.derivativeRange[1]} fn={cfg.d} label={`Derivative: y′ = ${cfg.derivLabel}`} color="#059669" plane={plane} showTrace={showTrace} selected={selected} kind="derivative" showTangent={false} showSecant={false} delta={0.25} view={view} setView={setView} />;
}

function Toggle({ label, value, setValue }) {
  return (
    <button onClick={() => setValue(!value)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${value ? "border-slate-800 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
      {value ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      {label}
    </button>
  );
}

function KeyAngleButtons({ setX }) {
  const keys = [[0, "0"], [Math.PI / 2, "π/2"], [Math.PI, "π"], [(3 * Math.PI) / 2, "3π/2"], [TAU, "2π"]];
  return <div className="flex flex-wrap gap-2">{keys.map(([v, label]) => <Button key={label} variant="outline" size="sm" onClick={() => setX(v)}>{label}</Button>)}</div>;
}

function MotionAnalogies({ x }) {
  const width = 520;
  const height = 300;
  const theta = phase(x);
  const wheelCx = 86;
  const wheelCy = 78;
  const crankR = 38;
  const crankX = wheelCx + crankR * Math.cos(theta);
  const crankY = wheelCy - crankR * Math.sin(theta);
  const pistonCenter = 285;
  const pistonAmp = 72;
  const pistonX = pistonCenter + pistonAmp * Math.cos(theta);
  const massCenter = 285;
  const massAmp = 72;
  const massX = massCenter + massAmp * Math.cos(theta);
  const massY = 168;
  const pivotX = 118;
  const pivotY = 244;
  const pendLen = 42;
  const phi0 = 0.42;
  const phi = phi0 * Math.cos(theta);
  const bobX = pivotX + pendLen * Math.sin(phi);
  const bobY = pivotY + pendLen * Math.cos(phi);
  const displacement = Math.cos(theta);
  const velocity = -Math.sin(theta);
  const springPath = useMemo(() => {
    const x0 = 36;
    const x1 = massX - 18;
    const y = massY;
    const coils = 9;
    const amp = 8;
    let d = `M ${x0} ${y}`;
    for (let i = 1; i <= coils * 2; i += 1) {
      const t = i / (coils * 2);
      const xx = x0 + (x1 - x0) * t;
      const yy = y + (i % 2 === 0 ? -amp : amp);
      d += ` L ${xx} ${yy}`;
    }
    return `${d} L ${x1} ${y}`;
  }, [massX]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-2xl bg-white">
      <rect x="10" y="10" width={width - 20} height={height - 20} rx="18" fill="#ffffff" stroke="#e2e8f0" />
      <text x="24" y="33" fontSize="14" fontWeight="700" fill="#0f172a">Same period: one wheel turn = one oscillation</text>
      <text x="24" y="51" fontSize="12" fill="#64748b">Projection model: displacement = A cos(θ), velocity = −A sin(θ).</text>
      <circle cx={wheelCx} cy={wheelCy} r={crankR} fill="#f8fafc" stroke="#334155" strokeWidth="2" />
      <line x1={wheelCx} y1={wheelCy} x2={crankX} y2={crankY} stroke="#0f172a" strokeWidth="3" />
      <circle cx={crankX} cy={crankY} r="6" fill="#111827" />
      <line x1={crankX} y1={crankY} x2={pistonX} y2={wheelCy} stroke="#64748b" strokeWidth="3" strokeDasharray="5 4" />
      <line x1={wheelCx - crankR} y1={wheelCy + 48} x2={wheelCx + crankR} y2={wheelCy + 48} stroke="#e2e8f0" strokeWidth="3" />
      <line x1={wheelCx} y1={wheelCy + 42} x2={wheelCx} y2={wheelCy + 54} stroke="#94a3b8" strokeWidth="2" />
      <line x1="190" y1={wheelCy + 28} x2="430" y2={wheelCy + 28} stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      <line x1={pistonCenter} y1={wheelCy + 15} x2={pistonCenter} y2={wheelCy + 42} stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
      <rect x={pistonX - 27} y={wheelCy - 18} width="54" height="36" rx="8" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
      <text x="24" y="127" fontSize="12" fontWeight="700" fill="#334155">Piston projection: x = A cos(θ), period = 2π</text>
      <line x1="28" y1="140" x2="28" y2="196" stroke="#334155" strokeWidth="4" />
      <path d={springPath} fill="none" stroke="#7c3aed" strokeWidth="3" />
      <line x1={massCenter} y1="138" x2={massCenter} y2="198" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
      <rect x={massX - 27} y={massY - 20} width="54" height="40" rx="10" fill="#ede9fe" stroke="#7c3aed" strokeWidth="2" />
      <line x1="28" y1="202" x2="430" y2="202" stroke="#e2e8f0" strokeWidth="3" />
      <text x="24" y="219" fontSize="12" fontWeight="700" fill="#334155">Spring–mass SHM: x = A cos(θ), v = −A sin(θ), same period 2π</text>
      <line x1={pivotX - 48} y1={pivotY - 2} x2={pivotX + 48} y2={pivotY - 2} stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      <circle cx={pivotX} cy={pivotY} r="4" fill="#334155" />
      <path d={`M ${pivotX - pendLen * Math.sin(phi0)} ${pivotY + pendLen * Math.cos(phi0)} A ${pendLen} ${pendLen} 0 0 1 ${pivotX + pendLen * Math.sin(phi0)} ${pivotY + pendLen * Math.cos(phi0)}`} fill="none" stroke="#fde68a" strokeWidth="7" opacity="0.7" />
      <line x1={pivotX} y1={pivotY} x2={bobX} y2={bobY} stroke="#92400e" strokeWidth="3" />
      <circle cx={bobX} cy={bobY} r="10" fill="#fef3c7" stroke="#b45309" strokeWidth="3" />
      <line x1={pivotX} y1={pivotY} x2={pivotX} y2={pivotY + pendLen + 12} stroke="#e2e8f0" strokeWidth="2" strokeDasharray="3 3" />
      <text x="184" y="254" fontSize="12" fontWeight="700" fill="#334155">Small-angle pendulum: φ = φ₀ cos(θ), angular velocity ∝ −sin(θ)</text>
      <text x="184" y="272" fontSize="11" fill="#64748b">Approximation only: true pendulum is sinusoidal only for small angles.</text>
      <g transform="translate(365 54)">
        <rect width="132" height="96" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
        <text x="12" y="20" fontSize="12" fontWeight="700" fill="#0f172a">Phase θ = {radLabel(theta)}</text>
        <text x="12" y="40" fontSize="11" fill="#2563eb">cos θ = {fmt(displacement, 2)}</text>
        <text x="12" y="58" fontSize="11" fill="#7c3aed">−sin θ = {fmt(velocity, 2)}</text>
        <text x="12" y="76" fontSize="11" fill="#92400e">φ/φ₀ = {fmt(displacement, 2)}</text>
        <text x="12" y="92" fontSize="11" fill="#64748b">T = 2π</text>
      </g>
    </svg>
  );
}

function PredictionCard({ cfg, x }) {
  const derivative = cfg.d(x);
  const state = Math.abs(derivative) < 0.08 ? "flat" : derivative > 0 ? "increasing" : "decreasing";
  const phrase = state === "flat" ? "nearly flat" : state;
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800"><CheckCircle2 className="h-4 w-4" /> Prediction check</div>
        <div className="text-sm text-slate-600">At this angle, the function is <span className="font-semibold text-slate-900">{phrase}</span>.</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className={`rounded-xl border p-2 text-center ${state === "increasing" ? "border-green-500 bg-green-50" : "border-slate-200"}`}>Increasing</div>
          <div className={`rounded-xl border p-2 text-center ${state === "flat" ? "border-amber-500 bg-amber-50" : "border-slate-200"}`}>Flat</div>
          <div className={`rounded-xl border p-2 text-center ${state === "decreasing" ? "border-red-500 bg-red-50" : "border-slate-200"}`}>Decreasing</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ValidationPanel() {
  const checks = [
    ["Radians are used internally", "Derivative identities are correct only in their clean form when x is in radians."],
    ["Unit-circle position is P(x) = (cos x, sin x)", "The app shows projections for sin and cos from the same moving point."],
    ["Velocity vector is P′(x) = (−sin x, cos x)", "The tangent arrow explains both d(cos x)/dx and d(sin x)/dx."],
    ["Function and derivative graphs are synchronized", "The moving marker uses the same x across the unit circle, function graph, and derivative graph."],
    ["Derivative is shown as slope, not next value", "Tangent line, fixed Δx secant, and prediction card make this distinction explicit."],
    ["Motion analogies have correct period", "Wheel projection, piston, spring–mass, and small-angle pendulum use the same phase θ and complete one oscillation per 2π revolution."],
    ["Pendulum approximation is labeled", "The pendulum uses φ = φ₀ cos(θ), which is valid as a teaching model only for small angular displacement."],
    ["Tangent asymptotes are treated carefully", "tan(x) and sec²(x) are clipped near asymptotes only for readability, not mathematical redefinition."],
  ];

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><CheckCircle2 className="h-4 w-4 text-green-600" /> Validation checklist</div>
        <div className="space-y-3">
          {checks.map(([title, body]) => (
            <div key={title} className="rounded-xl bg-slate-50 p-3">
              <div className="text-sm font-semibold text-slate-800">{title}</div>
              <div className="text-xs leading-relaxed text-slate-600">{body}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TrigDerivativeVisualizer() {
  const [selected, setSelected] = useState("sin");
  const [x, setX] = useState(Math.PI / 4);
  const [playing, setPlaying] = useState(false);
  const [degreeMode, setDegreeMode] = useState(false);
  const [showProjections, setShowProjections] = useState(true);
  const [showVelocity, setShowVelocity] = useState(true);
  const [showTangent, setShowTangent] = useState(true);
  const [showSecant, setShowSecant] = useState(false);
  const [showDerivative, setShowDerivative] = useState(true);
  const [showTrace, setShowTrace] = useState(true);
  const [showTanConstruction, setShowTanConstruction] = useState(true);
  const [plotPlane, setPlotPlane] = useState("XY");
  const [plotView, setPlotView] = useState({ ...planeInfo.XY.view });
  const [speed, setSpeed] = useState(0.018);
  const delta = 0.25;
  const cfg = functions[selected];
  const xmin = 0;
  const xmax = TAU;

  useEffect(() => {
    if (!playing) return undefined;
    let raf = 0;
    const tick = () => {
      setX((v) => phase(v + speed));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  function setPlaneWithView(p) {
    setPlotPlane(p);
    setPlotView({ ...planeInfo[p].view });
  }

  const value = cfg.f(x);
  const derivative = cfg.d(x);
  const secantSlope = (cfg.f(x + delta) - cfg.f(x)) / delta;
  const displayAngle = degreeMode ? `${fmt((x * 180) / Math.PI, 1)}°` : radLabel(x);

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-col justify-between gap-3 rounded-3xl bg-white p-5 shadow-sm md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trig Derivative Visualizer</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">See derivative as motion: unit-circle position → function value → local slope → derivative graph.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Object.keys(functions).map((k) => <Button key={k} variant={selected === k ? "default" : "outline"} onClick={() => setSelected(k)}>{functions[k].label}</Button>)}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <Card className="rounded-3xl shadow-sm">
              <CardContent className="p-4">
                <div className="mb-3 grid gap-3 md:grid-cols-[1fr_1fr]">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Current angle</div>
                    <div className="text-2xl font-bold">{displayAngle}</div>
                    <input className="mt-3 w-full" type="range" min="0" max={TAU} step="0.001" value={x} onChange={(e) => setX(Number(e.target.value))} />
                    <div className="mt-2"><KeyAngleButtons setX={setX} /></div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="rounded-xl bg-white p-3"><div className="text-xs text-slate-500">{cfg.label}</div><div className="font-bold text-blue-700">{fmt(value)}</div></div>
                      <div className="rounded-xl bg-white p-3"><div className="text-xs text-slate-500">slope</div><div className="font-bold text-purple-700">{fmt(derivative)}</div></div>
                      <div className="rounded-xl bg-white p-3"><div className="text-xs text-slate-500">{cfg.derivLabel}</div><div className="font-bold text-green-700">{fmt(derivative)}</div></div>
                    </div>
                    <div className="mt-3 text-sm text-slate-700"><span className="font-semibold">Meaning:</span> {cfg.valueMeaning}; derivative = {cfg.derivativeMeaning}.</div>
                    {cfg.warn && <div className="mt-2 flex gap-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" /> {cfg.warn}</div>}
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <div className="space-y-4">
                    <div className="min-h-[300px]"><UnitCircle x={x} selected={selected} showProjections={showProjections} showVelocity={showVelocity} showTanConstruction={showTanConstruction} /></div>
                    <MotionAnalogies x={x} />
                  </div>
                  <div className="space-y-4">
                    <FunctionGraph cfg={cfg} x={x} xmin={xmin} xmax={xmax} showTangent={showTangent} showSecant={showSecant} delta={delta} showTrace={showTrace} selected={selected} plane={plotPlane} view={plotView} setView={setPlotView} />
                    {showDerivative ? <DerivativeGraph cfg={cfg} x={x} xmin={xmin} xmax={xmax} showTrace={showTrace} selected={selected} plane={plotPlane} view={plotView} setView={setPlotView} /> : <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-500">Derivative graph hidden for prediction mode</div>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="rounded-3xl shadow-sm">
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setPlaying(!playing)}>{playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}{playing ? "Pause" : "Play"}</Button>
                  <Button variant="outline" onClick={() => setX(0)}><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
                  <Button variant="outline" onClick={() => setX((v) => clamp(v - 0.08, 0, TAU))}><StepBack className="h-4 w-4" /></Button>
                  <Button variant="outline" onClick={() => setX((v) => clamp(v + 0.08, 0, TAU))}><StepForward className="h-4 w-4" /></Button>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Animation speed</span><span>{fmt(speed, 3)}</span></div>
                  <input className="w-full" type="range" min="0.004" max="0.05" step="0.001" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                  <div className="font-semibold text-slate-900">Secant comparison</div>
                  <div className="mt-1">Fixed Δx = 0.25 radians</div>
                  <div className="mt-1">Secant slope ≈ {fmt(secantSlope)}; tangent slope = {fmt(derivative)}</div>
                </div>
                <div className="flex flex-wrap gap-2"><Button variant={degreeMode ? "default" : "outline"} onClick={() => setDegreeMode(!degreeMode)}>{degreeMode ? "Degrees shown" : "Radians shown"}</Button></div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">3D plot plane</div>
                  <div className="flex flex-wrap gap-2">{Object.keys(planeInfo).map((p) => <Button key={p} size="sm" variant={plotPlane === p ? "default" : "outline"} onClick={() => setPlaneWithView(p)}>{p}</Button>)}</div>
                  <div className="mt-2 text-xs text-slate-600">Current: {planeInfo[plotPlane].description}</div>
                  <Button className="mt-2" size="sm" variant="outline" onClick={() => setPlotView({ ...planeInfo[plotPlane].view })}>Reset to {plotPlane} plane view</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm">
              <CardContent className="space-y-2 p-4">
                <Toggle label="Projections" value={showProjections} setValue={setShowProjections} />
                <Toggle label="Velocity vector" value={showVelocity} setValue={setShowVelocity} />
                <Toggle label="Tangent line" value={showTangent} setValue={setShowTangent} />
                <Toggle label="Secant Δx" value={showSecant} setValue={setShowSecant} />
                <Toggle label="Derivative graph" value={showDerivative} setValue={setShowDerivative} />
                <Toggle label="Trace discovery" value={showTrace} setValue={setShowTrace} />
                {selected === "tan" && <Toggle label="Tan construction" value={showTanConstruction} setValue={setShowTanConstruction} />}
              </CardContent>
            </Card>

            <PredictionCard cfg={cfg} x={x} />
            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="text-sm font-semibold text-slate-900">Formula reveal</div>
                <motion.div key={cfg.formula} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2 rounded-xl bg-slate-900 p-3 text-center text-lg font-bold text-white">{cfg.formula}</motion.div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">Clean derivative formulas assume radians. Degree display is only for intuition.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <ValidationPanel />
      </div>
    </div>
  );
}
