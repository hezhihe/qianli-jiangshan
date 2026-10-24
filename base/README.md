# 千里江山 · 粒子山河 Demo

## 当前版本目标

第一版只验证核心视觉：

- Three.js 粒子山体
- GLSL 噪声生成山峦起伏
- 金线河流
- 青绿山水配色
- 鼠标视角控制
- 滚轮镜头推进
- 全屏沉浸

暂不加入 MediaPipe 手势控制，避免摄像头权限和性能问题干扰核心视觉验收。

## 文件结构

```text
qianli-particle-demo/
  index.html
  start-preview.ps1
  vendor/three.min.js
  src/css/styles.css
  src/js/app.js
  src/js/config.js
  src/js/controls.js
  src/js/shaders.js
```

## 启动

```powershell
powershell -ExecutionPolicy Bypass -File .\start-preview.ps1
```

默认地址：

http://127.0.0.1:8090/index.html

## 后续迭代顺序

1. 视觉验收：山体、河流、雾气、镜头是否达到“千里江山”方向。
2. 性能优化：根据机器性能调整粒子数量。
3. 增加手势控制：接入 MediaPipe Hands。
4. 加长卷叙事：增加卷轴 UI、题跋、章节镜头。
