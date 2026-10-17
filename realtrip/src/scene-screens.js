import {Asset,Entity,Mesh,MeshInstance,StandardMaterial,Color,CULLFACE_NONE,ADDRESS_CLAMP_TO_EDGE,calculateNormals} from 'playcanvas';

// Imported screens already have measured, slightly skewed world-space corners.
// Keep those coordinates and UVs rather than replacing them with flat rectangles.
export async function loadCapturedSurfaces(viewer,url){
 const response=await fetch(url);
 if(!response.ok)throw Error('Captured screens unavailable');
 const {surfaces}=await response.json(),textures=new Map(),entities=[];
 for(const surface of surfaces){
  const material=new StandardMaterial();material.useLighting=false;material.useTonemap=false;
  material.diffuse=new Color(0,0,0);material.emissive=new Color(...surface.color);material.cull=CULLFACE_NONE;
  if(surface.texture){
   const source=new URL(surface.texture,new URL(url,location.href)).href;
   if(!textures.has(source))textures.set(source,new Promise((resolve,reject)=>{
    viewer.app.assets.loadFromUrl(source,'texture',(error,asset)=>{
     if(error)return reject(error);
     asset.resource.addressU=asset.resource.addressV=ADDRESS_CLAMP_TO_EDGE;
     asset.resource.anisotropy=Math.min(8,viewer.app.graphicsDevice.maxAnisotropy);resolve(asset.resource);
    });
   }));
   material.emissiveMap=await textures.get(source);
  }
  material.update();
  const mesh=new Mesh(viewer.app.graphicsDevice);
  mesh.setPositions(surface.positions);mesh.setIndices(surface.indices);
  mesh.setNormals(calculateNormals(surface.positions,surface.indices));mesh.setUvs(0,surface.uvs);mesh.update();
  const entity=new Entity(surface.name);
  entity.addComponent('render',{meshInstances:[new MeshInstance(mesh,material)],castShadows:false,receiveShadows:false});
  viewer.app.root.addChild(entity);entities.push(entity);
 }
 viewer.app.renderNextFrame=true;return entities;
}

// A captured slide is planar. Keep it in world space so walking preserves perspective
// and foreground splats occlude it, without carrying view-dependent scan ghosts.
export async function loadSceneScreens(viewer, screens, base){
 if(!screens?.panels?.length)return [];
 const asset=new Asset('captured Hackathon projection','texture',{url:base+screens.textureUrl},{mipmaps:true,srgb:true});
 await new Promise((resolve,reject)=>{asset.once('load',resolve);asset.once('error',reject);viewer.app.assets.add(asset);viewer.app.assets.load(asset);});
 const texture=asset.resource;texture.addressU=texture.addressV=ADDRESS_CLAMP_TO_EDGE;texture.anisotropy=Math.min(8,viewer.app.graphicsDevice.maxAnisotropy);
 const material=new StandardMaterial();material.useLighting=false;material.useTonemap=false;material.diffuse=new Color(0,0,0);material.emissive=new Color(1,1,1);material.emissiveMap=texture;material.cull=CULLFACE_NONE;material.update();
 const black=new StandardMaterial();black.useLighting=false;black.diffuse=new Color(0,0,0);black.emissive=new Color(.006,.007,.01);black.cull=CULLFACE_NONE;black.update();
 function quad(name,bounds,z,mat){
  const [left,right,bottom,top]=bounds,mesh=new Mesh(viewer.app.graphicsDevice);
  mesh.setPositions([left,bottom,z,right,bottom,z,right,top,z,left,top,z]);mesh.setNormals([0,0,-1,0,0,-1,0,0,-1,0,0,-1]);mesh.setUvs(0,[1,1,0,1,0,0,1,0]);mesh.setIndices([0,2,1,0,3,2]);mesh.update();
  const entity=new Entity(name);entity.addComponent('render',{meshInstances:[new MeshInstance(mesh,mat)],castShadows:false,receiveShadows:false});viewer.app.root.addChild(entity);return entity;
 }
 const entities=[];
 for(const panel of screens.panels){
  const [l,r,b,t]=panel.bounds;entities.push(quad(panel.name+' bezel',panel.bounds,panel.z,black));
  const width=r-l-.045,height=t-b-.045,fit=Math.min(width/screens.aspect,height),cx=(l+r)/2,cy=(b+t)/2;
  entities.push(quad(panel.name+' captured content',[cx-fit*screens.aspect/2,cx+fit*screens.aspect/2,cy-fit/2,cy+fit/2],panel.z-.006,material));
 }
 viewer.app.renderNextFrame=true;return entities;
}
