import {Asset,Entity} from 'playcanvas';

export function applyModelTransform(entity, model){
 if(model.modelRotation)entity.setLocalRotation(...model.modelRotation);
 if(model.modelScale!==undefined)entity.setLocalScale(model.modelScale,model.modelScale,model.modelScale);
 if(model.modelPosition)entity.setLocalPosition(...model.modelPosition);
}

// Separate, spatially cropped captures retain their original compressed attributes.
// Unified splats sort together, so crossing the join never swaps the camera or scene.
export async function loadSceneSupplements(viewer, models, base){
 return Promise.all(models.map(model=>new Promise((resolve,reject)=>{
  const url=base+model.contentUrl;
  const asset=new Asset(model.name??'scene supplement','gsplat',{url,filename:new URL(url,location.href).pathname.split('/').pop()});
  asset.once('load',()=>{
   try{
    const entity=new Entity(model.name??'scene supplement',viewer.app);
    applyModelTransform(entity,model);
    entity.addComponent('gsplat',{unified:true,asset});
    viewer.app.root.addChild(entity);viewer.app.renderNextFrame=true;resolve(entity);
   }catch(error){reject(error);}
  });
  asset.once('error',reject);
  viewer.app.assets.add(asset);viewer.app.assets.load(asset);
 })));
}
