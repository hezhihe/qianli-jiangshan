import { QIANLI_CONFIG } from './config.js';
import { vertexShader, fragmentShader } from './shaders.js';
import { QianliControls } from './controls.js';
import { QianliLandmarks } from './landmarks.js';

const THREE = window.THREE;

class QianliParticleApp {
  constructor() {
    if (!THREE) {
      throw new Error('THREE is not loaded.');
    }

    this.config = QIANLI_CONFIG;
    this.canvas = document.querySelector('#stage');
    this.loading = document.querySelector('#loading');

    this.clock = new THREE.Clock();
    this.frameId = null;

    this.initScene();
    this.initParticles();
    this.initLandmarks();
    this.initControls();
    this.bindUI();
    this.resize();
    this.animate();

    window.setTimeout(() => this.loading?.classList.add('is-hidden'), 650);
  }

  initScene() {
    const { renderer: rendererConfig } = this.config;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(rendererConfig.clearColor);
    this.scene.fog = new THREE.FogExp2(0x000307, 0.0095);

    this.camera = new THREE.PerspectiveCamera(
      rendererConfig.cameraFov,
      window.innerWidth / window.innerHeight,
      rendererConfig.cameraNear,
      rendererConfig.cameraFar
    );
    this.camera.position.set(0, 18, this.config.motion.defaultCameraZ);
    this.camera.lookAt(0, 5, -36);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setClearColor(rendererConfig.clearColor, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, rendererConfig.maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  initParticles() {
    const geometry = this.createParticleGeometry();
    const palette = this.config.palette;

    this.uniforms = {
      uTime: { value: 0 },
      uBreath: { value: 0 },
      uMountainHeight: { value: 0.46 },
      uRiverWidth: { value: this.config.terrain.riverWidth },
      uValleyWidth: { value: this.config.terrain.valleyWidth },
      uRiverColor: { value: new THREE.Color(palette.river) },
      uRiverCoreColor: { value: new THREE.Color(palette.riverCore) },
      uMountainBaseColor: { value: new THREE.Color(palette.mountainBase) },
      uMountainMidColor: { value: new THREE.Color(palette.mountainMid) },
      uMountainTopColor: { value: new THREE.Color(palette.mountainTop) },
      uMistColor: { value: new THREE.Color(palette.mist) }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.rotation.x = -0.06;
    this.particles.rotation.y = 0.015;
    this.scene.add(this.particles);

    console.info(`Qianli particle field: ${geometry.userData.particleCount.toLocaleString('en-US')} particles`);
  }

  createParticleGeometry() {
    const { lineCount, pointsPerLine, dustCount, rangeX, rangeZ } = this.config.terrain;
    const terrainCount = lineCount * pointsPerLine;
    const totalCount = terrainCount + dustCount;

    const positions = new Float32Array(totalCount * 3);
    const randoms = new Float32Array(totalCount * 3);
    const lines = new Float32Array(totalCount);
    const kinds = new Float32Array(totalCount);

    let cursor = 0;

    for (let line = 0; line < lineCount; line += 1) {
      const z = (line / (lineCount - 1) - 0.5) * rangeZ;
      const lineRatio = line / lineCount;

      for (let point = 0; point < pointsPerLine; point += 1) {
        const x = (point / (pointsPerLine - 1) - 0.5) * rangeX;
        const i3 = cursor * 3;

        positions[i3] = x;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = z;

        randoms[i3] = Math.random();
        randoms[i3 + 1] = Math.random();
        randoms[i3 + 2] = Math.random();
        lines[cursor] = lineRatio;
        kinds[cursor] = 1;
        cursor += 1;
      }
    }

    for (let i = 0; i < dustCount; i += 1) {
      const i3 = cursor * 3;
      positions[i3] = (Math.random() - 0.5) * rangeX * 1.15;
      positions[i3 + 1] = Math.random() * 26 + 5;
      positions[i3 + 2] = (Math.random() - 0.5) * rangeZ * 1.12;

      randoms[i3] = Math.random();
      randoms[i3 + 1] = Math.random();
      randoms[i3 + 2] = Math.random();
      lines[cursor] = -1;
      kinds[cursor] = 2;
      cursor += 1;
    }

    const geometry = new THREE.BufferGeometry();
    this.setGeometryAttribute(geometry, 'position', new THREE.BufferAttribute(positions, 3));
    this.setGeometryAttribute(geometry, 'aRandom', new THREE.BufferAttribute(randoms, 3));
    this.setGeometryAttribute(geometry, 'aLine', new THREE.BufferAttribute(lines, 1));
    this.setGeometryAttribute(geometry, 'aKind', new THREE.BufferAttribute(kinds, 1));
    geometry.userData = { particleCount: totalCount };
    geometry.computeBoundingSphere();

    return geometry;
  }

  setGeometryAttribute(geometry, name, attribute) {
    if (typeof geometry.setAttribute === 'function') {
      geometry.setAttribute(name, attribute);
      return;
    }

    if (typeof geometry.addAttribute === 'function') {
      geometry.addAttribute(name, attribute);
      return;
    }

    throw new Error('Unsupported Three.js BufferGeometry attribute API.');
  }

  initLandmarks() {
    this.landmarks = new QianliLandmarks({
      palette: this.config.palette,
      setGeometryAttribute: this.setGeometryAttribute.bind(this)
    });
    this.landmarks.group.rotation.x = -0.06;
    this.landmarks.group.rotation.y = 0.015;
    this.scene.add(this.landmarks.group);
  }

  initControls() {
    this.controls = new QianliControls({
      camera: this.camera,
      scene: this.scene,
      domElement: this.canvas
    });
  }

  bindUI() {
    window.addEventListener('resize', () => this.resize());

    document.querySelector('#fullscreen-btn')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });

    document.querySelector('#reset-btn')?.addEventListener('click', () => this.controls.reset());
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    this.frameId = window.requestAnimationFrame(() => this.animate());

    const elapsedTime = this.clock.getElapsedTime();
    const controlState = this.controls.update(elapsedTime);

    if (!this.controls.isPaused) {
      this.uniforms.uTime.value = elapsedTime;
      this.uniforms.uBreath.value = Math.sin(elapsedTime * 0.62) * 0.5 + 0.5;
      this.uniforms.uMountainHeight.value = controlState.mountainHeight + Math.sin(elapsedTime * 0.34) * 0.075;
      this.landmarks.update(elapsedTime);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    window.__qianliApp = new QianliParticleApp();
  } catch (error) {
    console.error(error);
    const loading = document.querySelector('#loading');
    if (loading) {
      loading.classList.remove('is-hidden');
      loading.textContent = `WebGL 初始化失败：${(error && error.message) ? error.message : error}`;
      loading.title = (error && error.stack) ? error.stack : '';
    }
  }
});


