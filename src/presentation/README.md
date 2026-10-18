# RealTrip 演讲演示

部署入口：[打开演示](https://pages.release.ctripcorp.com/haojiaxu/hackathon-15/presentation/)。由本仓库的 GitLab Pages 流水线发布。

独立入口 `/presentation/`。界面按主流 chatbot 的样式：居中单栏、深色背景、用户消息为右侧灰色气泡、大模型回答无气泡、底部固定输入框。开场只显示「有什么可以帮你的？」和居中的输入框，不展示代际导航、总步数、未来内容或结尾。

每条消息都有动画：用户的话先在输入框里逐字打出再发送；大模型先显示「正在思考」，再逐块输出内容。左上角的模型名显示当前代际，升级时短暂提示「已升级」。正文字号随视口宽度缩放（1080p 约 21px），适合投屏。系统启用「减少动态效果」时关闭动画，内容直接出现。

内容是凌空 SOHO 的 Hackathon 一日游：淞虹路地铁站出发 → 主会场 → 露台 → 食堂 → 会议室 → 健身房 → 返回地铁站，顺序与一日游星球的路线一致；步行时长和距离取自 `../sky-soho/data/itinerary.json`。图文版使用星球卡片同一组实景截图（`../sky-soho/assets/scenes/`）。最后一条回应提供一日游星球入口，扫码后可进入五个实景空间。

```sh
npm run dev:presentation
# http://127.0.0.1:8845/presentation/
```

`npm run build:presentation` 单独生成 `dist/presentation/`；完整 `npm run build` 也会包含它。构建后可以直接打开 `dist/presentation/index.html`；打开源码 `src/presentation/index.html` 也会引用生成的资源正常预览。静态产物可独立托管，链接使用相对路径。图片、二维码、字体回退和页面脚本不依赖外部 CDN；最后的实景入口需要联网。

## 演讲控制

1. 用户请大模型安排在凌空 SOHO 参加 Hackathon 的一天。
2. 第一代给出文字方案。
3. 用户说「不行」。
4. 第二代给出图文方案。
5. 用户说「不行」。
6. 第三代给出可点击播放的一日游视频。
7. 用户说「好像还差点意思」。
8. 第四代给出 RealTrip 实景体验二维码。

点击页面任意空白处、↓ / → 或空格，每次只新增一条消息。动画进行中再按一次，会立即完成当前消息，不会跳到下一步。旧消息保留，可滚动查看；新增时自动滚动到最新消息。↑ / ← 撤回最后一条（生成中的消息也会撤回）；`Home` / `R` 或右上重来按钮清空对话，`F` 全屏，`T` 或顶栏架构图按钮打开技术架构图（`src/assets/技术图.jpg`，构建时复制为 `assets/tech-diagram.jpg`，Esc 或点背景关闭），`PageUp` / `PageDown` 支持常见翻页器。按住按键不会连续跳过多步。点击视频和链接不会推进对话。视频获得焦点后，空格和方向键由播放器处理；点击聊天区空白处可继续演示。

步骤不会自动前进。切换消息时会停止播放器并恢复视频封面，已出现的视频消息仍可重新播放。页面刷新回到空白开场，二维码仅在最后一条消息出现，保留「这一次，你来走一走。」。底部输入框只用于展示，不接受键盘输入。

## 替换内容

- 视频：`assets/demo.mp4`（30 秒，720p），由 `src/assets/视频.mp4` 压缩得到；封面 `assets/demo-poster.jpg`。更换素材时执行：
  `ffmpeg -i src/assets/视频.mp4 -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k src/presentation/assets/demo.mp4`
- 二维码目标：`config.js` 中的 `EXPERIENCE_URL`。构建时用 qrcode 生成静态 SVG，与页面链接共用同一常量。当前严格指向 `https://pages.release.ctripcorp.com/haojiaxu/hackathon-15/sky-soho/?view=planet`。
- 文案和图文内容：`main.js`。时间表在 `schedule`，步行数据来自一日游行程快照；图片在构建时从 `src/sky-soho/assets/scenes/` 复制。第三代为本地视频，第四代进入一日游星球，再选择实景空间。

