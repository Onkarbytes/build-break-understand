import * as THREE from "three";

export type PracticeLens = "build" | "break" | "understand";

export interface FunkySceneController {
  setActive(active: boolean): void;
  setPractice(lens: PracticeLens): void;
  dispose(): void;
}

const moduleDirections = [
  [-1, -1, 0], [-1, 1, 0], [1, -1, 0], [1, 1, 0],
  [-1, 0, -1], [-1, 0, 1], [1, 0, -1], [1, 0, 1],
  [0, -1, -1], [0, -1, 1], [0, 1, -1], [0, 1, 1],
];

const lensDescriptions: Record<PracticeLens, string> = {
  build: "Build: the modules converge into an interlocking assembly.",
  break: "Break: the modules separate to expose the structure.",
  understand: "Understand: the pieces resolve into an ordered orbit.",
};
const transitionDuration = 640;

const lensTransforms: Record<PracticeLens, { scale: number; core: number; rotation: THREE.Euler }> = {
  build: { scale: 0.72, core: 0.62, rotation: new THREE.Euler(0, 0, 0) },
  break: { scale: 1.48, core: 0.42, rotation: new THREE.Euler(0.42, 0.6, -0.32) },
  understand: { scale: 1.08, core: 0.76, rotation: new THREE.Euler(0.16, -0.2, 0.08) },
};

const lensPalettes: Record<PracticeLens, { modules: number[]; rings: number[] }> = {
  build: { modules: [0xd3f34c, 0x4054ed, 0xf3ebdb], rings: [0xd3f34c, 0x4054ed, 0xf3ebdb] },
  break: { modules: [0xff806b, 0x4054ed, 0xad9af0], rings: [0xff806b, 0x4054ed, 0xad9af0] },
  understand: { modules: [0x4054ed, 0xd3f34c, 0xad9af0], rings: [0x4054ed, 0xd3f34c, 0xad9af0] },
};

function createModuleGeometry() {
  const outer = new THREE.Shape();
  const inner = new THREE.Path();
  const sides = 6;

  for (let index = 0; index < sides; index++) {
    const angle = (index / sides) * Math.PI * 2;
    const point = new THREE.Vector2(Math.cos(angle) * 0.29, Math.sin(angle) * 0.29);
    if (index === 0) outer.moveTo(point.x, point.y);
    else outer.lineTo(point.x, point.y);
  }
  outer.closePath();

  for (let index = sides - 1; index >= 0; index--) {
    const angle = (index / sides) * Math.PI * 2;
    const point = new THREE.Vector2(Math.cos(angle) * 0.13, Math.sin(angle) * 0.13);
    if (index === sides - 1) inner.moveTo(point.x, point.y);
    else inner.lineTo(point.x, point.y);
  }
  inner.closePath();
  outer.holes.push(inner);

  const geometry = new THREE.ExtrudeGeometry(outer, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    steps: 1,
  });
  geometry.center();
  return geometry;
}

function positionsFor(lens: PracticeLens) {
  if (lens === "build") {
    return moduleDirections.map((_, index) => new THREE.Vector3(
      ((index % 3) - 1) * 0.48,
      (Math.floor(index / 3) % 2 - 0.5) * 0.48,
      (Math.floor(index / 6) - 0.5) * 0.48,
    ));
  }

  if (lens === "understand") {
    return moduleDirections.map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize().multiplyScalar(1.13));
  }

  return moduleDirections.map(([x, y, z], index) => {
    const direction = new THREE.Vector3(x, y, z).normalize();
    const radius = 1.55 + (index % 3) * 0.16;
    return direction.multiplyScalar(radius).add(new THREE.Vector3(0, Math.sin(index * 2.4) * 0.16, 0));
  });
}

function rotationsFor(lens: PracticeLens) {
  return moduleDirections.map((_, index) => {
    if (lens === "build") return new THREE.Vector3(0, 0, 0);
    if (lens === "understand") {
      return new THREE.Vector3((index % 3) * 0.12, (index % 4) * 0.1, ((index + 1) % 3) * 0.1);
    }
    return new THREE.Vector3(index * 0.29, index * 0.37, index * 0.21);
  });
}

export function mountFunkyScene(stage: HTMLElement): FunkySceneController | null {
  const canvas = stage.querySelector<HTMLCanvasElement>("[data-funky-canvas]");
  const status = document.querySelector<HTMLElement>("[data-funky-scene-status]");
  if (!canvas) return null;

  stage.dataset.webgl = "loading";
  let renderer: THREE.WebGLRenderer;

  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  } catch (error) {
    stage.dataset.webgl = "fallback";
    console.warn("WebGL is unavailable; the static Funky Mode diagram will be used.", error);
    if (status) status.textContent = "WebGL is unavailable. The static diagram and practice controls remain available.";
    return null;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 7.4);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffefd9, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.1);
  keyLight.position.set(-3, 5, 6);
  scene.add(keyLight);

  const sculpture = new THREE.Group();
  scene.add(sculpture);

  const pieceGeometry = createModuleGeometry();
  const pieceMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.34, metalness: 0.24, flatShading: true });
  const pieces = new THREE.InstancedMesh(pieceGeometry, pieceMaterial, moduleDirections.length);
  pieces.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sculpture.add(pieces);

  const coreGeometry = new THREE.IcosahedronGeometry(0.49, 1);
  const coreMaterial = new THREE.MeshStandardMaterial({ color: 0xfff1dc, roughness: 0.22, metalness: 0.34, flatShading: true });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  sculpture.add(core);
  const coreEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(coreGeometry),
    new THREE.LineBasicMaterial({ color: 0x1e1a2a, transparent: true, opacity: 0.72 }),
  );
  core.add(coreEdges);

  const ringGroup = new THREE.Group();
  sculpture.add(ringGroup);
  const ringMaterials: THREE.MeshStandardMaterial[] = [];
  const ringRotations = [
    new THREE.Euler(0, 0, 0),
    new THREE.Euler(Math.PI / 2, 0, 0),
    new THREE.Euler(0, Math.PI / 2, 0),
  ];
  lensPalettes.break.rings.forEach((color, index) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.16 });
    ringMaterials.push(material);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.24, 0.013, 8, 96),
      material,
    );
    ring.rotation.copy(ringRotations[index]);
    ringGroup.add(ring);
  });

  const connectorPositions = new Float32Array(moduleDirections.length * 2 * 3);
  const connectorGeometry = new THREE.BufferGeometry();
  connectorGeometry.setAttribute("position", new THREE.BufferAttribute(connectorPositions, 3).setUsage(THREE.DynamicDrawUsage));
  const connectors = new THREE.LineSegments(
    connectorGeometry,
    new THREE.LineBasicMaterial({ color: 0xf2eee6, transparent: true, opacity: 0.74 }),
  );
  sculpture.add(connectors);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.setClearColor(0x000000, 0);

  const resize = () => {
    const bounds = stage.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    scheduleFrame();
  };

  const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(stage);
  if (!resizeObserver) window.addEventListener("resize", resize);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const dummy = new THREE.Object3D();
  const currentPositions = positionsFor("break");
  const startPositions = currentPositions.map((position) => position.clone());
  const targetPositions = positionsFor("break");
  const currentRotations = rotationsFor("break");
  const startRotations = currentRotations.map((rotation) => rotation.clone());
  const targetRotations = rotationsFor("break");
  const pointer = new THREE.Vector2();
  const targetPointer = new THREE.Vector2();
  const ringStartRotation = lensTransforms.break.rotation.clone();
  const ringTargetRotation = lensTransforms.break.rotation.clone();
  let active = false;
  let disposed = false;
  let contextLost = false;
  let animationFrame = 0;
  let transitionStarted = performance.now();
  let transitionRunning = false;
  let ringStartScale = lensTransforms.break.scale;
  let ringTargetScale = lensTransforms.break.scale;
  let coreStartScale = lensTransforms.break.core;
  let coreTargetScale = lensTransforms.break.core;
  let practice: PracticeLens = "break";

  ringGroup.rotation.copy(lensTransforms.break.rotation);
  ringGroup.scale.setScalar(lensTransforms.break.scale);
  core.scale.setScalar(lensTransforms.break.core);

  function updateGeometry() {
    currentPositions.forEach((position, index) => {
      dummy.position.copy(position);
      dummy.rotation.set(currentRotations[index].x, currentRotations[index].y, currentRotations[index].z);
      dummy.scale.setScalar(0.88);
      dummy.updateMatrix();
      pieces.setMatrixAt(index, dummy.matrix);

      const offset = index * 6;
      const separation = practice === "break" ? 0.22 : 0;
      connectorPositions[offset] = position.x * separation;
      connectorPositions[offset + 1] = position.y * separation;
      connectorPositions[offset + 2] = position.z * separation;
      connectorPositions[offset + 3] = position.x;
      connectorPositions[offset + 4] = position.y;
      connectorPositions[offset + 5] = position.z;
    });
    pieces.instanceMatrix.needsUpdate = true;
    connectorGeometry.attributes.position.needsUpdate = true;
  }

  function updatePalette(lens: PracticeLens) {
    const palette = lensPalettes[lens];
    moduleDirections.forEach((_, index) => {
      pieces.setColorAt(index, new THREE.Color(palette.modules[index % palette.modules.length]));
    });
    if (pieces.instanceColor) pieces.instanceColor.needsUpdate = true;
    ringMaterials.forEach((material, index) => material.color.setHex(palette.rings[index]));
  }

  function draw(time: number) {
    animationFrame = 0;
    if (!active || disposed || contextLost || document.hidden) return;

    const idleMotion = !reducedMotion.matches;
    let moving = idleMotion;
    if (transitionRunning) {
      const progress = Math.min(1, (time - transitionStarted) / transitionDuration);
      const eased = 1 - Math.pow(1 - progress, 3);
      currentPositions.forEach((position, index) => {
        position.copy(startPositions[index]).lerp(targetPositions[index], eased);
        currentRotations[index].copy(startRotations[index]).lerp(targetRotations[index], eased);
      });
      ringGroup.rotation.set(
        ringStartRotation.x + (ringTargetRotation.x - ringStartRotation.x) * eased,
        ringStartRotation.y + (ringTargetRotation.y - ringStartRotation.y) * eased,
        ringStartRotation.z + (ringTargetRotation.z - ringStartRotation.z) * eased,
      );
      ringGroup.scale.setScalar(ringStartScale + (ringTargetScale - ringStartScale) * eased);
      core.scale.setScalar(coreStartScale + (coreTargetScale - coreStartScale) * eased);
      transitionRunning = progress < 1;
      moving = moving || transitionRunning;
    }

    if (idleMotion && !transitionRunning) {
      const phase = time * 0.00032;
      const base = lensTransforms[practice].rotation;
      ringGroup.rotation.set(
        base.x + Math.sin(phase * 0.7) * 0.035,
        base.y + Math.sin(phase) * 0.085,
        base.z + Math.cos(phase * 0.8) * 0.025,
      );
    }

    updatePalette(practice);
    updateGeometry();
    pointer.lerp(targetPointer, 0.14);
    sculpture.rotation.x = pointer.y * 0.2 + (idleMotion ? Math.sin(time * 0.00021) * 0.012 : 0);
    sculpture.rotation.y = pointer.x * 0.28 + (idleMotion ? time * 0.000075 : 0);
    if (pointer.distanceToSquared(targetPointer) > 0.00015) moving = true;

    renderer.render(scene, camera);
    if (moving) scheduleFrame();
  }

  function scheduleFrame() {
    if (active && !disposed && !contextLost && !document.hidden && !animationFrame) {
      animationFrame = requestAnimationFrame(draw);
    }
  }

  function setPractice(lens: PracticeLens) {
    if (lens === practice || disposed || contextLost) return;
    practice = lens;
    updatePalette(lens);
    const nextPositions = positionsFor(lens);
    const nextRotations = rotationsFor(lens);
    startPositions.forEach((position, index) => position.copy(currentPositions[index]));
    startRotations.forEach((rotation, index) => rotation.copy(currentRotations[index]));
    targetPositions.forEach((position, index) => position.copy(nextPositions[index]));
    targetRotations.forEach((rotation, index) => rotation.copy(nextRotations[index]));
    ringStartRotation.copy(ringGroup.rotation);
    ringTargetRotation.copy(lensTransforms[lens].rotation);
    ringStartScale = ringGroup.scale.x;
    ringTargetScale = lensTransforms[lens].scale;
    coreStartScale = core.scale.x;
    coreTargetScale = lensTransforms[lens].core;
    transitionStarted = performance.now();
    transitionRunning = !reducedMotion.matches;

    if (!transitionRunning) {
      currentPositions.forEach((position, index) => position.copy(targetPositions[index]));
      currentRotations.forEach((rotation, index) => rotation.copy(targetRotations[index]));
      ringGroup.rotation.copy(ringTargetRotation);
      ringGroup.scale.setScalar(ringTargetScale);
      core.scale.setScalar(coreTargetScale);
      updateGeometry();
      if (active) draw(performance.now());
    } else {
      scheduleFrame();
    }

    if (status) status.textContent = `${lensDescriptions[lens]} Move a mouse or pen over the model to change its viewing angle.`;
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.pointerType === "touch" || reducedMotion.matches) return;
    const bounds = stage.getBoundingClientRect();
    targetPointer.set(
      ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
      ((event.clientY - bounds.top) / bounds.height - 0.5) * -2,
    );
    scheduleFrame();
  }

  function handlePointerLeave() {
    targetPointer.set(0, 0);
    scheduleFrame();
  }

  function handleContextLost(event: Event) {
    event.preventDefault();
    contextLost = true;
    active = false;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    stage.dataset.webgl = "fallback";
    if (status) status.textContent = "The graphics context was lost. Refresh the page to try the 3D view again; the static diagram remains available.";
  }

  function handleMotionPreference(event: MediaQueryListEvent) {
    if (event.matches) {
      pointer.set(0, 0);
      targetPointer.set(0, 0);
    }
    if (event.matches && transitionRunning) {
      currentPositions.forEach((position, index) => position.copy(targetPositions[index]));
      currentRotations.forEach((rotation, index) => rotation.copy(targetRotations[index]));
      ringGroup.rotation.copy(ringTargetRotation);
      ringGroup.scale.setScalar(ringTargetScale);
      core.scale.setScalar(coreTargetScale);
      transitionRunning = false;
      updateGeometry();
      if (active) draw(performance.now());
    }
    if (!event.matches && active) scheduleFrame();
  }

  canvas.addEventListener("webglcontextlost", handleContextLost);
  stage.addEventListener("pointermove", handlePointerMove);
  stage.addEventListener("pointerleave", handlePointerLeave);
  reducedMotion.addEventListener("change", handleMotionPreference);
  updateGeometry();
  resize();
  stage.dataset.webgl = "ready";
  setPractice("understand");
  if (status) status.textContent = `${lensDescriptions.understand} Move a mouse or pen over the model to change its viewing angle.`;

  return {
    setActive(nextActive) {
      if (disposed || contextLost) return;
      active = nextActive;
      if (active) {
        resize();
        scheduleFrame();
      } else if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    },
    setPractice,
    dispose() {
      if (disposed) return;
      disposed = true;
      active = false;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      stage.removeEventListener("pointermove", handlePointerMove);
      stage.removeEventListener("pointerleave", handlePointerLeave);
      reducedMotion.removeEventListener("change", handleMotionPreference);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      stage.dataset.webgl = "fallback";
      if (status) status.textContent = "The static diagram is shown while Studio Mode is active.";
    },
  };
}
