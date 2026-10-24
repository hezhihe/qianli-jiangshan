// 手势控制：MediaPipe Hands 识别手部关键点，映射逻辑对标 mountainsandrivers.netlify.app
//   张开手掌 / 手掌靠近镜头 -> 放大（镜头推进）
//   握拳     / 手掌远离镜头 -> 缩小（镜头拉远）
//   手掌偏向画面左/右侧     -> 视角持续旋转（速度与偏移量成正比，手回中央即停在当前角度）
// 设计原则：点击按钮才加载脚本并请求摄像头，绝不自动启动（原版自动启动会堵死主线程）。

const CDN = 'https://cdn.jsdelivr.net/npm';
const VERSIONS = {
  hands: '@0.4.1675469240',
  drawing: '@0.3.1675466124'
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(src)), { once: true });
      }
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.crossOrigin = 'anonymous';
    el.onload = () => {
      el.dataset.loaded = 'true';
      resolve();
    };
    el.onerror = () => reject(new Error(`load failed: ${src}`));
    document.head.appendChild(el);
  });
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;

// 手势原始值 -> 控制目标的映射区间（按自己手型微调这里）
const MAP = {
  openness: { min: 1.15, max: 1.95 },   // 握拳~张开（相对掌宽的指尖距离）
  palmSize: { min: 0.12, max: 0.30 },   // 手掌离镜头远近（近大远小）
  openWeight: 0.55,                      // 张合在缩放里的权重（其余归远近）
  rotateRange: 0.35,                     // 手掌有效活动半宽：偏离画面中心 35% 即满速旋转
  rotateDeadZone: 0.15,                  // 中央死区（半宽比例），防手自然放置时误转
  rotateRate: 1.4,                       // 满速旋转速度（弧度/秒，1.4 ≈ 80°/s）
  rotateLimit: 0.7                       // 旋转角上限（±0.7 rad ≈ ±40°）
};

export class GestureController {
  constructor({ controls, motion, statusEl, videoEl, canvasEl, onError }) {
    this.controls = controls;
    this.motion = motion;
    this.statusEl = statusEl;
    this.videoEl = videoEl;
    this.canvasEl = canvasEl;
    this.onError = onError || null; // 启动/推理失败时通知外部复位 UI
    this.active = false;
    this.stopped = false;
    this.stream = null;
    this.hands = null;
    // 指数平滑后的手势值，抑制 MediaPipe 输出抖动
    this.smooth = { openness: 1.5, palmSize: 0.2, x: 0.5 };
    this.hasHand = false;   // 当前帧是否看到手
    this.lastResultAt = null; // 上一帧推理时间戳（算帧间隔用）
  }

  setStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
  }

  fail(message) {
    this.active = false;
    this.setStatus(message);
    this.cleanup();
    this.onError?.(message);
  }

  async start() {
    this.active = true;
    this.setStatus('加载手势模块…');

    try {
      await loadScript(`${CDN}/@mediapipe/drawing_utils${VERSIONS.drawing}/drawing_utils.js`);
      await loadScript(`${CDN}/@mediapipe/hands${VERSIONS.hands}/hands.js`);
    } catch (error) {
      console.error(error);
      this.fail('手势模块加载失败，请检查网络');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.fail('当前环境不支持摄像头');
      return;
    }
    this.setStatus('请求摄像头授权…');
    this.stream = await navigator.mediaDevices
      .getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } })
      .catch(() => null);
    if (!this.stream) {
      this.fail('摄像头未授权，手势控制不可用');
      return;
    }

    this.videoEl.srcObject = this.stream;
    try {
      await this.videoEl.play();
    } catch (error) { /* 部分浏览器需要用户手势后才能播放，这里已有点击上下文 */ }

    const hands = new window.Hands({
      locateFile: (file) => `${CDN}/@mediapipe/hands${VERSIONS.hands}/${file}`
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1, // 1 档关键点更稳，丢帧明显减少（推理与渲染已解耦，不会互相拖累）
      selfieMode: true,   // 关键点坐标直接对齐镜像预览，左右方向符合直觉
      minDetectionConfidence: 0.4,
      minTrackingConfidence: 0.4
    });
    hands.onResults((results) => this.onResults(results));
    this.hands = hands;

    // 手势接管期间，停用鼠标视差写入
    this.controls.pointerEnabled = false;
    this.setStatus('手势控制中：张开/靠近放大 · 握拳/远离缩小 · 手偏左右持续旋转，回中即停');
    this.pump();
  }

  // 逐帧把手势结果送入推理（await 形成天然背压，防止帧堆积）
  async pump() {
    if (this.stopped) return;
    try {
      if (this.videoEl.readyState >= 2 && this.videoEl.videoWidth > 0) {
        await this.hands.send({ image: this.videoEl });
      }
    } catch (error) {
      console.error('gesture inference error', error);
      this.fail('手势推理异常，已退出手势控制');
      return;
    }
    if (!this.stopped) {
      setTimeout(() => this.pump(), 16);
    }
  }

  onResults(results) {
    const canvas = this.canvasEl;
    const video = this.videoEl;
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
    }
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 关键点按原始坐标绘制；预览画面与画布由 CSS 统一做镜像（scaleX(-1)）

    const marks = results.multiHandLandmarks;
    if (marks && marks.length > 0) {
      const lm = marks[0];
      if (window.drawConnectors) {
        window.drawConnectors(ctx, lm, window.HAND_CONNECTIONS, {
          color: 'rgba(46, 230, 207, 0.92)',
          lineWidth: 2
        });
      }
      if (window.drawLandmarks) {
        window.drawLandmarks(ctx, lm, { color: '#f5cf3a', lineWidth: 1 });
      }
      this.hasHand = true;
      const now = performance.now();
      const dt = this.lastResultAt ? Math.min(0.2, (now - this.lastResultAt) / 1000) : 0;
      this.lastResultAt = now;
      this.updateTargets(lm, dt);
    } else {
      // 手离开画面：旋转保持在当前角度（不回弹），缩放保持当前值
      this.hasHand = false;
      this.lastResultAt = null;
    }
    ctx.restore();
  }

  updateTargets(lm, dt = 0.016) {
    const wrist = lm[0];
    const palm = lm[9];
    const palmSize = Math.hypot(wrist.x - palm.x, wrist.y - palm.y) || 1e-4;

    let tipSum = 0;
    for (const tip of [8, 12, 16, 20]) {
      tipSum += Math.hypot(lm[tip].x - wrist.x, lm[tip].y - wrist.y);
    }
    const openness = tipSum / 4 / palmSize;

    // 指数平滑：位置通道给更高权重，跟手更紧
    this.smooth.openness += (openness - this.smooth.openness) * 0.45;
    this.smooth.palmSize += (palmSize - this.smooth.palmSize) * 0.45;
    this.smooth.x += (palm.x - this.smooth.x) * 0.6;

    const target = this.controls.target;

    // 缩放：张开程度与远近同向叠加——张开或靠近都放大，握拳或远离都缩小
    const open01 = clamp(
      (this.smooth.openness - MAP.openness.min) / (MAP.openness.max - MAP.openness.min),
      0, 1
    );
    const size01 = clamp(
      (this.smooth.palmSize - MAP.palmSize.min) / (MAP.palmSize.max - MAP.palmSize.min),
      0, 1
    );
    const zoom01 = clamp(
      open01 * MAP.openWeight + size01 * (1 - MAP.openWeight),
      0, 1
    );
    target.cameraZ = lerp(this.motion.maxCameraZ, this.motion.minCameraZ, zoom01);

    // 旋转：速度式——手偏向左右即按偏移比例持续旋转，回中即停（保持当前角度）。
    // 手始终待在画面中央的识别舒适区，避开边缘盲区。
    const cx = clamp((this.smooth.x - 0.5) / MAP.rotateRange, -1, 1);
    const dz = MAP.rotateDeadZone;
    const beyond = Math.abs(cx) <= dz ? 0 : (cx - Math.sign(cx) * dz) / (1 - dz);
    target.rotationY = clamp(
      target.rotationY + beyond * MAP.rotateRate * dt,
      -MAP.rotateLimit, MAP.rotateLimit
    );
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.cleanup();
    this.controls.pointerEnabled = true;
    this.controls.reset();
    this.setStatus('');
  }

  cleanup() {
    this.stopped = true;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoEl) this.videoEl.srcObject = null;
    if (this.canvasEl) {
      const ctx = this.canvasEl.getContext('2d');
      ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
    }
    this.hands?.close?.();
    this.hands = null;
  }
}

// 调试挂载点：页面控制台里可直接构造 GestureController 做单元测试
window.__GestureController = GestureController;
