---
name: wish-capsule
description: 使用随包的网页源码、Three.js 模型和本地字体，制作或修改可离线玩的情侣心愿纸条扭蛋机。
---

# 心愿扭蛋机

直接使用 `dist/` 下的完整项目。改机器外形和胶囊用 `machine.js`，改灯光和动画用 `stage.js`，改玩法和本地记录用 `app.js` 与 `store.js`。

静态托管以 `dist/` 为站点根目录。需要离线单文件时，从仓库根目录运行 `node build-offline.mjs`。交付时一并保留字体和 Three.js 的许可证。
