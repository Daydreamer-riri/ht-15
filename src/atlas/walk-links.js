// 北疆星球中有实景漫游的地点：点击详情照片进入对应的 /walk/ 场景。
const walkScenes = { 赛里木湖: 'alpine-lake' };

export function walkHrefFor(stop) {
  const sceneId = stop && walkScenes[stop.name];
  return sceneId ? `../walk/?scene=${sceneId}` : null;
}
