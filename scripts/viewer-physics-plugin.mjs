import {readFile} from 'node:fs/promises';

// The pinned viewer exposes createViewer only. Reuse its voxel collision and
// vertical physics, without enabling its separate input/camera controller.
export function exposeViewerPhysics(source) {
 const anchor='export { createViewer };';
 if(source.split(anchor).length!==2||!source.includes('class WalkController {')||!source.includes('class VoxelCollision {'))
  throw Error('Viewer physics hook changed; review the pinned 1.37.0 integration');
 return source.replace(anchor,'export { createViewer, WalkController, VoxelCollision };');
}
export const viewerPhysicsPlugin={name:'realtrip-viewer-physics',setup(build){
 build.onLoad({filter:/@playcanvas\/supersplat-viewer\/dist\/viewer\.js$/},async args=>({
  contents:exposeViewerPhysics(await readFile(args.path,'utf8')),loader:'js'
 }));
}};
