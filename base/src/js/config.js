export const QIANLI_CONFIG = Object.freeze({
  renderer: {
    clearColor: 0x000307,
    maxPixelRatio: 1.5,
    cameraFov: 52,
    cameraNear: 0.1,
    cameraFar: 520
  },

  terrain: {
    lineCount: 520,
    pointsPerLine: 860,
    dustCount: 24000,
    rangeX: 172,
    rangeZ: 182,
    mountainMaxHeight: 38,
    riverWidth: 7.2,
    valleyWidth: 8.6
  },

  palette: {
    river: '#fde803',
    riverCore: '#fff7a6',
    mountainBase: '#00152d',
    mountainMid: '#007f8c',
    mountainTop: '#00fff7',
    mist: '#b6ffff'
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
  }
});
