'use strict';
const Voice = (()=>{
 let context,source,gain,utterance,finish,serial=0;
 const effects=new Set();
 let config=DEFAULT_SETTINGS;
 const synth=window.speechSynthesis;
 function setup(settings){config=settings;}
 function unlock(){
  if(typeof BGM!=='undefined')BGM.unlock();
  try{if(typeof navigator!=='undefined'&&navigator.audioSession)navigator.audioSession.type='playback';}catch{}
  try{if(context?.state==='closed')context=null;context ||= new (window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended'||context.state==='interrupted')context.resume().catch(()=>{});}catch{}
  try{synth?.getVoices();}catch{}
 }
 function stop(){if(typeof BGM!=='undefined')BGM.duck(false);serial++;for(const effect of effects){try{effect.stop();}catch{}}effects.clear();if(source){try{source.stop();}catch{}source=null;}if(synth)synth.cancel();if(finish){finish(false);finish=null;}utterance=null;}
 function listVoices(){return synth?synth.getVoices().filter(v=>v.lang.startsWith('ja')&&v.localService):[];}
 function selectedVoice(){
  const voices=listVoices();const chosen=voices.find(v=>v.voiceURI===config.voiceURI);if(chosen)return chosen;
  // ブラウザーが提供するローカル音声だけを使う。手動の選択を最優先する。
  const score=v=>(/natural|enhanced|premium|高品質|拡張/i.test(v.name||'')?20:0)+(v.default?5:0);
  return voices.map((voice,index)=>({voice,index})).sort((a,b)=>score(b.voice)-score(a.voice)||a.index-b.index)[0]?.voice||null;
 }
 async function localVoice(){
  if(!synth)return null;
  let voice=selectedVoice();
  if(voice)return voice;
  await new Promise(resolve=>{const done=()=>{clearTimeout(timer);synth.removeEventListener('voiceschanged',done);resolve();};const timer=setTimeout(done,1000);synth.addEventListener('voiceschanged',done);});
  return selectedVoice();
 }
 function notice(text){for(const id of ['voice-status','game-voice-status']){const el=document.getElementById(id);if(el)el.textContent=text;}}
 async function play(key,text,kind='study'){
  const task=playRaw(key,text,kind),token=serial;if(typeof BGM!=='undefined')BGM.duck(true);
  try{return await task;}finally{if(token===serial&&typeof BGM!=='undefined')BGM.duck(false);}
 }
 async function playRaw(key,text,kind='study'){
  stop();const token=serial;
  const volume=kind==='goal'?(config.goalVolume??.65):kind==='study'?config.studyVolume:config.cheerVolume;
  if((kind==='goal'?!config.goalSoundOn:!config.voiceOn)||volume===0)return true;
  let blob=await Store.get('audio:'+key);
  if(!blob&&key.startsWith('cheer:')&&typeof BundledCheers!=='undefined')blob=BundledCheers.blob(key.split(':')[1]);
  const clip=!blob&&typeof BundledChants!=='undefined'?BundledChants.clip(key):null;
  if(clip)blob=clip.blob;
  if(!blob&&['bundle:goal-hugo','bundle:praise-ellis','bundle:save-emma'].includes(key)){try{blob=key==='bundle:praise-ellis'?BundledAudio.praiseBlob():key==='bundle:save-emma'?BundledAudio.saveBlob():BundledAudio.goalBlob();}catch{notice('ゴールの こえを ひらけません。bundled-audio.jsも いっしょに おいてね。');return false;}}
  if(token!==serial)return false;
  if(blob){
   try{
    unlock();if(!context)throw Error('AudioContext');
    const buffer=await context.decodeAudioData(await blob.arrayBuffer());if(token!==serial)return false;
    if(context.state!=='running'){await Promise.race([context.resume(),new Promise((_,reject)=>setTimeout(()=>reject(Error('audio gesture needed')),2500))]);if(context.state!=='running')throw Error('audio suspended');}
    source=context.createBufferSource();source.buffer=buffer;source.playbackRate.value=kind==='study'?config.speed:1;
    gain=context.createGain();gain.gain.value=volume;source.connect(gain).connect(context.destination);
    return await new Promise(resolve=>{finish=resolve;source.onended=()=>{if(token===serial){finish=null;source=null;resolve(true);}};if(clip)source.start(0,clip.start,clip.duration);else source.start();});
   }catch{notice('ろくおんを さいせいできません。べつの おんせいを ためしてね。');return false;}
  }
  const voice=await localVoice();if(token!==serial)return false;
  if(!voice){notice('こえが でないときは、おうちの ひとと おんせいを とうろくしてね。');return false;}
  return new Promise(resolve=>{
   utterance=new SpeechSynthesisUtterance(text);utterance.voice=voice;utterance.lang='ja-JP';utterance.rate=config.speed;utterance.pitch=1;utterance.volume=volume;
   finish=resolve;utterance.onend=()=>{if(token===serial){finish=null;resolve(true);}};
   utterance.onerror=()=>{if(token===serial){finish=null;notice('こえを さいせいできませんでした。もういちど おしてね。');resolve(false);}};
   synth.speak(utterance);
  });
 }
 async function chant(q,prompt=false){return play((prompt?'prompt:':'chant:')+q.id,prompt?q.prompt+'？':q.full,'study');}
 function cheerText(text){return text.replace(/\{(name|nick|keeper)\}/g,(_,key)=>config[key]);}
 async function goal(){return typeof BundledCheers!=='undefined'?play('cheer:goal:0','','goal'):play('bundle:goal-hugo','','goal');}
 async function praise(){return play('bundle:praise-ellis','','goal');}
 async function save(){return typeof BundledCheers!=='undefined'?play('cheer:retry:0','','goal'):play('bundle:save-emma','','goal');}
 async function cheer(event){if(typeof BundledCheers!=='undefined')return play('cheer:'+event+':0','','cheer');const lines=config.cheers[event]||[];if(!lines.length)return true;const i=Math.floor(Math.random()*lines.length);return play('cheer:'+event+':'+i,cheerText(lines[i]),'cheer');}
 async function crowd(){
  if(!config.goalSoundOn||!(config.crowdVolume>0))return false;
  const token=serial;
  try{unlock();if(!context)return false;const buffer=await context.decodeAudioData(await BundledAudio.crowdBlob().arrayBuffer());if(token!==serial)return false;
   const effect=context.createBufferSource();effect.buffer=buffer;const volume=context.createGain();volume.gain.value=config.crowdVolume;effect.connect(volume).connect(context.destination);effects.add(effect);effect.onended=()=>effects.delete(effect);effect.start();return true;
  }catch{notice('かんせいを さいせいできませんでした。');return false;}
 }

 return {setup,unlock,stop,play,chant,cheer,cheerText,crowd,localVoice,listVoices,goal,praise,save};
})();
