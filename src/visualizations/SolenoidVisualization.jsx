import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowRightLeft, RotateCcw } from "lucide-react";
const MU0 = 4 * Math.PI * 1e-7;
const TAU = Math.PI * 2;
const DISPLAY_SCALE = 40;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fmt(value, digits = 3) {
  if (!Number.isFinite(value)) return "∞";
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function makeLabel(text, color = "#fff", scale = 0.55) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;
  ctx.font = "bold 54px Arial";
  ctx.fillText(text, 16, 88);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.userData.baseScale = scale;
  return sprite;
}

function setSpriteScale(sprite, labelScale) {
  const s = (sprite.userData.baseScale || 0.55) * labelScale;
  sprite.scale.set(s * 2.2, s * 0.8, 1);
}

function buildLoop(radiusM, segments = 180, z = 0) {
  const points = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * TAU;
    points.push(new THREE.Vector3(radiusM * Math.cos(t), radiusM * Math.sin(t), z));
  }
  const segmentsOut = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    segmentsOut.push({ a, b, dl: b.clone().sub(a), mid: a.clone().add(b).multiplyScalar(0.5) });
  }
  return { points, segments: segmentsOut };
}

function buildHelix(turns, radiusM, lengthM, segmentsPerTurn = 90) {
  const points = [];
  const totalSegments = Math.max(segmentsPerTurn, Math.round(turns * segmentsPerTurn));
  for (let i = 0; i <= totalSegments; i += 1) {
    const u = i / totalSegments;
    const t = u * turns * TAU;
    const z = -lengthM / 2 + u * lengthM;
    points.push(new THREE.Vector3(radiusM * Math.cos(t), radiusM * Math.sin(t), z));
  }
  const segmentsOut = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    segmentsOut.push({ a, b, dl: b.clone().sub(a), mid: a.clone().add(b).multiplyScalar(0.5) });
  }
  return { points, segments: segmentsOut };
}

function biotSavartFieldAtPoint(point, segments, currentA, currentDir) {
  const field = new THREE.Vector3();
  const factor = (MU0 * currentA * currentDir) / (4 * Math.PI);
  for (const seg of segments) {
    const r = point.clone().sub(seg.mid);
    const distSq = r.lengthSq() + 1e-10;
    const dist = Math.sqrt(distSq);
    const cross = new THREE.Vector3().crossVectors(seg.dl, r);
    field.add(cross.multiplyScalar(1 / (distSq * dist)));
  }
  return field.multiplyScalar(factor);
}

function finiteSolenoidAxisField(z, radiusM, lengthM, turns, currentA, currentDir) {
  const n = turns / lengthM;
  const z1 = z + lengthM / 2;
  const z2 = z - lengthM / 2;
  const term1 = z1 / Math.sqrt(radiusM * radiusM + z1 * z1);
  const term2 = z2 / Math.sqrt(radiusM * radiusM + z2 * z2);
  return currentDir * (MU0 * n * currentA * 0.5) * (term1 - term2);
}

function makeCurvePath(points) {
  let d = "";
  let started = false;
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    d += started ? `L ${p.x} ${p.y} ` : `M ${p.x} ${p.y} `;
    started = true;
  }
  return d;
}

function buildFieldSamples(step, radiusM, lengthM) {
  const samples = [];
  if (step === 1) {
    samples.push({ p: new THREE.Vector3(0, 0, 0), kind: "center" });
    samples.push({ p: new THREE.Vector3(-1.5 * radiusM, 0, 0), kind: "outside" });
    samples.push({ p: new THREE.Vector3(1.5 * radiusM, 0, 0), kind: "outside" });
    return samples;
  }

  if (step === 2) {
    [-0.55, -0.25, 0, 0.25, 0.55].forEach((f) => {
      samples.push({ p: new THREE.Vector3(0, 0, f * lengthM), kind: "inside" });
    });
    samples.push({ p: new THREE.Vector3(1.35 * radiusM, 0, 0.55 * lengthM), kind: "outside" });
    samples.push({ p: new THREE.Vector3(-1.35 * radiusM, 0, -0.55 * lengthM), kind: "outside" });
    return samples;
  }

  [-0.7, -0.35, 0, 0.35, 0.7].forEach((f) => {
    samples.push({ p: new THREE.Vector3(0, 0, f * lengthM), kind: "inside" });
  });
  samples.push({ p: new THREE.Vector3(1.25 * radiusM, 0, 0.6 * lengthM), kind: "outside" });
  samples.push({ p: new THREE.Vector3(-1.25 * radiusM, 0, -0.6 * lengthM), kind: "outside" });
  return samples;
}

export default function SolenoidVisualization() {
  const mountRef = useRef(null);
  const appRef = useRef(null);
  const [step, setStep] = useState(1);
  const [currentA, setCurrentA] = useState(6);
  const [turns, setTurns] = useState(14);
  const [lengthCm, setLengthCm] = useState(18);
  const [radiusCm, setRadiusCm] = useState(4);
  const [probeFrac, setProbeFrac] = useState(0);
  const [currentDir, setCurrentDir] = useState(1);
  const [showIdeal, setShowIdeal] = useState(true);
  const [labelScale, setLabelScale] = useState(1);
  const [fieldData, setFieldData] = useState({
    axis: [],
    centerB: 0,
    idealCenterB: 0,
    probeMag: 0,
    maxAxis: 1,
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    const container = mount.parentElement;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070d);

    const camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.92));
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(5, 8, 7);
    scene.add(light);

    const state = {
      step: 1,
      currentA: 6,
      turns: 14,
      lengthCm: 18,
      radiusCm: 4,
      probeFrac: 0,
      currentDir: 1,
      showIdeal: true,
      labelScale: 1,
      theta: -0.8,
      phi: 1.0,
      dist: 10.2,
      vTheta: 0,
      vPhi: 0,
      vZoom: 0,
    };

    const target = new THREE.Vector3(0, 0, 0);
    const groups = {
      coil: new THREE.Group(),
      shell: new THREE.Group(),
      slice: new THREE.Group(),
      labels: new THREE.Group(),
      field: new THREE.Group(),
      probe: new THREE.Group(),
      axes: new THREE.Group(),
      plot: new THREE.Group(),
    };
    Object.values(groups).forEach((g) => scene.add(g));

    const coilMaterial = new THREE.MeshStandardMaterial({
      color: 0x53a8ff,
      metalness: 0.15,
      roughness: 0.35,
      emissive: 0x0a1b35,
      emissiveIntensity: 0.4,
    });
    const shellMaterial = new THREE.MeshBasicMaterial({
      color: 0x6ecbff,
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    let coilMesh = null;
    let shellMesh = null;
    let shellEdges = null;
    let sliceMesh = null;
    let sliceEdges = null;
    const fieldArrows = [];
    const currentMarkers = [];
    const probeArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1, 0xf59e0b, 0.18, 0.1);
    const centerArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1, 0x67e8f9, 0.24, 0.14);
    const axisCurve = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.95 })
    );
    const idealCurve = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.9 })
    );

    groups.field.add(probeArrow, centerArrow);
    groups.plot.add(axisCurve, idealCurve);

    const labels = {
      z: makeLabel("z", "#cbd5e1", 0.42),
      x: makeLabel("x", "#fb7185", 0.4),
      y: makeLabel("y", "#4ade80", 0.4),
      coil: makeLabel("coil", "#93c5fd", 0.38),
      current: makeLabel("I", "#ff6b6b", 0.45),
      field: makeLabel("B", "#67e8f9", 0.45),
      slice: makeLabel("slice plane", "#d8b4fe", 0.4),
      probe: makeLabel("probe", "#fde68a", 0.38),
    };
    labels.z.position.set(0.2, 0.2, 10.0);
    labels.x.position.set(4.8, 0.1, 0.15);
    labels.y.position.set(0.2, 4.8, 0.15);
    labels.coil.position.set(0.35, 0.3, 4.4);
    labels.current.position.set(1.1, 0.7, 0.55);
    labels.field.position.set(0.25, 0.2, 0.85);
    labels.slice.position.set(0.45, -0.3, 0.8);
    labels.slice.visible = false;
    labels.probe.position.set(0.25, 0.2, 0.35);
    Object.values(labels).forEach((sprite) => groups.labels.add(sprite));

    function updateLabelScale() {
      Object.values(labels).forEach((sprite) => setSpriteScale(sprite, state.labelScale));
    }

    function updateCamera() {
      camera.position.set(
        target.x + state.dist * Math.sin(state.phi) * Math.cos(state.theta),
        target.y + state.dist * Math.sin(state.phi) * Math.sin(state.theta),
        target.z + state.dist * Math.cos(state.phi)
      );
      camera.lookAt(target);
    }

    function setView(position, lookAt, up = new THREE.Vector3(0, 0, 1)) {
      const offset = position.clone().sub(lookAt);
      state.dist = offset.length();
      state.theta = Math.atan2(offset.y, offset.x);
      state.phi = Math.acos(clamp(offset.z / Math.max(state.dist, 1e-9), -1, 1));
      target.copy(lookAt);
      camera.up.copy(up);
      camera.position.copy(position);
      camera.lookAt(target);
    }

    function defaultView() {
      setView(new THREE.Vector3(7.4, -8.2, 4.8), new THREE.Vector3(0, 0, 0));
    }

    function sideView() {
      setView(new THREE.Vector3(0, -9.8, 1.0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
    }

    function endView() {
      setView(new THREE.Vector3(0.1, 0, 10.2), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
    }

    function rebuildCoil() {
      const radiusM = state.radiusCm / 100;
      const lengthM = state.lengthCm / 100;
      const radiusD = radiusM * DISPLAY_SCALE;
      const lengthD = lengthM * DISPLAY_SCALE;
      const wireRadius = Math.max(0.18, radiusD * 0.11);
      const coilData = state.step === 1 ? buildLoop(radiusD) : buildHelix(state.turns, radiusD, lengthD);
      const physicalSegments = coilData.segments.map((seg) => ({
        a: seg.a.clone().divideScalar(DISPLAY_SCALE),
        b: seg.b.clone().divideScalar(DISPLAY_SCALE),
        dl: seg.dl.clone().divideScalar(DISPLAY_SCALE),
        mid: seg.mid.clone().divideScalar(DISPLAY_SCALE),
      }));
      const curve = new THREE.CatmullRomCurve3(coilData.points, state.step === 1, "centripetal", 0.5);
      const geometry = new THREE.TubeGeometry(curve, state.step === 1 ? 180 : Math.max(180, state.turns * 96), wireRadius, 10, state.step === 1);

      if (coilMesh) {
        coilMesh.geometry.dispose();
        groups.coil.remove(coilMesh);
      }
      coilMesh = new THREE.Mesh(geometry, coilMaterial);
      groups.coil.add(coilMesh);

      const shellRadius = radiusD * 1.08;
      const shellLength = Math.max(lengthD, radiusD * 3);
      if (shellMesh) {
        shellMesh.geometry.dispose();
        shellEdges.geometry.dispose();
        groups.shell.remove(shellMesh);
        groups.shell.remove(shellEdges);
      }
      shellMesh = new THREE.Mesh(new THREE.CylinderGeometry(shellRadius, shellRadius, shellLength, 48, 1, true), shellMaterial);
      shellMesh.rotation.x = Math.PI / 2;
      shellEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.CylinderGeometry(shellRadius, shellRadius, shellLength, 18, 1, true)),
        new THREE.LineBasicMaterial({ color: 0x8fd6ff, transparent: true, opacity: 0.22 })
      );
      shellEdges.rotation.x = Math.PI / 2;
      groups.shell.add(shellMesh, shellEdges);
      groups.shell.visible = state.step >= 2;

      const sliceSize = Math.max(shellRadius * 2.6, lengthD * 0.85);
      if (sliceMesh) {
        sliceMesh.geometry.dispose();
        sliceEdges.geometry.dispose();
        groups.slice.remove(sliceMesh);
        groups.slice.remove(sliceEdges);
      }
      sliceMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(sliceSize, sliceSize),
        new THREE.MeshBasicMaterial({
          color: 0xd8b4fe,
          transparent: true,
          opacity: state.step >= 3 ? 0.16 : 0.1,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      sliceEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(sliceSize, sliceSize)),
        new THREE.LineBasicMaterial({ color: 0xe9d5ff, transparent: true, opacity: 0.5 })
      );
      groups.slice.add(sliceMesh, sliceEdges);
      groups.slice.visible = state.step >= 2;

      const markerCount = state.step === 1 ? 4 : 7;
      while (currentMarkers.length < markerCount) {
        const marker = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 0.28, 0xff6b6b, 0.08, 0.05);
        groups.coil.add(marker);
        currentMarkers.push(marker);
      }
      for (let i = 0; i < currentMarkers.length; i += 1) {
        const marker = currentMarkers[i];
        marker.visible = i < markerCount;
        if (!marker.visible) continue;
        const u = (i + 0.5) / markerCount;
        const t = u * (state.step === 1 ? TAU : state.turns * TAU);
        const wireOffsetD = wireRadius * 0.98;
        const pos = state.step === 1
          ? new THREE.Vector3(
              (radiusM + wireOffsetD / DISPLAY_SCALE) * Math.cos(t),
              (radiusM + wireOffsetD / DISPLAY_SCALE) * Math.sin(t),
              0
            )
          : new THREE.Vector3(
              (radiusM + wireOffsetD / DISPLAY_SCALE) * Math.cos(t),
              (radiusM + wireOffsetD / DISPLAY_SCALE) * Math.sin(t),
              -lengthM / 2 + u * lengthM
            );
        const tangent = state.step === 1
          ? new THREE.Vector3(-Math.sin(t), Math.cos(t), 0)
          : new THREE.Vector3(-Math.sin(t), Math.cos(t), lengthM / Math.max(state.turns * TAU, 1e-9)).normalize();
        marker.position.copy(pos.multiplyScalar(DISPLAY_SCALE));
        marker.setDirection(tangent.multiplyScalar(state.currentDir).normalize());
      }
      labels.coil.position.set(radiusD * 0.4, radiusD * 0.3, state.step === 1 ? 0.5 : lengthD * 0.28);
      labels.current.position.set(
        state.step === 1 ? radiusD * 0.95 : radiusD * 0.9,
        state.step === 1 ? radiusD * 0.7 : radiusD * 0.55,
        state.step === 1 ? 0.45 : lengthD * 0.28
      );
      labels.field.position.set(
        0.3,
        0.2,
        state.step === 1 ? 0.85 : Math.max(0.85, lengthD * 0.08)
      );

      const sampleDefs = buildFieldSamples(state.step, radiusM, lengthM);
      const fields = sampleDefs.map((sample) => biotSavartFieldAtPoint(sample.p, physicalSegments, state.currentA, state.currentDir));
      const magnitudes = fields.map((v) => v.length());
      const maxField = Math.max(1e-9, ...magnitudes);

      while (fieldArrows.length < sampleDefs.length) {
        const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 1, 0x67e8f9, 0.18, 0.1);
        groups.field.add(arrow);
        fieldArrows.push(arrow);
      }

      for (let i = 0; i < fieldArrows.length; i += 1) {
        const arrow = fieldArrows[i];
        if (i >= sampleDefs.length) {
          arrow.visible = false;
          continue;
        }

        const sample = sampleDefs[i];
        const field = fields[i];
        const mag = field.length();
        arrow.visible = state.step >= 1;
        arrow.position.copy(sample.p.clone().multiplyScalar(DISPLAY_SCALE));
        if (mag < 1e-10) {
          arrow.setDirection(new THREE.Vector3(0, 0, 1));
          arrow.setLength(0.04, 0.08, 0.05);
          continue;
        }

        const strength = clamp(mag / maxField, 0, 1);
        const color = sample.kind === "outside"
          ? new THREE.Color().setHSL(0.56 - 0.32 * strength, 0.6, 0.56 + 0.08 * strength)
          : new THREE.Color().setHSL(0.55 - 0.18 * strength, 0.95, 0.58 + 0.06 * strength);
        arrow.setColor(color);
        arrow.setDirection(field.clone().normalize());
        arrow.setLength(clamp(mag * 4.8 / maxField, 0.35, sample.kind === "outside" ? 1.05 : 2.4), 0.18, 0.1);
      }

      const probeZ = clamp(state.probeFrac, -0.92, 0.92) * (lengthM / 2 + radiusM * 0.05);
      const probePointPhysical = new THREE.Vector3(0, 0, probeZ);
      const probePoint = probePointPhysical.clone().multiplyScalar(DISPLAY_SCALE);
      if (sliceMesh && sliceEdges) {
        groups.slice.visible = state.step >= 2;
        groups.slice.position.set(0, 0, probePoint.z);
        labels.slice.position.copy(probePoint.clone().add(new THREE.Vector3(radiusD * 0.45, -radiusD * 0.2, radiusD * 0.18)));
        labels.slice.visible = state.step >= 2;
      }
      const probeField = biotSavartFieldAtPoint(probePointPhysical, physicalSegments, state.currentA, state.currentDir);
      const probeMag = probeField.length();
      probeArrow.visible = state.step >= 3;
      probeArrow.position.copy(probePoint);
      if (probeMag < 1e-10) {
        probeArrow.setDirection(new THREE.Vector3(0, 0, 1));
        probeArrow.setLength(0.05, 0.16, 0.08);
      } else {
        probeArrow.setDirection(probeField.clone().normalize());
        probeArrow.setLength(clamp(probeMag * 3.6 / maxField, 0.16, 1.9), 0.16, 0.08);
      }
      labels.probe.position.copy(probePoint.clone().add(new THREE.Vector3(0.6, 0.4, 0.5)));
      labels.probe.visible = state.step >= 3;

      const zMin = -(lengthM / 2 + radiusM * 0.9);
      const zMax = lengthM / 2 + radiusM * 0.9;
      const axisSamples = [];
      const sampleCount = 170;
      let maxAxis = 0;
      for (let i = 0; i <= sampleCount; i += 1) {
        const z = zMin + ((zMax - zMin) * i) / sampleCount;
        const Bz = biotSavartFieldAtPoint(new THREE.Vector3(0, 0, z), physicalSegments, state.currentA, state.currentDir).z;
        const idealBz = finiteSolenoidAxisField(z, radiusM, lengthM, state.turns, state.currentA, state.currentDir);
        axisSamples.push({ z, Bz, idealBz });
        maxAxis = Math.max(maxAxis, Math.abs(Bz), Math.abs(idealBz));
      }

      const plotWidth = 660;
      const plotHeight = 250;
      const padX = 34;
      const padY = 30;
      const domain = zMax - zMin || 1;
      const axisPoints = axisSamples.map((p) => ({
        x: padX + ((p.z - zMin) / domain) * (plotWidth - padX * 2),
        y: plotHeight / 2 - (p.Bz / maxAxis) * (plotHeight / 2 - padY),
      }));
      const idealPoints = axisSamples.map((p) => ({
        x: padX + ((p.z - zMin) / domain) * (plotWidth - padX * 2),
        y: plotHeight / 2 - (p.idealBz / maxAxis) * (plotHeight / 2 - padY),
      }));
      axisCurve.geometry.dispose();
      axisCurve.geometry = new THREE.BufferGeometry().setFromPoints(axisPoints.map((p) => new THREE.Vector3(p.x, p.y, 0)));
      idealCurve.geometry.dispose();
      idealCurve.geometry = new THREE.BufferGeometry().setFromPoints(idealPoints.map((p) => new THREE.Vector3(p.x, p.y, 0)));
      axisCurve.visible = state.step >= 4;
      idealCurve.visible = state.step >= 4 && state.showIdeal;

      setFieldData({
        axis: axisSamples,
        centerB: biotSavartFieldAtPoint(new THREE.Vector3(0, 0, 0), physicalSegments, state.currentA, state.currentDir).z,
        idealCenterB: finiteSolenoidAxisField(0, radiusM, lengthM, state.turns, state.currentA, state.currentDir),
        probeMag,
        maxAxis,
      });

      groups.axes.visible = true;
      groups.labels.visible = true;
      updateLabelScale();
    }

    appRef.current = {
      setStep(v) {
        state.step = v;
        const messages = {
          1: "Step 1: one loop. The field is clearly tied to the current ring, not to a perfect uniform cylinder.",
          2: "Step 2: stack loops. The inside arrows begin to line up and reinforce each other.",
          3: "Step 3: a finite solenoid. The center field is close to uniform, but the ends still fringe.",
          4: "Step 4: compare the real finite-coil field with the long-solenoid approximation B ≈ μ0 n I.",
        };
        setMessage(messages[v]);
        rebuildCoil();
      },
      setCurrentA(v) {
        state.currentA = v;
        rebuildCoil();
      },
      setTurns(v) {
        state.turns = v;
        rebuildCoil();
      },
      setLengthCm(v) {
        state.lengthCm = v;
        rebuildCoil();
      },
      setRadiusCm(v) {
        state.radiusCm = v;
        rebuildCoil();
      },
      setProbeFrac(v) {
        state.probeFrac = v;
        rebuildCoil();
      },
      setCurrentDir(v) {
        state.currentDir = v;
        rebuildCoil();
      },
      setShowIdeal(v) {
        state.showIdeal = v;
        idealCurve.visible = state.step >= 4 && v;
      },
      setLabelScale(v) {
        state.labelScale = v;
        updateLabelScale();
      },
      view(name) {
        if (name === "default") defaultView();
        if (name === "side") sideView();
        if (name === "end") endView();
      },
      reset() {
        state.step = 1;
        state.currentA = 6;
        state.turns = 14;
        state.lengthCm = 18;
        state.radiusCm = 4;
        state.probeFrac = 0;
        state.currentDir = 1;
        state.showIdeal = true;
        state.labelScale = 1;
        setMessage("Step 1: one loop. The field is clearly tied to the current ring, not to a perfect uniform cylinder.");
        rebuildCoil();
        defaultView();
      },
    };

    let dragging = false;
    let panning = false;
    let lastX = 0;
    let lastY = 0;
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
    renderer.domElement.addEventListener("pointerdown", (e) => {
      panning = e.button === 2 || e.shiftKey;
      dragging = !panning;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.style.cursor = panning ? "move" : "grabbing";
      renderer.domElement.setPointerCapture(e.pointerId);
    });
    renderer.domElement.addEventListener("pointermove", (e) => {
      if (!dragging && !panning) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (panning) {
        const panScale = state.dist * 0.001;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
        const up = camera.up.clone().normalize();
        const pan = right.multiplyScalar(-dx * panScale).add(up.multiplyScalar(dy * panScale));
        target.add(pan);
        camera.position.add(pan);
      } else {
        state.vTheta = -dx * 0.005;
        state.vPhi = dy * 0.005;
      }
    });
    const endDrag = (e) => {
      dragging = false;
      panning = false;
      renderer.domElement.style.cursor = "grab";
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {}
    };
    renderer.domElement.addEventListener("pointerup", endDrag);
    renderer.domElement.addEventListener("pointercancel", endDrag);
    renderer.domElement.addEventListener("wheel", (e) => {
      e.preventDefault();
      state.vZoom += e.deltaY * 0.0018;
    }, { passive: false });
    renderer.domElement.addEventListener("dblclick", defaultView);

    let raf = 0;
    function animate() {
      raf = requestAnimationFrame(animate);
      state.theta += state.vTheta;
      state.phi += state.vPhi;
      state.dist += state.vZoom;
      state.phi = clamp(state.phi, 0.15, Math.PI - 0.15);
      state.dist = clamp(state.dist, 4.8, 18);
      state.vTheta *= 0.9;
      state.vPhi *= 0.9;
      state.vZoom *= 0.84;
      updateCamera();
      renderer.render(scene, camera);
    }

    rebuildCoil();
    defaultView();
    setMessage("Step 1: one loop. The field is clearly tied to the current ring, not to a perfect uniform cylinder.");
    animate();

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      appRef.current = null;
    };
  }, []);

  useEffect(() => { appRef.current?.setStep(step); }, [step]);
  useEffect(() => { appRef.current?.setCurrentA(currentA); }, [currentA]);
  useEffect(() => { appRef.current?.setTurns(turns); }, [turns]);
  useEffect(() => { appRef.current?.setLengthCm(lengthCm); }, [lengthCm]);
  useEffect(() => { appRef.current?.setRadiusCm(radiusCm); }, [radiusCm]);
  useEffect(() => { appRef.current?.setProbeFrac(probeFrac); }, [probeFrac]);
  useEffect(() => { appRef.current?.setCurrentDir(currentDir); }, [currentDir]);
  useEffect(() => { appRef.current?.setShowIdeal(showIdeal); }, [showIdeal]);
  useEffect(() => { appRef.current?.setLabelScale(labelScale); }, [labelScale]);

  const radiusM = radiusCm / 100;
  const lengthM = lengthCm / 100;
  const turnsPerM = turns / Math.max(lengthM, 1e-9);
  const idealB = MU0 * turnsPerM * currentA;
  const centerB = Math.abs(fieldData.centerB);
  const centerError = idealB > 0 ? Math.abs((centerB - idealB) / idealB) * 100 : 0;
  const plotWidth = 660;
  const plotHeight = 250;
  const padX = 34;
  const padY = 30;
  const zMin = -(lengthM / 2 + radiusM * 0.9);
  const zMax = lengthM / 2 + radiusM * 0.9;
  const domain = zMax - zMin || 1;
  const maxAxis = Math.max(fieldData.maxAxis, idealB, 1e-7);
  const axisPath = makeCurvePath(
    fieldData.axis.map((p) => ({
      x: padX + ((p.z - zMin) / domain) * (plotWidth - padX * 2),
      y: plotHeight / 2 - (p.Bz / maxAxis) * (plotHeight / 2 - padY),
    }))
  );
  const idealPath = makeCurvePath(
    fieldData.axis.map((p) => ({
      x: padX + ((p.z - zMin) / domain) * (plotWidth - padX * 2),
      y: plotHeight / 2 - (p.idealBz / maxAxis) * (plotHeight / 2 - padY),
    }))
  );
  const leftEndX = padX + ((-lengthM / 2 - zMin) / domain) * (plotWidth - padX * 2);
  const rightEndX = padX + ((lengthM / 2 - zMin) / domain) * (plotWidth - padX * 2);

  const stepTitle = {
    1: "One loop: the seed of the field",
    2: "Stacked loops: inside fields start adding",
    3: "Finite solenoid: center field plus fringing ends",
    4: "Finite coil vs long-solenoid approximation",
  }[step];

  const stepHint = {
    1: "A single current loop already creates a field. Notice that the loop itself is the source, not a uniform cylinder.",
    2: "Many loops stacked together reinforce the axial field inside the winding and weaken the field outside. The moving slice plane marks the local cross-section.",
    3: "A real solenoid is finite, so the field bends outward near the ends instead of staying perfectly uniform. Watch the slice plane move with the probe.",
    4: "The dashed curve is the textbook long-solenoid estimate B ≈ μ0 n I. It is useful near the center, not at the ends.",
  }[step];

  const focus = {
    1: "Follow the red current arrows on the wire and the cyan B arrow through the loop.",
    2: "Look for the inside B arrows lining up while the red current arrows still trace the winding.",
    3: "Watch the end fringing, the moving probe, and the weaker outside field.",
    4: "Compare the finite-coil curve with the dashed μ0 n I guide and note where they differ.",
  }[step];

  const legendItems = [
    { color: "bg-rose-400", title: "Red arrows", body: "Conventional current I flowing around the wire." },
    { color: "bg-cyan-300", title: "Cyan arrows", body: "Magnetic field B sampled at points in space." },
    { color: "bg-amber-300", title: "Orange arrow", body: "Field at the movable probe position." },
    { color: "bg-violet-300", title: "Violet plane", body: "Moving cross-section through the solenoid." },
    { color: "bg-amber-400/80", title: "Amber dashed line", body: "Long-solenoid guide B ≈ μ0 n I." },
  ];

  const rhsSteps = [
    "Curl your fingers in the direction of the red current arrows.",
    "Your thumb points along the magnetic field through the loop and along the solenoid axis.",
    "Reverse the current and the thumb flips, so B reverses too.",
  ];

  const teacherPrimer = [
    "Red arrows show conventional current I along the wire path.",
    "Cyan arrows show the magnetic field B sampled at points in space.",
    "Orange shows the local probe field; amber dashed shows the long-solenoid guide B ≈ μ0 n I.",
    "The violet plane is a moving cross-section tied to the probe position.",
  ];

  const modelAssumptions = [
    "This is a finite wire model, not an infinite ideal solenoid.",
    "The plot shows Bz on the solenoid axis, not the full 3D field everywhere.",
    "Zero outside is only a limiting approximation; the real outside field is weaker, not zero.",
  ];

  const btn = (active) =>
    `rounded-xl border px-3 py-2 text-sm transition ${
      active ? "border-cyan-300 bg-cyan-500/25 text-cyan-50" : "border-white/15 bg-white/10 hover:bg-white/20"
    }`;
  const stepBtn = (active) =>
    `flex h-14 min-w-[3.75rem] items-center justify-center rounded-2xl border px-5 text-lg font-bold transition shadow-sm ${
      active
        ? "border-cyan-200 bg-cyan-300 text-slate-950 shadow-cyan-300/30"
        : "border-slate-500 bg-slate-800/95 text-slate-100 hover:border-cyan-200 hover:bg-slate-700"
    }`;

  return (
    <div className="min-h-screen w-full bg-slate-950 p-4 text-white">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="space-y-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">VizLab</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Solenoid Field Lab</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
              A finite-coil Biot-Savart model with a long-solenoid comparison. The goal is to show why stacked loops create an almost uniform
              field inside and a weaker return field outside.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/95 text-white shadow-soft">
            <div className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <div className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">Step {step}</div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">{stepTitle}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{stepHint}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">Focus: {focus}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {[1, 2, 3, 4].map((s) => (
                    <button key={s} className={stepBtn(step === s)} onClick={() => setStep(s)}>
                      {s}
                    </button>
                  ))}
                  <button className={btn(currentDir < 0)} onClick={() => setCurrentDir((v) => -v)}>
                    <ArrowRightLeft className="mr-2 inline h-4 w-4" />
                    Reverse current
                  </button>
                  <button
                    className={btn(false)}
                    onClick={() => {
                      setStep(1);
                      setCurrentA(6);
                      setTurns(14);
                      setLengthCm(18);
                      setRadiusCm(4);
                      setProbeFrac(0);
                      setCurrentDir(1);
                      setShowIdeal(true);
                      setLabelScale(1);
                      appRef.current?.reset();
                    }}
                  >
                    <RotateCcw className="mr-2 inline h-4 w-4" />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="relative overflow-hidden rounded-3xl border border-slate-700 bg-black shadow-2xl" style={{ height: "72vh" }}>
          <div ref={mountRef} className="absolute inset-0" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-cyan-100">Read this first</div>
              <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Teacher primer</div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {teacherPrimer.map((item) => (
                <div key={item} className="rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-4 text-sm leading-6 text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white">
            <div className="text-sm font-semibold text-slate-100">Model assumptions</div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              {modelAssumptions.map((item) => (
                <li key={item} className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-100">Legend</div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">How to read the scene</div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {legendItems.map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <div className="flex items-center gap-3">
                    <span className={`h-3 w-3 rounded-full ${item.color}`} />
                    <div className="font-semibold text-slate-100">{item.title}</div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white">
            <div className="text-sm font-semibold text-slate-100">Right-hand rule</div>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              {rhsSteps.map((stepText, index) => (
                <li key={stepText} className="flex gap-3 rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-xs font-bold text-cyan-200">
                    {index + 1}
                  </div>
                  <span>{stepText}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 text-white">
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm font-semibold text-slate-100">Controls</div>
              <div className="text-xs text-slate-400">Drag to rotate, right-drag or Shift+drag to pan, scroll to zoom</div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1 flex justify-between text-sm font-medium text-cyan-100">
                  <span>Probe position on axis</span>
                  <span>{fmt(probeFrac, 2)}</span>
                </label>
                <input
                  className="w-full accent-cyan-400"
                  type="range"
                  min="-0.92"
                  max="0.92"
                  step="0.01"
                  value={probeFrac}
                  onChange={(e) => setProbeFrac(Number(e.target.value))}
                />
                <p className="mt-1 text-xs text-slate-400">Only used in steps 3 and 4.</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <button className={btn(false)} onClick={() => appRef.current?.view("default")}>Default view</button>
                <button className={btn(false)} onClick={() => appRef.current?.view("side")}>Side view</button>
                <button className={btn(false)} onClick={() => appRef.current?.view("end")}>End-on view</button>
              </div>
            </div>

            <details className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-100">Advanced geometry</summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-1 flex justify-between text-sm text-slate-200"><span>Current</span><span>{fmt(currentA, 1)} A</span></label>
                  <input className="w-full accent-cyan-400" type="range" min="0.5" max="18" step="0.1" value={currentA} onChange={(e) => setCurrentA(Number(e.target.value))} />
                </div>
                <div>
                  <label className="mb-1 flex justify-between text-sm text-slate-200"><span>Turns</span><span>{turns}</span></label>
                  <input className="w-full accent-cyan-400" type="range" min="4" max="28" step="1" value={turns} onChange={(e) => setTurns(Number(e.target.value))} />
                </div>
                <div>
                  <label className="mb-1 flex justify-between text-sm text-slate-200"><span>Length</span><span>{lengthCm} cm</span></label>
                  <input className="w-full accent-cyan-400" type="range" min="10" max="30" step="1" value={lengthCm} onChange={(e) => setLengthCm(Number(e.target.value))} />
                </div>
                <div>
                  <label className="mb-1 flex justify-between text-sm text-slate-200"><span>Radius</span><span>{radiusCm} cm</span></label>
                  <input className="w-full accent-cyan-400" type="range" min="2" max="8" step="0.1" value={radiusCm} onChange={(e) => setRadiusCm(Number(e.target.value))} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button className={btn(showIdeal)} onClick={() => setShowIdeal((v) => !v)}>
                  {showIdeal ? "Hide ideal guide" : "Show ideal guide"}
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button className={btn(false)} onClick={() => setLabelScale((v) => Math.max(0.6, v - 0.1))}>Text−</button>
                  <button className={btn(false)} onClick={() => setLabelScale((v) => Math.min(1.7, v + 0.1))}>Text+</button>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="rounded-2xl border border-slate-700 bg-slate-900 text-white">
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-100">What to notice</div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Biot-Savart sum</div>
              </div>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-300 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">1. Loop</div>
                  <p className="mt-2">The red arrows show current I around the wire. That current generates the cyan B field.</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">2. Stack</div>
                  <p className="mt-2">Many loops add inside the coil, so the axial field grows more uniform near the center.</p>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">3. Ends</div>
                  <p className="mt-2">A finite solenoid still fringes at the ends, so the outside field is weaker, not zero.</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-400">
                The dashed guide is the long-solenoid approximation, useful near the center but not exact at the ends. It uses n = N/L in the
                formula B ≈ μ0 n I.
              </p>
              <details className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-100">Accuracy notes</summary>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  <li>The outside field is weaker, not zero. Zero outside is only the ideal long-solenoid approximation.</li>
                  <li>The interior field is approximately uniform only near the center, away from the ends.</li>
                  <li>Reversing the current flips the field direction by the right-hand rule.</li>
                </ul>
              </details>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900 text-white">
            <div className="p-5">
              <div className="text-sm font-semibold text-slate-100">Current values</div>
              <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-300">
                <div className="font-semibold text-slate-100">Symbols</div>
                <div className="mt-2 grid gap-1">
                  <div><span className="text-cyan-300">I</span> = current in amperes</div>
                  <div><span className="text-cyan-300">N</span> = number of turns</div>
                  <div><span className="text-cyan-300">L</span> = solenoid length in meters</div>
                  <div><span className="text-cyan-300">n = N/L</span> = turns per meter</div>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Center field</div>
                  <div className="mt-2 text-2xl font-semibold text-cyan-100">{fmt(centerB * 1000, 3)} mT</div>
                  <div className="mt-1 text-sm text-slate-400">Numerical finite-coil sum at z = 0</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Guide</div>
                    <div className="mt-2 text-xl font-semibold text-amber-100">{fmt(idealB * 1000, 3)} mT</div>
                    <div className="mt-1 text-sm text-slate-400">μ0 n I</div>
                  </div>
                  <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Center error</div>
                    <div className="mt-2 text-xl font-semibold text-rose-100">{fmt(centerError, 1)}%</div>
                    <div className="mt-1 text-sm text-slate-400">Finite coil vs guide</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Turns per meter</div>
                  <div className="mt-2 text-xl font-semibold text-slate-100">{fmt(turnsPerM, 2)} turns/m</div>
                  <div className="mt-1 text-sm text-slate-400">Used by the long-solenoid approximation</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {step >= 4 && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900 text-white">
            <div className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold">On-axis field profile</h2>
                  <p className="mt-1 text-sm text-slate-400">Cyan: finite coil sum. Amber dashed: long-solenoid approximation.</p>
                </div>
                <div className="text-sm text-slate-400">Fringing becomes important near the ends.</div>
              </div>
              <svg viewBox={`0 0 ${plotWidth} ${plotHeight}`} className="mt-4 h-[280px] w-full rounded-2xl bg-slate-950">
                <rect x="0" y="0" width={plotWidth} height={plotHeight} rx="18" fill="#020617" stroke="#1f2937" />
                <line x1={padX} y1={plotHeight / 2} x2={plotWidth - padX} y2={plotHeight / 2} stroke="#64748b" strokeWidth="1.5" />
                <line x1={leftEndX} y1={padY * 0.8} x2={leftEndX} y2={plotHeight - padY * 0.9} stroke="#334155" strokeDasharray="6 5" />
                <line x1={rightEndX} y1={padY * 0.8} x2={rightEndX} y2={plotHeight - padY * 0.9} stroke="#334155" strokeDasharray="6 5" />
                <text x={leftEndX - 6} y={padY * 0.65} textAnchor="end" fontSize="12" fill="#94a3b8">-L/2</text>
                <text x={rightEndX + 6} y={padY * 0.65} fontSize="12" fill="#94a3b8">+L/2</text>
                <path d={axisPath} fill="none" stroke="#67e8f9" strokeWidth="3.2" />
                {showIdeal && <path d={idealPath} fill="none" stroke="#f59e0b" strokeWidth="2.6" strokeDasharray="8 6" />}
                <text x={padX + 6} y={padY + 6} fontSize="12" fontWeight="700" fill="#67e8f9">finite coil</text>
                {showIdeal && <text x={plotWidth - 124} y={padY + 6} fontSize="12" fontWeight="700" fill="#f59e0b">μ0 n I guide</text>}
                <text x={plotWidth - 20} y={plotHeight / 2 - 6} fontSize="12" fill="#94a3b8" textAnchor="end">0 T</text>
                <text x={18} y={18} fontSize="12" fill="#94a3b8">Bz on axis (T)</text>
                <text x={plotWidth - 18} y={plotHeight - 12} fontSize="12" fill="#94a3b8" textAnchor="end">z (m)</text>
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
