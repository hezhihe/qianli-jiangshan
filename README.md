# 千里江山 · 粒子山河

> 陳赫楊 的 WebGL 粒子山水作品——以 Three.js 粒子重绘《千里江山图》意象。

**在线体验：https://qianli-jiangshan.pages.dev**

青绿粒子峰峦、金线河流、墨晕涟漪、MediaPipe 手势控制、自动播放背景音乐。

## 技术要点

- Three.js 自定义 ShaderMaterial： simplex 噪声生成等高线式山体，47 万粒子按设备自适应分档
- MediaPipe Hands 懒加载手势控制：张合/远近控缩放，手偏左右持续旋转视角
- 点击墨晕涟漪（shader 波环）、宣纸纹理层、朱砂印章 UI
- 纯静态无构建，Cloudflare Pages 全球分发

## 结构

```
site/               部署源码（入口 index.html）
  src/js/config.js   全部可调参数（配色/机位/手势映射/落款）
serve.py            本地防缓存预览服务器
```

> 注：背景音乐文件因版权不入库，`site/assets/` 下自行放置 `zhiwo.m4a` 即可启用。

## 作者

陳赫楊 · [GitHub](https://github.com/hezhihe)
