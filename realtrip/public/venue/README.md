# Hackathon主会场

实拍素材由用户提供，Remy 重建；采集编号为 `GS3DC5bfe2359b4f24163a38f5d9314f2e94e`。模型与碰撞来自 `junhaoqin/realtrip-walk-hackathon26`，来源提交与文件对象校验记录见 `realtrip/scripts/imported-scenes.json`。

入口为 `/walk/?scene=hackathon`。场景使用本站统一的摇杆、键盘移动、转头、跳跃与重置操作。

## 本地资源

- `scene.sog`：100 万高斯点模型，16,328,425 字节。
- `scene.voxel.json`、`scene.voxel.bin`：世界坐标下的 v1.1 体素，用于地面和障碍物碰撞。
- `scene.json`：相机起点和步行参数。
- `screens.json`、`hackathon-screen.jpeg`：三块实拍活动屏幕的空间位置、纹理及黑色背板。

模型由查看器旋转 Z 轴 180°；体素已处于世界坐标，不再旋转。采集尺度未经现场测量，采用眼高 0.68 加离地间隙 0.12 的行人比例校准；胶囊高 0.85、半径 0.14。未充分扫描的细小物体和空洞仍可能存在重建误差。

在仓库根目录运行 `npm run build:walk`、`npm run test:walk` 和 `npm run test:migration`。构建会验证模型与碰撞文件校验值；测试覆盖移动、碰撞、跳跃、落地、重置和统一控制。

素材权利归原权利人；模型随本仓库用于内网演示。
