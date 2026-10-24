# 千里江山 · 粒子山河（Vibe Coding 创意作品）

Three.js 粒子山水沉浸页。无构建依赖，静态部署即可。
**纯创意作品，不含任何个人信息**（无姓名/联系方式/二维码）。

技术血统：对标 [mountainsandrivers.netlify.app](https://mountainsandrivers.netlify.app/)（"Particle Void"，与
[Cecilia991/3D-](https://github.com/Cecilia991/3D-) 同源），在其粒子山体 + 金线河流架构上重写扩展；
参考 [LingDong-/shan-shui-inf](https://github.com/LingDong-/shan-shui-inf)（构图/印章意象）与
[WishMelz/AquaInkGL](https://github.com/WishMelz/AquaInkGL)（墨晕交互思路）。

## 可调参数

全部在 `src/js/config.js`：

- `palette` — 山/河/雾配色
- `terrain` — 地形尺度（粒子行数、点数在 `performance.tiers` 里按设备分档）
- `motion` — 镜头惯性、呼吸、缩放范围
- `interaction` — 点击墨晕涟漪的速度/强度/衰减

## 本地预览

```bash
cd site
python3 -m http.server 8090
# 打开 http://127.0.0.1:8090
```

## 部署

整个 `site/` 目录扔到 GitHub Pages / Vercel / Netlify 即可（纯静态）。

## 交互

- 移动鼠标：镜头视差；滚轮：推近拉远；空格：暂停/继续
- 点击山河：墨晕涟漪从点击处扩散
- 性能：按设备自动选粒子档位（high/mid/low），帧率过低时自动降低渲染分辨率
- 移动端：竖屏专属机位，山体自动沉到说明面板下方的可视区

## 背景音乐

音乐文件：`assets/zhiwo.mp3`（《知我》，16MB）。面板上的"♪ 播放背景音乐"按钮控制：

- **自动播放**：进页面即尝试起播；首次访问被浏览器拦截时，页面内第一次点击（点山河/任意按钮）立即起播
- 手动按钮：点击 1.6 秒淡入至音量 0.55；再点 0.9 秒淡出后暂停；循环播放
- 文件缺失时按钮自动变为"音乐文件未找到"并禁用
- 换歌：替换 `assets/zhiwo.mp3`，或改 `index.html` 里 `#bgm` 的 `src`
- 音量在 `src/js/app.js` 的 `toggleMusic()` 里调（0.55）

## 手势控制（MediaPipe Hands）

点击"开启手势控制"按钮才会加载 MediaPipe 脚本并请求摄像头（绝无自动启动）。

映射逻辑（对标 mountainsandrivers.netlify.app）：

- **张开手掌 / 手掌靠近镜头** → 放大（镜头推进）
- **握拳 / 手掌远离镜头** → 缩小（镜头拉远）
- **手掌偏向画面左/右侧** → 视角持续旋转（速度与偏移量成正比；手回中央即停在当前角度，反向偏移可转回；上限 ±40°）

右下角显示镜像摄像头预览 + 手部关键点。授权失败/无摄像头时自动弹回按钮并恢复鼠标控制。

映射区间在 `src/js/gestures.js` 的 `MAP` 常量里：openness/palmSize 张合与远近范围、openWeight 两者权重、rotateRate 旋转速度（rad/s）、rotateLimit 旋转上限（±0.7 rad ≈ ±40°）、rotateDeadZone 中央死区、rotateRange 有效活动半宽。嫌转太快调 rotateRate，嫌角度范围不够调 rotateLimit。精度要点：selfieMode 对齐镜像坐标、modelComplexity 1 减少丢帧、手势模式下 controls 缓动加速 5 倍让镜头跟手。

注意：摄像头权限要求 `localhost` 或 HTTPS 环境（GitHub Pages / Vercel 均满足）。Phase 2 待办：宣纸纹理叠加层、印章字体质感升级。
