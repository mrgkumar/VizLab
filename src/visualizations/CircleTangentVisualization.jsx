import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function CircleTangentVisualization() {
  const mountRef = useRef(null);
  const appRef = useRef(null);
  const [step, setStep] = useState(1);
  const [aDeg, setADeg] = useState(45);
  const [currentDir, setCurrentDir] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [showPlaneGlow, setShowPlaneGlow] = useState(true);
  const [showGridGlow, setShowGridGlow] = useState(true);
  const [showDB, setShowDB] = useState(false);
  const [showNetB, setShowNetB] = useState(false);
  const [labelScale, setLabelScale] = useState(1);
  const [message, setMessage] = useState(
    "Step 1: Move A with the slider. The current element dℓ always follows the tangent to the loop."
  );

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080d);

    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.88));
    const light = new THREE.DirectionalLight(0xffffff, 1.15);
    light.position.set(5, 6, 7);
    scene.add(light);

    const R = 3;
    const B = new THREE.Vector3(0, 0, 3);
    const O = new THREE.Vector3(0, 0, 0);
    const target = new THREE.Vector3(0, 0, 0.85);
    const state = {
      alpha: Math.PI / 4,
      currentDir: 1,
      step: 1,
      showGrid: true,
      showAxes: true,
      showPlaneGlow: true,
      showGridGlow: true,
      showDB: false,
      showNetB: false,
      labelScale: 1,
      theta: Math.PI / 4,
      phi: Math.PI / 3,
      dist: 8.5,
      vTheta: 0,
      vPhi: 0,
      vZoom: 0,
      planeTime: 0,
      gridTime: 0,
      decompTime: 0,
    };

    const groups = {
      circle: new THREE.Group(),
      radius: new THREE.Group(),
      tangent: new THREE.Group(),
      ab: new THREE.Group(),
      components: new THREE.Group(),
      plane: new THREE.Group(),
      angles: new THREE.Group(),
      labels: new THREE.Group(),
      points: new THREE.Group(),
      axes: new THREE.Group(),
      grid: new THREE.Group(),
      cross: new THREE.Group(),
      netfield: new THREE.Group(),
    };
    Object.values(groups).forEach((g) => scene.add(g));

    function geom() {
      const A = new THREE.Vector3(R * Math.cos(state.alpha), R * Math.sin(state.alpha), 0);
      const tangent = new THREE.Vector3(-Math.sin(state.alpha), Math.cos(state.alpha), 0).normalize();
      const AB = B.clone().sub(A);
      const rHat = AB.clone().normalize();
      const dlDir = tangent.clone().multiplyScalar(state.currentDir).normalize();
      const crossDir = dlDir.clone().cross(rHat).normalize();
      return { A, tangent, AB, rHat, dlDir, crossDir, abNormal: rHat };
    }

    function makeLine(group, a, b, color, opacity = 1) {
      const mat = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), mat);
      group.add(line);
      return line;
    }

    function setLine(line, a, b) {
      line.geometry.setFromPoints([a, b]);
      line.geometry.computeBoundingSphere();
    }

    function makeSphere(group, p, color, radius) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 32),
        new THREE.MeshStandardMaterial({ color })
      );
      mesh.position.copy(p);
      group.add(mesh);
      return mesh;
    }

    function makeLabel(group, text, p, color = "#ffffff", scale = 0.75) {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 192;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      ctx.font = "bold 54px Arial";
      ctx.fillText(text, 24, 94);
      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
      sprite.userData.baseScale = scale;
      sprite.position.copy(p);
      group.add(sprite);
      return sprite;
    }

    function applyLabelScale() {
      [groups.labels, groups.axes, groups.angles, groups.components, groups.cross, groups.netfield, groups.grid].forEach((group) => {
        group.children.forEach((obj) => {
          if (obj instanceof THREE.Sprite && obj.userData.baseScale) {
            const s = obj.userData.baseScale * state.labelScale;
            obj.scale.set(s * 2.2, s * 0.82, 1);
          }
        });
      });
    }

    function makeAngleArc(center, dir1, dir2, radius) {
      const u = dir1.clone().normalize();
      const n = new THREE.Vector3().crossVectors(dir1, dir2).normalize();
      const v = new THREE.Vector3().crossVectors(n, u).normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, u.dot(dir2.clone().normalize()))));
      const pts = [];
      for (let i = 0; i <= 44; i++) {
        const t = (i / 44) * angle;
        pts.push(center.clone().add(u.clone().multiplyScalar(Math.cos(t) * radius)).add(v.clone().multiplyScalar(Math.sin(t) * radius)));
      }
      return pts;
    }

    const axes = new THREE.AxesHelper(5.2);
    groups.axes.add(axes);
    makeLabel(groups.axes, "+X", new THREE.Vector3(5.7, 0, 0), "#ff6b6b", 0.42);
    makeLabel(groups.axes, "+Y", new THREE.Vector3(0, 5.7, 0), "#6bff95", 0.42);
    makeLabel(groups.axes, "+Z", new THREE.Vector3(0, 0, 5.9), "#7db7ff", 0.42);

    const majorGrid = new THREE.GridHelper(8, 16, 0x5c6b96, 0x33405f);
    majorGrid.rotation.x = Math.PI / 2;
    majorGrid.material.transparent = true;
    majorGrid.material.opacity = 0.42;
    groups.grid.add(majorGrid);
    const minorGrid = new THREE.GridHelper(8, 32, 0x273149, 0x1e2638);
    minorGrid.rotation.x = Math.PI / 2;
    minorGrid.material.transparent = true;
    minorGrid.material.opacity = 0.22;
    groups.grid.add(minorGrid);
    makeLabel(groups.grid, "xy plane", new THREE.Vector3(3.6, -3.8, 0.02), "#8ea2d6", 0.44);
    makeLabel(groups.grid, "z-axis", new THREE.Vector3(0.35, 0.2, 4.6), "#9fdcff", 0.42);

    const squareGlowLines = [];
    for (let s = 0.5; s <= 4.0; s += 0.5) {
      const z = 0.006;
      const pts = [
        new THREE.Vector3(-s, -s, z), new THREE.Vector3(s, -s, z), new THREE.Vector3(s, s, z),
        new THREE.Vector3(-s, s, z), new THREE.Vector3(-s, -s, z),
      ];
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0 })
      );
      line.userData.size = s;
      groups.grid.add(line);
      squareGlowLines.push(line);
    }

    const circlePts = [];
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * Math.PI * 2;
      circlePts.push(new THREE.Vector3(R * Math.cos(t), R * Math.sin(t), 0));
    }
    groups.circle.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePts), new THREE.LineBasicMaterial({ color: 0x4da3ff })));

    let g = geom();
    const radiusLine = makeLine(groups.radius, O, g.A, 0xffe45c);
    const tangentGuide = makeLine(groups.tangent, g.A.clone().add(g.tangent.clone().multiplyScalar(-2.3)), g.A.clone().add(g.tangent.clone().multiplyScalar(2.3)), 0xff4d4d, 0.28);
    const dlArrow = new THREE.ArrowHelper(g.dlDir, g.A.clone().add(g.dlDir.clone().multiplyScalar(-1.2)), 2.4, 0xff4d4d, 0.35, 0.2);
    groups.tangent.add(dlArrow);
    const abLine = makeLine(groups.ab, g.A, B, 0x20e68a);
    const rArrow = new THREE.ArrowHelper(g.rHat, g.A, g.AB.length() * 0.92, 0x7dff7d, 0.26, 0.14);
    groups.ab.add(rArrow);
    const aoLine = makeLine(groups.components, g.A, O, 0xffe45c, 0.82);
    const obLine = makeLine(groups.components, O, B, 0xffffff, 0.88);
    makeLine(groups.components, new THREE.Vector3(0, 0, -0.4), new THREE.Vector3(0, 0, 4), 0xffffff, 0.35);

    const planeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 4.8),
      new THREE.MeshBasicMaterial({ color: 0xbb88ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
    );
    const planeOutline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(4.8, 4.8)),
      new THREE.LineBasicMaterial({ color: 0xddbbff, transparent: true, opacity: 0.65 })
    );
    groups.plane.add(planeMesh, planeOutline);

    const pointA = makeSphere(groups.points, g.A, 0xff4d4d, 0.15);
    makeSphere(groups.points, O, 0xffffff, 0.11);
    makeSphere(groups.points, B, 0x20e68a, 0.15);

    const labelA = makeLabel(groups.labels, "A", g.A.clone().add(new THREE.Vector3(0.28, 0.28, 0.15)));
    makeLabel(groups.labels, "O", O.clone().add(new THREE.Vector3(0.22, -0.28, 0.1)));
    makeLabel(groups.labels, "B", B.clone().add(new THREE.Vector3(0.25, 0.25, 0.2)));
    const labelOA = makeLabel(groups.labels, "OA", O.clone().lerp(g.A, 0.52).add(new THREE.Vector3(0, 0, 0.18)), "#ffe45c", 0.48);
    const labelAB = makeLabel(groups.labels, "AB", g.A.clone().lerp(B, 0.48).add(new THREE.Vector3(0.12, 0.1, 0.16)), "#20e68a", 0.48);
    const labelR = makeLabel(groups.labels, "r̂", g.A.clone().lerp(B, 0.68).add(new THREE.Vector3(-0.18, 0.16, 0.1)), "#7dff7d", 0.54);
    makeLabel(groups.labels, "B lies on z-axis", B.clone().add(new THREE.Vector3(0.7, 0.15, 0.1)), "#9fdcff", 0.4);
    const labelDL = makeLabel(groups.labels, "current element dℓ", g.A.clone().add(g.dlDir.clone().multiplyScalar(1.75)).add(new THREE.Vector3(0, 0, 0.16)), "#ff4d4d", 0.46);
    const labelAO = makeLabel(groups.components, "AO", g.A.clone().lerp(O, 0.45).add(new THREE.Vector3(-0.2, 0.12, 0.05)), "#ffe45c", 0.44);
    makeLabel(groups.components, "OB", O.clone().lerp(B, 0.55).add(new THREE.Vector3(0.18, 0.18, 0)), "#ffffff", 0.44);

    const angleAB = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffaa2b }));
    const angleOA = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffaa2b }));
    groups.angles.add(angleAB, angleOA);
    const labelAng1 = makeLabel(groups.angles, "90°", g.A, "#ffaa2b", 0.52);
    const labelAng2 = makeLabel(groups.angles, "90°", g.A, "#ffaa2b", 0.52);

    const crossArrow = new THREE.ArrowHelper(g.crossDir, B, 1.55, 0xff66ff, 0.3, 0.18);
    groups.cross.add(crossArrow);
    const labelCross = makeLabel(groups.cross, "dB ∝ dℓ × r̂", B.clone().add(g.crossDir.clone().multiplyScalar(1.85)), "#ff88ff", 0.48);
    const netBArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, state.currentDir), B.clone().add(new THREE.Vector3(0.22, 0.22, 0)), 1.45, 0x66ffcc, 0.3, 0.18);
    groups.netfield.add(netBArrow);
    makeLabel(groups.netfield, "net B of loop", B.clone().add(new THREE.Vector3(0.48, 0.48, 1.65)), "#66ffcc", 0.45);

    function updatePlane() {
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), g.abNormal);
      planeMesh.position.copy(g.A);
      planeOutline.position.copy(g.A);
      planeMesh.quaternion.copy(q);
      planeOutline.quaternion.copy(q);
    }

    function updateAngles() {
      angleAB.geometry.setFromPoints(makeAngleArc(g.A, g.dlDir, g.AB, 0.72));
      angleOA.geometry.setFromPoints(makeAngleArc(g.A, g.A.clone().sub(O), g.dlDir, 0.48));
      labelAng1.position.copy(g.A.clone().add(g.dlDir.clone().multiplyScalar(1.1)).add(new THREE.Vector3(0.05, 0.05, 0.1)));
      labelAng2.position.copy(g.A.clone().add(g.tangent.clone().multiplyScalar(-0.3)).add(new THREE.Vector3(0.1, 0.1, 0.1)));
    }

    function updateGeometry() {
      g = geom();
      console.assert(Math.abs(g.dlDir.dot(g.AB)) < 1e-8, "dℓ should be perpendicular to AB");
      console.assert(Math.abs(g.crossDir.dot(g.dlDir)) < 1e-8, "dB should be perpendicular to dℓ");
      console.assert(Math.abs(g.crossDir.dot(g.rHat)) < 1e-8, "dB should be perpendicular to rHat");

      setLine(radiusLine, O, g.A);
      setLine(tangentGuide, g.A.clone().add(g.tangent.clone().multiplyScalar(-2.3)), g.A.clone().add(g.tangent.clone().multiplyScalar(2.3)));
      dlArrow.position.copy(g.A.clone().add(g.dlDir.clone().multiplyScalar(-1.2)));
      dlArrow.setDirection(g.dlDir);
      setLine(abLine, g.A, B);
      rArrow.position.copy(g.A);
      rArrow.setDirection(g.rHat);
      rArrow.setLength(g.AB.length() * 0.92, 0.26, 0.14);
      pointA.position.copy(g.A);
      labelA.position.copy(g.A.clone().add(new THREE.Vector3(0.28, 0.28, 0.15)));
      labelOA.position.copy(O.clone().lerp(g.A, 0.52).add(new THREE.Vector3(0, 0, 0.18)));
      labelAB.position.copy(g.A.clone().lerp(B, 0.48).add(new THREE.Vector3(0.12, 0.1, 0.16)));
      labelR.position.copy(g.A.clone().lerp(B, 0.68).add(new THREE.Vector3(-0.18, 0.16, 0.1)));
      labelDL.position.copy(g.A.clone().add(g.dlDir.clone().multiplyScalar(1.75)).add(new THREE.Vector3(0, 0, 0.16)));
      labelAO.position.copy(g.A.clone().lerp(O, 0.45).add(new THREE.Vector3(-0.2, 0.12, 0.05)));
      crossArrow.setDirection(g.crossDir);
      labelCross.position.copy(B.clone().add(g.crossDir.clone().multiplyScalar(1.85)));
      netBArrow.setDirection(new THREE.Vector3(0, 0, state.currentDir));
      updatePlane();
      updateAngles();
    }

    function updateVisibility() {
      groups.grid.visible = state.showGrid;
      groups.axes.visible = state.showAxes;
      groups.labels.visible = state.step >= 2;
      groups.ab.visible = state.step >= 2;
      groups.components.visible = state.step >= 3;
      groups.plane.visible = state.step >= 4;
      groups.angles.visible = state.step >= 5;
      groups.cross.visible = state.showDB && state.step >= 4;
      groups.netfield.visible = state.showNetB && state.step >= 4;
    }

    function updateCamera() {
      camera.position.set(
        target.x + state.dist * Math.sin(state.phi) * Math.cos(state.theta),
        target.y + state.dist * Math.sin(state.phi) * Math.sin(state.theta),
        target.z + state.dist * Math.cos(state.phi)
      );
      camera.lookAt(target);
    }

    function syncSpherical() {
      const o = camera.position.clone().sub(target);
      state.dist = o.length();
      state.theta = Math.atan2(o.y, o.x);
      state.phi = Math.acos(Math.max(-1, Math.min(1, o.z / state.dist)));
    }

    function setView(position, lookAt, up = new THREE.Vector3(0, 0, 1)) {
      state.vTheta = 0;
      state.vPhi = 0;
      state.vZoom = 0;
      target.copy(lookAt);
      camera.up.copy(up);
      camera.position.copy(position);
      camera.lookAt(target);
      syncSpherical();
    }

    function defaultView() {
      setView(new THREE.Vector3(6.2, 6.2, 5.4), new THREE.Vector3(0, 0, 0.85));
    }

    appRef.current = {
      setStep(v) { state.step = v; updateVisibility(); },
      setAlphaDeg(v) { state.alpha = (v * Math.PI) / 180; updateGeometry(); },
      setCurrentDir(v) { state.currentDir = v; updateGeometry(); },
      setShowGrid(v) { state.showGrid = v; updateVisibility(); },
      setShowAxes(v) { state.showAxes = v; updateVisibility(); },
      setShowPlaneGlow(v) { state.showPlaneGlow = v; },
      setShowGridGlow(v) { state.showGridGlow = v; },
      setShowDB(v) { state.showDB = v; updateVisibility(); },
      setShowNetB(v) { state.showNetB = v; updateVisibility(); },
      setLabelScale(v) { state.labelScale = v; applyLabelScale(); },
      view(name) {
        if (name === "default") defaultView();
        if (name === "top") setView(new THREE.Vector3(0, 0, 9), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
        if (name === "side") setView(new THREE.Vector3(6.5, -6.5, 2.4), new THREE.Vector3(0.95, 0.95, 1.05));
        if (name === "ab") setView(g.A.clone().add(g.abNormal.clone().multiplyScalar(8)), g.A, g.dlDir);
        if (name === "plane") setView(g.A.clone().add(g.dlDir.clone().multiplyScalar(5.5)).add(g.abNormal.clone().multiplyScalar(4)), g.A);
        if (name === "tangent") setView(g.A.clone().add(g.dlDir.clone().multiplyScalar(8)), g.A, g.abNormal);
      },
      reset() {
        state.alpha = Math.PI / 4;
        state.currentDir = 1;
        updateGeometry();
        defaultView();
      },
    };

    let dragging = false, panning = false, lastX = 0, lastY = 0;
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
        const right = new THREE.Vector3();
        camera.getWorldDirection(right);
        right.cross(camera.up).normalize();
        const up = camera.up.clone().normalize();
        const pan = right.multiplyScalar(-dx * panScale).add(up.multiplyScalar(dy * panScale));
        target.add(pan);
        camera.position.add(pan);
        syncSpherical();
      } else {
        state.vTheta = -dx * 0.0055;
        state.vPhi = dy * 0.0055;
      }
    });
    const stopDrag = (e) => {
      dragging = false;
      panning = false;
      renderer.domElement.style.cursor = "grab";
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch {}
    };
    renderer.domElement.addEventListener("pointerup", stopDrag);
    renderer.domElement.addEventListener("pointercancel", stopDrag);
    renderer.domElement.addEventListener("wheel", (e) => {
      e.preventDefault();
      state.vZoom += e.deltaY * 0.0018;
    }, { passive: false });
    renderer.domElement.addEventListener("dblclick", defaultView);

    function animate() {
      requestAnimationFrame(animate);
      state.theta += state.vTheta;
      state.phi += state.vPhi;
      state.dist += state.vZoom;
      state.phi = Math.max(0.12, Math.min(Math.PI - 0.12, state.phi));
      state.dist = Math.max(4.5, Math.min(18, state.dist));
      state.vTheta *= 0.9;
      state.vPhi *= 0.9;
      state.vZoom *= 0.85;

      if (state.showGridGlow && state.showGrid) {
        state.gridTime += 0.016;
        squareGlowLines.forEach((line) => {
          const wave = 0.5 + 0.5 * Math.sin(2 * Math.PI * (0.1 * state.gridTime - line.userData.size * 0.16));
          const intensity = Math.pow(wave, 5);
          line.material.opacity = 0.05 + 0.78 * intensity;
          line.material.color.setHSL(0.58, 1, 0.58 + 0.24 * intensity);
        });
      } else {
        squareGlowLines.forEach((line) => { line.material.opacity = 0; });
      }

      state.planeTime += 0.028;
      if (state.showPlaneGlow) {
        planeMesh.material.opacity = 0.12 + 0.18 * (0.5 + 0.5 * Math.sin(state.planeTime));
        planeOutline.material.opacity = 0.48 + 0.52 * (0.5 + 0.5 * Math.sin(state.planeTime * 3));
      }

      if (state.step === 3) {
        state.decompTime += 0.012;
        const phase = (Math.sin(state.decompTime) + 1) * 0.5;
        const mid = g.A.clone().lerp(O, phase);
        setLine(aoLine, g.A, mid);
        setLine(obLine, mid, mid.clone().add(B.clone().sub(O)));
      } else {
        setLine(aoLine, g.A, O);
        setLine(obLine, O, B);
      }

      updateCamera();
      renderer.render(scene, camera);
    }

    applyLabelScale();
    updateGeometry();
    updateVisibility();
    defaultView();
    animate();

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
      appRef.current = null;
    };
  }, []);

  useEffect(() => {
    appRef.current?.setStep(step);
    const messages = {
      1: "Step 1: Move A with the slider. The current element dℓ always follows the tangent to the loop.",
      2: "Step 2: r points from current element A to observation point B. For axial B, dℓ remains perpendicular to r.",
      3: "Step 3: AB = AO + OB. dℓ is perpendicular to both AO and OB, so dℓ is perpendicular to AB.",
      4: "Step 4: AB acts as the normal of the purple plane. The tangent dℓ lies inside that plane.",
      5: "Step 5: The orange markers show the right angles: dℓ ⟂ AB and dℓ ⟂ OA.",
    };
    setMessage(messages[step]);
  }, [step]);

  useEffect(() => { appRef.current?.setAlphaDeg(aDeg); }, [aDeg]);
  useEffect(() => { appRef.current?.setCurrentDir(currentDir); }, [currentDir]);
  useEffect(() => { appRef.current?.setShowGrid(showGrid); }, [showGrid]);
  useEffect(() => { appRef.current?.setShowAxes(showAxes); }, [showAxes]);
  useEffect(() => { appRef.current?.setShowPlaneGlow(showPlaneGlow); }, [showPlaneGlow]);
  useEffect(() => { appRef.current?.setShowGridGlow(showGridGlow); }, [showGridGlow]);
  useEffect(() => { appRef.current?.setShowDB(showDB); }, [showDB]);
  useEffect(() => { appRef.current?.setShowNetB(showNetB); }, [showNetB]);
  useEffect(() => { appRef.current?.setLabelScale(labelScale); }, [labelScale]);

  const btn = (active) =>
    `rounded-xl border px-3 py-2 text-sm transition ${active ? "border-blue-300 bg-blue-500/30" : "border-white/20 bg-white/10 hover:bg-white/20"}`;

  return (
    <div className="min-h-screen w-full bg-gray-950 p-4 text-white">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-3xl font-bold">3D Visualization: Current Loop and Biot–Savart Direction</h1>
        <p className="mb-4 max-w-4xl text-gray-300">
          Move point A around the circular conductor and see how dℓ, r̂, dB, and net B update.
        </p>

        <div className="relative h-[76vh] w-full overflow-hidden rounded-2xl border border-gray-700 bg-black shadow-2xl">
          <div ref={mountRef} className="h-full w-full" />

          <div className="absolute left-3 top-3 max-w-sm rounded-2xl border border-white/15 bg-black/70 p-4 text-sm shadow-xl backdrop-blur">
            <div className="mb-2 text-lg font-bold">Current loop: why dℓ ⟂ r?</div>
            <div className="text-gray-300">Left drag: rotate · Right drag / Shift+drag: pan · Scroll: zoom</div>
            <div className="mt-3 border-t border-white/15 pt-3 text-blue-100">{message}</div>
            <div className="mt-3 space-y-1 text-xs">
              <div><span className="text-[#4da3ff]">Blue</span>: circular conductor</div>
              <div><span className="text-[#ff4d4d]">Red</span>: current element dℓ</div>
              <div><span className="text-[#20e68a]">Green</span>: r or AB from A to B</div>
              <div><span className="text-[#ff88ff]">Magenta</span>: dB from one element</div>
              <div><span className="text-[#66ffcc]">Cyan</span>: net B of full loop</div>
            </div>
          </div>

          <div className="absolute left-1/2 top-3 w-[min(520px,44vw)] -translate-x-1/2 rounded-2xl border border-white/15 bg-black/70 p-3 shadow-xl backdrop-blur">
            <label className="mb-1 flex justify-between text-sm font-semibold text-blue-100">
              <span>Move point A around circumference</span><span>{aDeg}°</span>
            </label>
            <input className="w-full accent-red-500" type="range" min="0" max="360" value={aDeg} onChange={(e) => setADeg(Number(e.target.value))} />
          </div>

          <div className="absolute right-3 top-3 flex flex-col gap-2 rounded-2xl border border-white/15 bg-black/70 p-3 shadow-xl backdrop-blur">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-100">Stable Camera Views</div>
            <button className={btn(false)} onClick={() => appRef.current?.view("default")}>Default teaching view</button>
            <button className={btn(false)} onClick={() => appRef.current?.view("top")}>Top: dℓ ⟂ OA</button>
            <button className={btn(false)} onClick={() => appRef.current?.view("side")}>Side: AB = AO + OB</button>
            <button className={btn(false)} onClick={() => appRef.current?.view("ab")}>Along AB: plane face-on</button>
            <button className={btn(false)} onClick={() => appRef.current?.view("plane")}>Oblique: tangent in plane</button>
            <button className={btn(false)} onClick={() => appRef.current?.view("tangent")}>Along dℓ: no r component</button>
          </div>

          <div className="absolute bottom-3 left-1/2 flex max-w-[96%] -translate-x-1/2 flex-wrap justify-center gap-2 rounded-2xl border border-white/15 bg-black/70 p-3 shadow-xl backdrop-blur">
            {[1, 2, 3, 4, 5].map((s) => <button key={s} className={btn(step === s)} onClick={() => setStep(s)}>{s}</button>)}
            <button className={btn(showGrid)} onClick={() => setShowGrid(v => !v)}>XY grid</button>
            <button className={btn(showAxes)} onClick={() => setShowAxes(v => !v)}>XYZ axes</button>
            <button className={btn(showPlaneGlow)} onClick={() => setShowPlaneGlow(v => !v)}>Plane glow</button>
            <button className={btn(showGridGlow)} onClick={() => setShowGridGlow(v => !v)}>Square grid glow</button>
            <button className={btn(showDB)} onClick={() => setShowDB(v => !v)}>Show dB</button>
            <button className={btn(showNetB)} onClick={() => setShowNetB(v => !v)}>Show net B</button>
            <button className={btn(currentDir < 0)} onClick={() => setCurrentDir(v => -v)}>Reverse dℓ</button>
            <button className={btn(false)} onClick={() => setLabelScale(v => Math.max(0.5, v - 0.1))}>A−</button>
            <button className={btn(false)} onClick={() => setLabelScale(v => Math.min(2.5, v + 0.1))}>A+</button>
            <button className={btn(false)} onClick={() => setLabelScale(1)}>Reset text</button>
            <button className={btn(false)} onClick={() => {
              setADeg(45); setCurrentDir(1); setShowDB(false); setShowNetB(false); setStep(1); appRef.current?.reset();
            }}>Reset view</button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
            <h2 className="mb-3 text-xl font-semibold">Teaching sequence</h2>
            <ol className="ml-5 list-decimal space-y-2 text-gray-300">
              <li>Move point A and show that dℓ always follows the tangent.</li>
              <li>Add B and r from A to B.</li>
              <li>Decompose AB as AO + OB.</li>
              <li>Show the plane through A whose normal is AB.</li>
              <li>Reveal the right-angle markers and connect to Biot–Savart.</li>
            </ol>
          </div>
          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
            <h2 className="mb-3 text-xl font-semibold">Core explanation</h2>
            <p className="text-gray-300">
              AB = AO + OB. The current element dℓ is perpendicular to AO because it is tangent
              to the circle, and perpendicular to OB because OB is vertical while dℓ lies in the xy-plane.
              Therefore dℓ is perpendicular to AB. The magenta arrow shows dB ∝ dℓ × r̂ at B, while
              the cyan arrow shows the net loop field after symmetry cancellation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
