# 心愿信局 · 情侣心愿扭蛋机

把想一起做的小事写进扭蛋。每次投递都会从八款全息彩卡中等概率配一张。转动黄铜旋钮，扭蛋落下后会自动翻出心愿。抽过的卡可以在心愿记录里重看，也可以标记为已完成。[在线试玩](https://suiwu-wish-capsule-for-two.hazyhouse8.chatgpt.site/)

双击 `dist/index.html` 即可试玩。安装了 Node.js 的用户可以运行 `node build-offline.mjs`，得到可单独转发的 `wish-capsule.html`。ZIP 附带已打包的单文件。

## 源码与素材

- `dist/machine.js` 包含玻璃罩、机身、黄铜旋钮、彩壳和信封的三维建模代码。
- `dist/stage.js` 管理灯光、镜头、投信和出蛋动画，以及无 WebGL 时的平面展示。
- `dist/cards/` 收录八张原创插画、八张局部烫彩遮罩和通用卡背、边框。`dist/cards.js`、`dist/cards.css` 控制翻牌、碎光和倾斜反光。`dist/night.js` 绘制短片里的夜景和金尘。
- `dist/index.html`、`style.css`、`app.js` 和 `store.js` 包含界面、交互与浏览器本地存储。两个人共用同一台设备的同一个浏览器，就能从同一池子抽心愿。
- `dist/fonts/` 包含本地字体、样式与授权文件；`dist/vendor/` 包含 Three.js 及其授权文件。

项目原创代码、模型和卡面素材按 [MIT](LICENSE) 开源。Three.js 使用 [MIT](dist/vendor/LICENSE)，两款字体子集分别使用 [SIL OFL 1.1（宋体）](dist/fonts/LICENSE-NotoSerifSC.txt) 和 [SIL OFL 1.1（黑体）](dist/fonts/LICENSE-NotoSansSC.txt)。
