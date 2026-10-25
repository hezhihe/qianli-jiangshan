import { QIANLI_CONFIG } from './config.js';
import { vertexShader, fragmentShader } from './shaders.js';
import { QianliControls } from './controls.js';
import { QianliLandmarks } from './landmarks.js';
import { GestureController } from './gestures.js';

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
    this.clickTime = 1e6;
    this.clickPoint = new THREE.Vector2(0, 0);

    this.applyPerformanceTier();
    this.initScene();
    this.initParticles();
    this.initLandmarks();
    this.initControls();
    this.bindUI();
    this.resize();
    this.animate();

    window.setTimeout(() => this.loading?.classList.add('is-hidden'), 650);
  }

  // 根据设备选择粒子密度档位
  applyPerformanceTier() {
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const narrow = window.innerWidth < 760;
    const cores = navigator.hardwareConcurrency || 4;
    const tiers = this.config.performance.tiers;
    const tierName = (coarse || narrow || cores <= 4) ? 'low' : (cores <= 8 ? 'mid' : 'high');
    this.tierName = tierName;

    const terrain = { ...this.config.terrain, ...tiers[tierName] };
    this.terrain = terrain;
    this.isCompactView = Boolean(coarse || narrow);
    console.info(`Qianli quality tier: ${tierName}`);
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
    const view = this.isCompactView ? this.config.view.compact : this.config.view.desktop;
    const viewZ = view.position[2] ?? this.config.motion.defaultCameraZ; // 桌面机位跟随 motion 配置
    this.camera.position.set(view.position[0], view.position[1], viewZ);
    this.camera.lookAt(view.lookAt[0], view.lookAt[1], view.lookAt[2]);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setClearColor(rendererConfig.clearColor, 1);
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, rendererConfig.maxPixelRatio);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  initParticles() {
    const geometry = this.createParticleGeometry();
    const palette = this.config.palette;
    const interaction = this.config.interaction;

    this.uniforms = {
      uTime: { value: 0 },
      uBreath: { value: 0 },
      uMountainHeight: { value: 0.46 },
      uRiverWidth: { value: this.terrain.riverWidth },
      uValleyWidth: { value: this.terrain.valleyWidth },
      uClickPoint: { value: this.clickPoint },
      uClickTime: { value: this.clickTime },
      uRippleSpeed: { value: interaction.rippleSpeed },
      uRippleStrength: { value: interaction.rippleStrength },
      uRippleSigma: { value: interaction.rippleSigma },
      uRippleDecay: { value: interaction.rippleDecay },
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
    const { lineCount, pointsPerLine, dustCount, rangeX, rangeZ } = this.terrain;
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
      domElement: this.canvas,
      motionOverride: this.isCompactView ? this.config.view.compact.motion : {}
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

    // 背景音乐：显式按钮控制（浏览器禁止自动播放），缺文件时按钮提示
    this.bgm = document.querySelector('#bgm');
    this.musicBtn = document.querySelector('#music-btn');
    if (this.bgm && this.musicBtn) {
      this.bgm.volume = 0;
      this.musicTouched = false;
      this.bgm.addEventListener('error', () => {
        this.musicBtn.textContent = '♪ 音乐文件未找到';
        this.musicBtn.disabled = true;
      });
      // 状态自愈：任何路径开始播放时，静音且无淡变进行 => 恢复默认音量（防"静音播放"假死）
      this.bgm.addEventListener('play', () => {
        if (!this.fadeRaf && this.bgm.volume === 0) {
          this.bgm.volume = this.config.audio.volume;
        }
        this.musicBtn.textContent = '♪ 暂停音乐';
      });
      this.bgm.addEventListener('pause', () => {
        if (!this.fadeRaf) this.musicBtn.textContent = '♪ 播放背景音乐';
      });
      this.musicBtn.addEventListener('click', () => this.toggleMusic());
      // 自动播放：能直接播就淡入；被浏览器拦截则在首次任意交互时立即起播。
      // 音乐按钮自身的点击交给 toggleMusic，避免 pointerdown/click 双触发。
      this.bgm.play().then(() => {
        if (this.musicTouched) return;
        this.musicBtn.textContent = '♪ 暂停音乐';
        this.fadeMusic(this.config.audio.volume, this.config.audio.fadeInMs);
      }).catch(() => {
        // 自动播放被拦：明确告诉访客点一下即可开启
        this.musicBtn.textContent = '♪ 点击任意处开启音乐';
        const startOnGesture = (event) => {
          if (event.target && event.target.closest && event.target.closest('#music-btn')) return;
          window.removeEventListener('pointerdown', startOnGesture);
          window.removeEventListener('keydown', startOnGesture);
          if (this.musicTouched || !this.bgm.paused) return;
          this.bgm.play().then(() => {
            if (this.musicTouched) return;
            this.musicBtn.textContent = '♪ 暂停音乐';
            this.fadeMusic(this.config.audio.volume, this.config.audio.fadeInMs);
          }).catch(() => {});
        };
        window.addEventListener('pointerdown', startOnGesture);
        window.addEventListener('keydown', startOnGesture);
      });
    }

    // 落款（署名 + 联系方式）
    this.renderColophon();

    // 手势控制：点击才加载模块并请求摄像头
    this.gesture = null;
    document.querySelector('#gesture-btn')?.addEventListener('click', () => this.toggleGestures());

    // 点击山河泛起墨晕（拖拽不触发）
    let downPos = null;
    this.canvas.addEventListener('pointerdown', (event) => {
      downPos = { x: event.clientX, y: event.clientY };
    }, { passive: true });
    this.canvas.addEventListener('pointerup', (event) => {
      if (!downPos) return;
      const moved = Math.hypot(event.clientX - downPos.x, event.clientY - downPos.y);
      downPos = null;
      if (moved > 6) return;
      this.triggerRipple(event.clientX, event.clientY);
    }, { passive: true });

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }

  toggleMusic() {
    this.musicTouched = true;
    if (this.bgm.paused) {
      this.musicBtn.textContent = '♪ 加载中…';
      // 真正出声（readyState>=2 且未暂停）才切换到"暂停"状态，避免"点了没反应"
      this.bgm.play().then(() => {
        this.musicBtn.textContent = '♪ 暂停音乐';
        this.fadeMusic(this.config.audio.volume, this.config.audio.fadeInMs);
      }).catch(() => {
        // 缺文件时 error 监听已把按钮禁用，这里只复位可用的按钮
        if (!this.musicBtn.disabled) {
          this.musicBtn.textContent = '♪ 播放背景音乐';
        }
        this.fadeMusic(0, 10);
      });
    } else {
      this.musicBtn.textContent = '♪ 播放背景音乐';
      this.fadeMusic(0, this.config.audio.fadeOutMs);
    }
  }

  fadeMusic(targetVolume, durationMs) {
    // 可打断：新淡变直接取消旧循环，避免两个 rAF 互相覆盖音量
    if (this.fadeRaf) cancelAnimationFrame(this.fadeRaf);
    const startVolume = this.bgm.volume;
    const startTime = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - startTime) / durationMs);
      this.bgm.volume = startVolume + (targetVolume - startVolume) * t;
      if (t < 1) {
        this.fadeRaf = requestAnimationFrame(step);
      } else {
        this.fadeRaf = null;
        if (targetVolume === 0 && !this.bgm.paused) this.bgm.pause();
      }
    };
    this.fadeRaf = requestAnimationFrame(step);
  }

  copyText(value, message) {
    const done = () => this.showToast(message);
    if (navigator.clipboard?.writeText && document.hasFocus?.()) {
      // 剪贴板 API 在部分内嵌环境会挂起，600ms 未返回就走兜底方案
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        this.fallbackCopy(value, done);
      }, 600);
      navigator.clipboard.writeText(value).then(() => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        done();
      }, () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        this.fallbackCopy(value, done);
      });
    } else {
      this.fallbackCopy(value, done);
    }
  }

  fallbackCopy(value, done) {
    const input = document.createElement('textarea');
    input.value = value;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    try {
      document.execCommand('copy');
      done();
    } catch (error) {
      this.showToast('复制失败，请手动复制');
    }
    input.remove();
  }

  showToast(message) {
    const toast = document.querySelector('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200);
  }

  renderColophon() {
    const colophon = this.config.colophon;
    if (!colophon) return;
    document.querySelector('#colophon-name').textContent = colophon.name;
    document.querySelector('#colophon-year').textContent = colophon.year;
    const links = document.querySelector('#colophon-links');
    links.replaceChildren(
      ...colophon.links.map((link) => {
        const li = document.createElement('li');

        // 主体：点击复制
        const main = document.createElement('a');
        main.href = 'javascript:void(0)';
        main.className = 'link-copy';
        main.textContent = `${link.label} · ${link.value}`;
        main.addEventListener('click', () => {
          this.copyText(link.value, `${link.label} 已复制：${link.value}`);
        });
        li.appendChild(main);

        return li;
      })
    );
  }

  toggleGestures() {
    const button = document.querySelector('#gesture-btn');
    const preview = document.querySelector('#gesture-preview');
    if (this.gesture?.active) {
      this.gesture.stop();
      this.gesture = null;
      button.textContent = '开启手势控制';
      preview.hidden = true;
      return;
    }
    this.gesture = new GestureController({
      controls: this.controls,
      motion: this.controls.config,
      statusEl: document.querySelector('#gesture-status'),
      videoEl: document.querySelector('#gesture-video'),
      canvasEl: document.querySelector('#gesture-overlay'),
      onError: () => {
        // 启动失败：弹回按钮与预览窗，恢复鼠标控制
        button.textContent = '开启手势控制';
        preview.hidden = true;
        this.controls.pointerEnabled = true;
        this.gesture = null;
      }
    });
    preview.hidden = false;
    button.textContent = '关闭手势控制';
    this.gesture.start();
  }

  triggerRipple(clientX, clientY) {
    const ndc = new THREE.Vector2(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);

    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) return;

    // 转换到粒子本地坐标（含山体旋转）
    const local = this.particles.worldToLocal(hit.clone());
    this.clickPoint.set(local.x, local.z);
    this.clickTime = 0;
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // ---------- 帧率监控与自动降档 ----------

  monitorPerformance(rawDelta) {
    // 钳制单帧间隔：后台标签页回来时的巨帧不参与帧率统计
    const deltaTime = Math.min(rawDelta, 0.25);
    this.fpsAccum = (this.fpsAccum || 0) + deltaTime;
    this.fpsFrames = (this.fpsFrames || 0) + 1;

    if (this.fpsAccum < 3) return;
    const fps = this.fpsFrames / this.fpsAccum;
    this.fpsAccum = 0;
    this.fpsFrames = 0;

    if (fps < 26 && this.pixelRatio > 0.75) {
      this.pixelRatio = Math.max(0.75, this.pixelRatio - 0.25);
      this.renderer.setPixelRatio(this.pixelRatio);
      console.info(`Qianli pixel ratio lowered to ${this.pixelRatio} (fps ${fps.toFixed(1)})`);
    }
  }

  animate() {
    this.frameId = window.requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    const controlState = this.controls.update(elapsedTime);

    if (!this.controls.isPaused) {
      this.uniforms.uTime.value = elapsedTime;
      this.uniforms.uBreath.value = Math.sin(elapsedTime * 0.62) * 0.5 + 0.5;
      this.uniforms.uMountainHeight.value = controlState.mountainHeight + Math.sin(elapsedTime * 0.34) * 0.075;
      this.clickTime += deltaTime;
      this.uniforms.uClickTime.value = this.clickTime;
      this.landmarks.update(elapsedTime);
    }

    this.monitorPerformance(deltaTime);
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
