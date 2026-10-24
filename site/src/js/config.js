export const QIANLI_CONFIG = Object.freeze({
  renderer: {
    clearColor: 0x000307,
    maxPixelRatio: 1.5,
    cameraFov: 52,
    cameraNear: 0.1,
    cameraFar: 520
  },

  // 机位：desktop 常规构图；compact 为竖屏/触屏（山体沉到说明面板下方）
  view: {
    desktop: {
      position: [0, 18, null], // z 为 null 时用 motion.defaultCameraZ
      lookAt: [0, 5, -36]
    },
    compact: {
      position: [0, 20, 62],
      lookAt: [0, 38, -36],
      motion: { defaultCameraZ: 62, minCameraZ: 46, maxCameraZ: 80 }
    }
  },

  terrain: {
    rangeX: 172,
    rangeZ: 182,
    riverWidth: 7.2,
    valleyWidth: 8.6
  },

  // 粒子数量按设备分档，app.js 启动时选择一档与 terrain 合并
  performance: {
    tiers: {
      high: { lineCount: 520, pointsPerLine: 860, dustCount: 24000 },
      mid: { lineCount: 400, pointsPerLine: 700, dustCount: 14000 },
      low: { lineCount: 280, pointsPerLine: 520, dustCount: 7000 }
    }
  },

  palette: {
    river: '#f5cf3a',
    riverCore: '#fff3a0',
    mountainBase: '#001a30',
    mountainMid: '#0b6a74',
    mountainTop: '#2ee6cf',
    mist: '#aef2e8'
  },

  motion: {
    idleRotationAmount: 0.035,
    idleZoomAmount: 1.4,
    pointerRotationX: 0.018,
    pointerRotationY: 0.055,
    easing: 0.018,
    wheelZoomSpeed: 0.038,
    minCameraZ: 34,
    maxCameraZ: 96,
    defaultCameraZ: 72,
    defaultRotationX: -0.08,
    defaultRotationY: 0.02
  },

  interaction: {
    rippleSpeed: 22.0, // 墨晕扩散速度（世界单位/秒）
    rippleStrength: 6.5,
    rippleSigma: 6.5,
    rippleDecay: 0.45
  },

  audio: {
    volume: 0.55,       // 背景音乐目标音量
    fadeInMs: 1600,     // 起播淡入
    fadeOutMs: 900      // 暂停淡出
  }
});
