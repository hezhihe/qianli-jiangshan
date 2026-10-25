# 千里江山 · 粒子山河 — 项目终态记录

> 本文为历史规划文档的终态收口（原规划内容已完成使命，见 git 历史）。

## 最终状态（2026-10-25）

- **线上**：https://qianli-jiangshan.pages.dev （Cloudflare Pages，项目名 qianli-jiangshan）
- **作者落款**：陳赫楊 · 微信 hz141681（点击复制）· 邮箱 chy313336@qq.com · GitHub github.com/hezhihe
- **功能全集**：47 万粒子自适应山河 / 题跋 HUD + 朱砂印章 / 宣纸纹理 / 墨晕涟漪 /
  MediaPipe 手势（摇杆式持续旋转）/ 《知我》自动播放（3.8MB AAC 秒开）/ 分享卡 + 印章图标
- **结构**：site/ 为唯一部署源；serve.py 本地防缓存预览；启动预览.command 一键启动；
  部署命令见 site/README.md；git 全程版本控制
- **已清理**：base/（原始基底，存于 git 历史 46bae43）、references/（第三方参考，可从 GitHub 重下）、
  zhiwo.mp3（16MB 原始音乐，已被 m4a 替代）

## 历史教训存档

- 手势方案迭代三次才收敛（速度式→位置式→持续旋转式），根因都是"识别丢帧"
- 350k 粒子自动启动摄像头会堵死主线程（对标站的坑）
- wrangler login 不能接管道；OAuth 窗口短，先登录 dashboard 再授权
- 16MB 音频首播慢，128k AAC 是甜点
