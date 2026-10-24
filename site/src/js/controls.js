import { QIANLI_CONFIG } from './config.js';

export class QianliControls {
  constructor({ camera, scene, domElement, motionOverride = {} }) {
    this.camera = camera;
    this.scene = scene;
    this.domElement = domElement;
    this.config = { ...QIANLI_CONFIG.motion, ...motionOverride };

    this.pointer = { x: 0, y: 0 };
    this.target = {
      rotationX: 0,
      rotationY: 0,
      cameraZ: this.config.defaultCameraZ,
      mountainHeight: 0.52
    };
    this.current = {
      ...this.target,
      rotationX: this.config.defaultRotationX,
      rotationY: this.config.defaultRotationY
    };
    this.isPaused = false;
    this.pointerEnabled = true;

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('pointermove', (event) => this.handlePointerMove(event), { passive: true });
    window.addEventListener('wheel', (event) => this.handleWheel(event), { passive: true });
    window.addEventListener('keydown', (event) => this.handleKeydown(event));
  }

  handlePointerMove(event) {
    if (!this.pointerEnabled) return;
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    this.pointer.x = (event.clientX / width - 0.5) * 2;
    this.pointer.y = (event.clientY / height - 0.5) * 2;

    const deadZone = 0.16;
    const normalize = (value) => {
      const abs = Math.abs(value);
      if (abs < deadZone) return 0;
      const eased = Math.pow((abs - deadZone) / (1 - deadZone), 1.65);
      return Math.sign(value) * eased;
    };
    const softX = normalize(this.pointer.x);
    const softY = normalize(this.pointer.y);

    this.target.rotationY = softX * this.config.pointerRotationY;
    this.target.rotationX = softY * this.config.pointerRotationX;
    this.target.mountainHeight = 0.52 + Math.max(0, -softY) * 0.18;
  }

  handleWheel(event) {
    const nextZ = this.target.cameraZ + event.deltaY * this.config.wheelZoomSpeed;
    this.target.cameraZ = Math.min(this.config.maxCameraZ, Math.max(this.config.minCameraZ, nextZ));
  }

  handleKeydown(event) {
    if (event.code === 'Space') {
      event.preventDefault();
      this.isPaused = !this.isPaused;
    }
  }

  reset() {
    this.target.rotationX = 0;
    this.target.rotationY = 0;
    this.target.cameraZ = this.config.defaultCameraZ;
    this.target.mountainHeight = 0.52;
  }

  update(elapsedTime) {
    // 手势模式下加快缓动让镜头跟手；鼠标模式保持电影感慢缓动
    const ease = this.pointerEnabled
      ? this.config.easing
      : Math.min(0.16, this.config.easing * 8);
    const idleRotation = Math.sin(elapsedTime * 0.12) * this.config.idleRotationAmount;
    const idleZoom = Math.sin(elapsedTime * 0.2) * this.config.idleZoomAmount;

    const targetRotationX = this.config.defaultRotationX + this.target.rotationX;
    const targetRotationY = this.config.defaultRotationY + this.target.rotationY + idleRotation;
    const targetCameraZ = this.target.cameraZ + idleZoom;

    this.current.rotationX += (targetRotationX - this.current.rotationX) * ease;
    this.current.rotationY += (targetRotationY - this.current.rotationY) * ease;
    this.current.cameraZ += (targetCameraZ - this.current.cameraZ) * ease;
    this.current.mountainHeight += (this.target.mountainHeight - this.current.mountainHeight) * ease;

    this.scene.rotation.x = this.current.rotationX;
    this.scene.rotation.y = this.current.rotationY;
    this.camera.position.z = this.current.cameraZ;

    return this.current;
  }
}
