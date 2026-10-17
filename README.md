# Hackathon 15 · 行程、演示与实景漫游

所有页面由同一个 GitLab Pages 站点发布：

- [北疆行程首页](https://pages.release.ctripcorp.com/haojiaxu/hackathon-15/)：保留原有七套行程风格。
- [演讲演示](https://pages.release.ctripcorp.com/haojiaxu/hackathon-15/presentation/)：点击或 ↓ 逐条推进，↑ 回退，R 重来，F 全屏；最后的二维码进入本站食堂。
- [实景漫游](https://pages.release.ctripcorp.com/haojiaxu/hackathon-15/walk/)：默认 Hackathon 主会场；菜单支持荣誉连廊、2号楼、露台、食堂及凌空一日。
- [凌空星球](https://pages.release.ctripcorp.com/haojiaxu/hackathon-15/sky-soho/?view=planet)：凌空 SOHO 一日游，支持旋转、缩放、地点选择、俯瞰及日落光照。也可从 `/walk/?scene=sky-soho` 进入。
- [北疆星球](https://pages.release.ctripcorp.com/haojiaxu/hackathon-15/route-3d/?view=planet)：与凌空星球共用界面，可在顶部切换，也可返回实景漫游。

山湖保留独立入口 `/walk/?scene=alpine-lake`，不加入公开场景菜单。旧场景参数如 `insta360` 和 `cafeteria-original` 在 `/walk/` 下仍可使用。

## 开发与构建

```sh
npx --yes pnpm@10.11.0 install --frozen-lockfile
npm run dev                    # 原行程页 Vite 开发服务
npm run build                  # 构建行程、漫游、演示和星球到 dist/
npm run test:walk
npm run test:atlas
npm run test:migration
npm run preview                # 预览完整 dist/
```

`npm run build:presentation` 单独更新演示页；`npm run build:walk` 单独更新实景站；`npm run build:atlas` 单独构建两个星球页面。演示文案与视频设置见 [演示说明](src/presentation/README.md)。

## 目录

- `src/`：原 React + TypeScript 行程应用；`src/presentation/` 为独立对话演示源码。
- `src/atlas/`、`src/sky-soho/`、`src/route-3d/`：星球界面、艺术化模型和原行程数据快照，Three.js 本地打包，不依赖地图 Key 或远程模型。
- `realtrip/src/`：实景查看器、场景配置、地形、碰撞与控件。
- `realtrip/photo-to-walk/walk-viewer/`：荣誉连廊查看器。
- `realtrip/public/`：HTML、样式、许可证、导航网格、素材来源与屏幕图片。
- `realtrip/models/`：当前线上模型原始字节；准备脚本构建前校验大小及 SHA-256。
- `scripts/`：统一构建入口；`realtrip/tests/` 与 `tests/migration.test.mjs` 验证漫游回归、Pages 子路径与资源完整性。
- `dist/`：已构建并纳入 Git 的 Pages 发布产物。

## 发布

沿用 `.gitlab-ci.yml`：推送 `main` 后，`pages` 作业检查关键入口并将 `dist/` 发布为 `public/`。CI 不重新安装前端依赖，所以提交前必须执行完整构建和测试，并一并提交 `dist/`。流水线成功后，检查三个线上入口与二维码跳转。

所有应用资源和模型均从本站加载；B 站视频仍使用官方播放器。演示二维码的绝对地址在 `src/presentation/config.js` 中维护，迁移域名或项目路径时需更新并重新构建。行程首页与实景之间无需共享浏览器存储。

## 迁移来源

RealTrip 来自 `954545647/realtrip-walk` 的提交 `d38a1d58640ea502a8ab65f77dc17e1d7508f60c`（2026-10-17），解包为可直接维护的源码，并迁移当前使用的模型和许可证。未复制历史回退模型、原始视频或训练环境。现有 Render 站点保持可访问，迁移后的页面和二维码不再依赖它。

场景导航、人物、碰撞、画质及模型字节保持原版本；此次仅调整发布结构、资源相对路径和演示入口。场景本身的扫描缺损、人物残影及尺度估算限制仍见各自 provenance 和说明。

凌空星球与配套北疆星球于 2026-10-17 从 `haojiaxu/realtrip-city-explorer` 补充迁入。保留原星球视觉、5 个凌空地点及视角/地点链接参数；共享菜单新增凌空入口。原始行程来源记录在两个数据快照的 `provenance` 中，场景为艺术化沙盘而非实景扫描。
