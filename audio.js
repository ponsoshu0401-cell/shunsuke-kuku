'use strict';
const Voice = (()=>{
 let context,source,gain,utterance,finish,serial=0;
 const effects=new Set();
 let config=DEFAULT_SETTINGS;
 const synth=window.speechSynthesis;
 function setup(settings){config=settings;}
 function unlock(){
  try{context ||= new (window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')context.resume().catch(()=>{});}catch{}
  synth?.getVoices();
 }
 function stop(){serial++;for(const effect of effects){try{effect.stop();}catch{}}effects.clear();if(source){try{source.stop();}catch{}source=null;}if(synth)synth.cancel();if(finish){finish(false);finish=null;}utterance=null;}
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
 function notice(text){document.getElementById('voice-status').textContent=text;}
 async function play(key,text,kind='study'){
  stop();const token=serial;
  const volume=kind==='goal'?(config.goalVolume??.65):kind==='study'?config.studyVolume:config.cheerVolume;
  if((kind==='goal'?!config.goalSoundOn:!config.voiceOn)||volume===0)return true;
  let blob=await Store.get('audio:'+key);
  if(!blob&&key==='bundle:goal'){try{const response=await fetch('./audio/goal.mp3');if(!response.ok)throw Error('goal audio');blob=await response.blob();}catch{notice('ゴールの こえを ひらけません。アプリの ファイルを たしかめてね。');return false;}}
  if(token!==serial)return false;
  if(blob){
   try{
    unlock();if(!context)throw Error('AudioContext');
    const buffer=await context.decodeAudioData(await blob.arrayBuffer());if(token!==serial)return false;
    if(context.state!=='running')await context.resume();
    source=context.createBufferSource();source.buffer=buffer;source.playbackRate.value=kind==='goal'?1:config.speed;
    gain=context.createGain();gain.gain.value=volume;source.connect(gain).connect(context.destination);
    return await new Promise(resolve=>{finish=resolve;source.onended=()=>{if(token===serial){finish=null;source=null;resolve(true);}};source.start();});
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
 async function goal(){return play('bundle:goal','','goal');}
 async function cheer(event){const lines=config.cheers[event]||[];if(!lines.length)return true;const i=Math.floor(Math.random()*lines.length);return play('cheer:'+event+':'+i,cheerText(lines[i]),'cheer');}
 function crowd(){
  if(!config.voiceOn||!config.cheerVolume)return;
  try{unlock();if(!context)return;const buffer=context.createBuffer(1,context.sampleRate*0.9,context.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,1.5)*0.15;const s=context.createBufferSource();s.buffer=buffer;const filter=context.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1200;const g=context.createGain();g.gain.value=config.cheerVolume;s.connect(filter).connect(g).connect(context.destination);effects.add(s);s.onended=()=>effects.delete(s);s.start();}catch{}
 }
 return {setup,unlock,stop,play,chant,cheer,cheerText,crowd,localVoice,listVoices,goal};
})();
