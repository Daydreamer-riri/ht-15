export const explorerScenes = [
 ['hackathon','Hackathon主会场'],
 ['two-floor','健身房'], ['building2','会议室'], ['terrace','露台'], ['cafeteria','食堂']
];
const sceneDetails = {
 'hackathon': {icon:'gallery'},
 'two-floor': {icon:'gallery'},
 building2: {icon:'building'},
 terrace: {icon:'terrace'},
 cafeteria: {icon:'building'}
};
const paths = {
 reset:'<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
 building:'<path d="M6 21V5l12-2v18M3 21h18M10 8h1m3-1h1m-5 5h1m3-1h1m-5 5h1m3-1h1"/>',
 gallery:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 4v16M8 15l5-5 5 5"/>',
 terrace:'<path d="M3 14h18M5 14v6m7-6v6m7-6v6M3 20h18M7 9l5-6 5 6H7Zm5 0v5"/>',
 chevron:'<path d="m8 10 4 4 4-4"/>',
 back:'<path d="M15 18l-6-6 6-6"/>',
 check:'<path d="m5 12 4 4L19 6"/>'
};
const svg = icon => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[icon]??paths.building}</svg>`;

export function explorerScenePath(id, base='/') {
 const root=base.endsWith('/')?base:base+'/';
 id=({'honor-corridor':'two-floor'})[id]??id;
 // Keep previously shared planet links working without listing them as walking scenes.
 if(id==='sky-soho')return `${root.replace(/[^/]+\/$/,'')}sky-soho/?view=planet`;
 if(!explorerScenes.some(([key])=>key===id))throw new Error('Unknown scene');
 return `${root}?scene=${id}`;
}

export function populateSceneMenu(select, current, base='/', entries=explorerScenes) {
 select.replaceChildren();
 for(const [id,label] of entries)select.add(new Option(label,id));
 select.value=current;
 select.setAttribute('aria-label','切换场景');
 select.onchange=()=>{if(select.value!==current)location.href=explorerScenePath(select.value,base);};
 // Keep the existing scene router while presenting the same picker on all devices.
 select.hidden=true;
 const picker=document.createElement('div');picker.className='scene-picker';picker.dataset.explorerUi='';
 const trigger=document.createElement('button');trigger.type='button';trigger.className='scene-trigger';
 trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','scene-panel');
 trigger.setAttribute('aria-label',`切换场景，当前${select.selectedOptions[0]?.textContent??'实景空间'}`);
 trigger.innerHTML=`<span class="scene-title"></span><span class="scene-chevron">${svg('chevron')}</span>`;
 trigger.querySelector('.scene-title').textContent=select.selectedOptions[0]?.textContent??'实景空间';
 const panel=document.createElement('nav');panel.id='scene-panel';panel.className='scene-panel';panel.hidden=true;panel.setAttribute('aria-label','选择探索空间');
 for(const [id,label] of entries){
  const item=document.createElement('a');item.className='scene-choice';
  item.href=explorerScenes.some(([key])=>key===id)?explorerScenePath(id,base):location.href;
  const info=sceneDetails[id]??{icon:'building'};
  item.innerHTML=`<span class="scene-choice-icon">${svg(info.icon)}</span><span class="scene-choice-copy"><strong></strong></span><span class="scene-check">${svg('check')}</span>`;
  item.querySelector('strong').textContent=label;
  if(id===current)item.setAttribute('aria-current','page');
  item.addEventListener('click',event=>{
   if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   event.preventDefault();close();
   if(id!==current){select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));}
  });
  panel.append(item);
 }
 function close(){panel.hidden=true;trigger.setAttribute('aria-expanded','false');}
 function open(){
  panel.hidden=false;trigger.setAttribute('aria-expanded','true');
  document.exitPointerLock?.();document.dispatchEvent(new Event('explorer-menu-open'));
 }
 trigger.addEventListener('click',()=>panel.hidden?open():close());
 picker.addEventListener('keydown',event=>{
  if(event.key==='Escape'){close();trigger.focus();event.preventDefault();event.stopPropagation();}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();open();
   const items=[...panel.querySelectorAll('a')],index=items.indexOf(document.activeElement);
   items[(index+(event.key==='ArrowDown'?1:items.length-1)+items.length)%items.length]?.focus();
  }
 });
 document.addEventListener('pointerdown',event=>{if(!picker.contains(event.target))close();});
 picker.addEventListener('focusout',event=>{if(!picker.contains(event.relatedTarget))close();});
 picker.append(trigger,panel);select.after(picker);
}

/** 左上角的返回按钮：回到一日游星球，并点亮刚才所在的场景 */
export function addPlanetLink(header, current, base='/') {
 const url=new URL(explorerScenePath('sky-soho',base),location.origin);
 if(explorerScenes.some(([key])=>key===current))url.searchParams.set('poi',current);
 const link=document.createElement('a');link.className='planet-back';link.dataset.explorerUi='';
 link.href=url.pathname+url.search;link.setAttribute('aria-label','返回一日游星球');
 link.innerHTML=`${svg('back')}<span>星球</span>`;
 link.addEventListener('click',()=>document.exitPointerLock?.());
 header.prepend(link);
 return link;
}

export function setIconButton(button, icon, label, caption='') {
 button.innerHTML=svg(icon)+(caption?`<span class="action-caption">${caption}</span>`:'');
 button.setAttribute('aria-label',label);button.setAttribute('title',label);button.setAttribute('data-icon',icon);
}

export function initExplorerUi() {
 document.body.classList.add('minimal-ui');
 const dock=document.createElement('div');dock.className='walk-actions';dock.dataset.explorerUi='';dock.setAttribute('role','group');dock.setAttribute('aria-label','漫游操作');
 const reset=document.getElementById('reset');setIconButton(reset,'reset','回到起点');
 dock.append(reset);document.body.append(dock);
 document.getElementById('fullscreen')?.remove();document.getElementById('jump')?.remove();
}
