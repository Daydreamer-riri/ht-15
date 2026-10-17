# 阶梯报告厅 · Insta360

用户本次提供的素材 ID：`GS3DC5bfe2359b4f24163a38f5d9314f2e94e`。
来源：https://app.insta360.com/3dspace/detail/GS3DC5bfe2359b4f24163a38f5d9314f2e94e
Insta360 X6 拍摄，Remy 生成。与 `dist/insta360/` 的屋顶步道为两份独立素材。

## 使用

项目目的地菜单选择「阶梯报告厅 · Insta360」，或访问 `/?scene=insta360-5bfe`。另有 `insta360-5bfe-middle` 和 `insta360-5bfe-end` 两个起点。WASD/摇杆行走，空格跳跃；回到起点恢复水平视角。

## 文件

- `scene.sog`：原始 100 万高斯点模型，16,328,425 字节。
- `cameras.json`：原始 1,914 个相机视角。
- `scene.voxel.zip`：原始 v1.1 体素包。
- `scene.voxel.json`、`scene.voxel.bin`：解包后的原始体素，用于运行时地面、障碍物碰撞。
- `scene.collision.glb`：从 3,674,949 个占用体素生成的 829,188 三角形碰撞网格，可直接导入建模工具；仅合并共面表面，没有添加虚构墙面或地面。
- `scene.collision.report.json`：网格尺寸、坐标和 SHA-256。
- `scene.json`：本地资源、相机起点和步行参数。
- `provenance.json`：来源、文件大小、MD5 与 SHA-256；不包含临时下载签名。

## 活动屏幕

三块屏幕通过 `scene.json` 的 `screensUrl` 加载 `screens.json`，复用 `hackathon-screen.jpeg`（用户提供的活动图）。纹理面按原扫描屏幕位置固定，中央及两侧均等比完整展示；宽侧屏用黑边补齐。屏幕覆盖层位于原屏幕前约 0.035 模型单位，原始高斯和碰撞数据保持不变。后续换图可替换 JPEG；若长宽比改变，需要同步调整 `screens.json` 的图片平面边界。

## 行人视角与尺度

原始 SOG 由 Viewer 旋转 Z 轴 180°，相机轨迹按 `[-x,-y,z]` 对齐；v1.1 体素已处于世界坐标，不再旋转。

此扫描没有可验证的米制标定。120 个中心相机的离地高度中位数约 0.7745 模型单位，报告厅通道净高约 2.0–2.15 单位；直接设置 1.65 单位会使相机靠近天花板。因此按采集比例采用眼高 0.68 + 离地间隙 0.12 = 0.8 模型单位，胶囊高 0.85、半径 0.14；这是一种行人比例校准，不宣称等于实测 1.65 米。

三个起点的 target.y 与 position.y 相等，初始及重置视角保持水平；运行时控制器持续维持校准眼高。局部地面噪声导致约 0.03 单位的落地误差。运行时使用同源体素，避免 GLB 大网格 BVH 的额外构建成本。原生碰撞适用于已扫描表面，细物体、扫描空洞及阶梯仍可能有重建误差。

## 重新生成与验证

```sh
python3 scripts/insta360_mesh.py dist/insta360-5bfe/scene.voxel.zip dist/insta360-5bfe/scene.collision.glb
npm run test:insta360-hall
npm run build
```

测试覆盖生成器、GLB 与体素 120 条射线一致性、原生重力/落地、真实障碍物阻挡，以及三个起点的校准眼高、水平视角、跳跃落地与重置。已在本地浏览器检查加载和行走。素材权利归原权利人，分享页未注明开放许可；文件随 dist 纳入内网 GitLab Pages 发布流程。
