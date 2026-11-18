# 心愿信局 · 情侣心愿扭蛋机

把想一起做的小事写成纸条，封进一颗扭蛋。转动黄铜旋钮随机抽一封，拆开后可以把心愿标记为已完成。[在线试玩](https://suiwu-wish-capsule-for-two.hazyhouse8.chatgpt.site/)

双击 `dist/index.html` 即可试玩。安装了 Node.js 的用户可以运行 `node build-offline.mjs`，得到可单独转发的 `wish-capsule.html`。ZIP 附带已打包的单文件。

## 源码与素材

- `dist/machine.js` 包含玻璃罩、机身、黄铜旋钮、彩壳和信封的三维建模代码。
- `dist/stage.js` 管理灯光、镜头、投信和出蛋动画，以及无 WebGL 时的平面展示。
- `dist/index.html`、`style.css`、`app.js` 和 `store.js` 包含界面、交互与浏览器本地存储。两个人共用同一台设备的同一个浏览器，就能从同一池子抽心愿。
- `dist/fonts/` 包含本地字体、样式与授权文件；`dist/vendor/` 包含 Three.js 及其授权文件。

项目原创代码和模型按 [MIT](LICENSE) 开源。Three.js 使用 [MIT](dist/vendor/LICENSE)，两款字体子集分别使用 [SIL OFL 1.1（宋体）](dist/fonts/LICENSE-NotoSerifSC.txt) 和 [SIL OFL 1.1（黑体）](dist/fonts/LICENSE-NotoSansSC.txt)。
