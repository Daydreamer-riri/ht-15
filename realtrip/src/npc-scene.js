import venue from './venue.json' with {type:'json'};

export const npcConfig = {
  name:'小蓝', modelUrl:'npc/blue-mascot.glb?v=refined-20261018', configUrl:'npc/service.json',
  position:[1.25,-.86,1.4], scale:.46, rotation:180,
  approachRadius:2.4, leaveRadius:2.8, maxVerticalDistance:1.1,
};
export const npcScene = structuredClone(venue);
npcScene.settings.cameras[0].initial={position:[-.45,-.27,.08],target:[1.25,-.25,1.4],fov:75};

export function isNearNpc(position,previous=false,config=npcConfig){
  if(!position?.every(Number.isFinite))return false;
  return Math.hypot(position[0]-config.position[0],position[2]-config.position[2]) <= (previous?config.leaveRadius:config.approachRadius)
    && Math.abs(position[1]-(config.position[1]+.8))<config.maxVerticalDistance;
}
