'use strict';
// Ball and keeper share measured anchors; the net target follows the cover-scaled pitch art.
const ShotMotion=(()=>{
 function calculate(w,h,kick,hands){
  const scale=Math.max(w/1672,h/941),ox=(w-1672*scale)/2,oy=(h-941*scale)/2;
  const mouth={left:ox+.68*1672*scale,right:ox+.94*1672*scale,top:oy+.37*941*scale,bottom:oy+.60*941*scale};
  const goal={x:ox+.865*1672*scale,y:oy+.49*941*scale};
  const dx=-.14*w,save={x:hands.x+dx,y:hands.y};
  return {kick,hands,goal,save,saveDx:dx,diveDx:-.23*w,mouth};
 }
 function prepare(){
  const field=document.getElementById('stadium');if(!field)return;
  field.classList.remove('shooting','saving');void field.offsetWidth;
  const rect=field.getBoundingClientRect(),kickEl=field.querySelector('.kick-target'),handsEl=field.querySelector('.catch-target');
  if(!rect.width||!kickEl||!handsEl)return;
  const point=el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2-rect.left,y:r.top+r.height/2-rect.top}};
  const p=calculate(rect.width,rect.height,point(kickEl),point(handsEl));
  const values={'--ball-sx':p.kick.x,'--ball-sy':p.kick.y,'--goal-x':p.goal.x,'--goal-y':p.goal.y,'--save-x':p.save.x,'--save-y':p.save.y,'--arc-x':(p.kick.x+p.goal.x)/2,'--arc-y':Math.max(10,Math.min(p.kick.y,p.goal.y)-rect.height*.14),'--save-arc-x':(p.kick.x+p.save.x)/2,'--save-arc-y':Math.max(12,Math.min(p.kick.y,p.save.y)-rect.height*.11),'--save-dx':p.saveDx,'--dive-dx':p.diveDx};
  for(const [key,value]of Object.entries(values))field.style.setProperty(key,value+'px');
  return p;
 }
 return {calculate,prepare};
})();
