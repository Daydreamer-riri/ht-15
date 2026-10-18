# 黑色 T 恤印花

2026-10-18：按用户要求，个人形象入口 `/walk-me/` 使用黑色 T 恤，前胸居中偏上放吊牌图案，背面右下角放 loading 图案。两张参考图均由用户提供；原始服装照片不发布。

资产：`front-tag.png`、`back-loading.png`。使用内置 imagegen 的图像编辑模式，`background-extraction`，`transparent_background: true`，分别引用对应原图。保存时保留原始生成 PNG 的透明通道；这是根据照片整理的印花，并非品牌原始矢量文件。

前图提示要点：Extract only the printed cream hangtag artwork and loop. Preserve the winking cat-eared mascot, swept hair and curl, ears, whiskers, stars, exact “C.T.R.I.P” lettering and checkerboard footer. Straighten perspective; remove fabric, collar, product label, shadows and noise. Single upright graphic, transparent outside, original proportions, no mockup.

后图提示要点：Preserve the peeking cat-eared mascot, line and hands, exact “LOADING... 99%” lettering and nearly full rounded bar. Straighten and level; remove black fabric, folds, noise and glare. Warm ivory and medium warm gray ink; transparent empty areas, no enclosing rectangle, mockup or additions.

`scripts/player-model.mjs` 生成贴合衣服的曲面和 UV；`scripts/build-player-model.mjs` 将 PNG 字节直接打包进 GLB。图案与 `Body` 节点同步运动。背面 UV 方向按从背后观察设计，保证文字不镜像。
