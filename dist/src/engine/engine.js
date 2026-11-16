/**
 * PROJECT ATLAS — Core 3D Engine (Scene, Renderer, Camera, Navigation, Lighting, Animation Loop, Performance)
 */
import THREE from '../vendor/three.module.js';
import { ATLAS_CONFIG } from '../config.js';

export class PerformanceManager {
  constructor(onAutoDowngrade) {
    this.fps = 60;
    this.frameTimeMs = 16.6;
    this.frames = 0;
    this.lastCheck = performance.now();
    this.presetName = ATLAS_CONFIG.defaultGraphicsPreset;
    this.autoScaleEnabled = true;
    this.lowFpsStreak = 0;
    this.onAutoDowngrade = onAutoDowngrade;
  }

  detectInitialPreset() {
    try {
      const cores = navigator.hardwareConcurrency || 4;
      const mem = navigator.deviceMemory || 8;
      if (cores < 2 || mem < 4) {
        this.presetName = 'LOW';
      } else {
        this.presetName = 'MEDIUM';
      }
    } catch (_e) {
      this.presetName = 'MEDIUM';
    }
    return this.presetName;
  }

  getPreset() {
    return ATLAS_CONFIG.presets[this.presetName] || ATLAS_CONFIG.presets.MEDIUM;
  }

  setPreset(name) {
    if (ATLAS_CONFIG.presets[name]) {
      this.presetName = name;
      this.lowFpsStreak = 0;
    }
  }

  tick(now) {
    this.frames++;
    const elapsed = now - this.lastCheck;
    if (elapsed >= 500) {
      this.fps = Math.round((this.frames * 1000) / elapsed);
      this.frameTimeMs = +(elapsed / Math.max(1, this.frames)).toFixed(1);
      this.frames = 0;
      this.lastCheck = now;

      if (this.autoScaleEnabled && this.fps < 18 && this.presetName !== 'LOW') {
        this.lowFpsStreak++;
        if (this.lowFpsStreak >= 4) {
          this.presetName = 'LOW';
          this.lowFpsStreak = 0;
          if (this.onAutoDowngrade) this.onAutoDowngrade('LOW');
        }
      } else {
        this.lowFpsStreak = 0;
      }
    }
  }

  getMemoryStats(renderer) {
    let heapMb = null;
    if (performance && performance.memory && performance.memory.usedJSHeapSize) {
      heapMb = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
    }
    return {
      fps: this.fps,
      frameTimeMs: this.frameTimeMs,
      heapMb,
      drawCalls: renderer?.info?.render?.calls || 0,
      triangles: Math.round(renderer?.info?.render?.triangles || 0),
      points: renderer?.info?.render?.points || 0,
      preset: this.presetName
    };
  }
}

export class EngineManager {
  constructor(canvas, onObjectSelected, onObjectHovered) {
    this.canvas = canvas;
    this.onObjectSelected = onObjectSelected;
    this.onObjectHovered = onObjectHovered;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#030712');

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / Math.max(1, window.innerHeight), 0.1, 25000);
    this.camera.position.set(0, 75, 175);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.controls = new THREE.OrbitControls(this.camera, this.canvas);

    this.ambientLight = new THREE.AmbientLight('#8fb8ff', 0.35);
    this.sunLight = new THREE.PointLight('#fff6e5', 2.2, 0);
    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.ambientLight);
    this.scene.add(this.sunLight);

    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();
    this.selectableObjects = [];
    this.navigationHistory = [];
    this.focusedObject = null;
    this.reducedMotion = false;

    this.flyAnim = null;
    this.keysPressed = new Set();

    this._bindInteraction();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  applyGraphicsPreset(preset) {
    const w = this.canvas.parentElement?.clientWidth || window.innerWidth;
    const h = this.canvas.parentElement?.clientHeight || window.innerHeight;
    const maxH = preset.maxHeight || 900;
    const scaleRatio = h > maxH ? (maxH / h) : 1.0;
    this.renderer.setPixelRatio(Math.min(preset.pixelRatio || 1.0, scaleRatio));
    this.renderer.setSize(w, h);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  resize() {
    const w = this.canvas.parentElement?.clientWidth || window.innerWidth;
    const h = this.canvas.parentElement?.clientHeight || window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  registerSelectable(mesh, metadata) {
    mesh.userData = { ...mesh.userData, ...metadata, selectable: true };
    this.selectableObjects.push(mesh);
  }

  clearSelectables() {
    this.selectableObjects.length = 0;
  }

  _bindInteraction() {
    let downPos = { x: 0, y: 0 };

    this.canvas.addEventListener('mousedown', (e) => {
      downPos = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseNDC.set(
        ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
        -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1
      );
      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
      const hits = this.raycaster.intersectObjects(this.selectableObjects, false);
      if (hits.length > 0) {
        this.canvas.style.cursor = 'pointer';
        if (this.onObjectHovered) this.onObjectHovered(hits[0].object.userData, e.clientX, e.clientY);
      } else {
        this.canvas.style.cursor = 'grab';
        if (this.onObjectHovered) this.onObjectHovered(null, e.clientX, e.clientY);
      }
    });

    this.canvas.addEventListener('click', (e) => {
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) return;
      const rect = this.canvas.getBoundingClientRect();
      this.mouseNDC.set(
        ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
        -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1
      );
      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
      const hits = this.raycaster.intersectObjects(this.selectableObjects, false);
      if (hits.length > 0 && this.onObjectSelected) {
        this.onObjectSelected(hits[0].object.userData, false);
      }
    });

    this.canvas.addEventListener('dblclick', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseNDC.set(
        ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
        -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1
      );
      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
      const hits = this.raycaster.intersectObjects(this.selectableObjects, false);
      if (hits.length > 0 && this.onObjectSelected) {
        this.onObjectSelected(hits[0].object.userData, true);
      }
    });

    window.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      this.keysPressed.add(e.key.toLowerCase());
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.key.toLowerCase());
    });
  }

  flyToPosition(targetPos, cameraOffset, durationMs = 1100, focusMesh = null) {
    this.focusedObject = focusMesh;
    if (this.reducedMotion || durationMs <= 0) {
      this.controls.target.copy(targetPos);
      this.camera.position.copy(targetPos).add(cameraOffset);
      this.camera.lookAt(this.controls.target);
      this.controls.syncFromCamera();
      this.flyAnim = null;
      return;
    }
    this.flyAnim = {
      startTime: performance.now(),
      duration: durationMs,
      startCamPos: this.camera.position.clone(),
      startTarget: this.controls.target.clone(),
      endTarget: targetPos.clone(),
      endCamPos: targetPos.clone().add(cameraOffset)
    };
  }

  setViewPreset(presetName) {
    this.focusedObject = null;
    if (presetName === 'top') {
      this.flyToPosition(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 260, 1), 900);
    } else if (presetName === 'side') {
      this.flyToPosition(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 12, 230), 900);
    } else if (presetName === 'inner') {
      this.flyToPosition(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 28, 58), 900);
    } else if (presetName === 'outer') {
      this.flyToPosition(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 145, 340), 900);
    } else {
      this.flyToPosition(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 75, 175), 900);
    }
  }

  resetCamera() {
    this.setViewPreset('default');
  }

  update(dtSeconds) {
    // Handle keyboard free-flight / orbit adjustment (WASD + QE + Shift)
    if (this.keysPressed.size > 0) {
      const fast = this.keysPressed.has('shift') ? 2.6 : 1.0;
      const moveSpeed = 38.0 * dtSeconds * fast;
      const forward = new THREE.Vector3().subVectors(this.controls.target, this.camera.position).normalize();
      const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
      const delta = new THREE.Vector3();

      if (this.keysPressed.has('w')) delta.add(forward.clone().multiplyScalar(moveSpeed));
      if (this.keysPressed.has('s')) delta.add(forward.clone().multiplyScalar(-moveSpeed));
      if (this.keysPressed.has('d')) delta.add(right.clone().multiplyScalar(moveSpeed));
      if (this.keysPressed.has('a')) delta.add(right.clone().multiplyScalar(-moveSpeed));
      if (this.keysPressed.has('e')) delta.y += moveSpeed;
      if (this.keysPressed.has('q')) delta.y -= moveSpeed;

      if (delta.length() > 0) {
        this.focusedObject = null;
        this.camera.position.add(delta);
        this.controls.target.add(delta);
        this.controls.syncFromCamera();
      }
    }

    if (this.flyAnim) {
      const now = performance.now();
      const rawT = Math.min(1, (now - this.flyAnim.startTime) / this.flyAnim.duration);
      const ease = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

      if (this.focusedObject) {
        const livePos = this.focusedObject.getWorldPosition();
        const offset = new THREE.Vector3().subVectors(this.flyAnim.endCamPos, this.flyAnim.endTarget);
        this.flyAnim.endTarget.copy(livePos);
        this.flyAnim.endCamPos.copy(livePos).add(offset);
      }

      this.controls.target.copy(this.flyAnim.startTarget).lerp(this.flyAnim.endTarget, ease);
      this.camera.position.copy(this.flyAnim.startCamPos).lerp(this.flyAnim.endCamPos, ease);
      this.camera.lookAt(this.controls.target);
      this.controls.syncFromCamera();

      if (rawT >= 1) {
        this.flyAnim = null;
      }
    } else {
      if (this.focusedObject) {
        const livePos = this.focusedObject.getWorldPosition();
        const delta = new THREE.Vector3().subVectors(livePos, this.controls.target);
        this.controls.target.copy(livePos);
        this.camera.position.add(delta);
      }
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  }
}
