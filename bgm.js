'use strict';
// このアプリ用のオリジナル曲。音を端末内で生成するため、通信や外部音源は不要です。
const BGM=(()=>{
 let context,source,volume,buffer,settings={},page='home',ducked=false;
 function wanted(){return settings.bgmOn!==false&&(settings.bgmVolume??.28)>0&&(settings.voiceOn||settings.goalSoundOn)&&['game','finish'].includes(page)&&!document.hidden;}
 function level(){if(!volume||!context)return;const target=wanted()?(settings.bgmVolume??.28)*.22*(ducked?.18:1):0;volume.gain.setTargetAtTime(target,context.currentTime,.10);}
 function makeLoop(){const rate=22050,beat=60/112,length=beat*16,data=new Float32Array(Math.ceil(rate*length));
  function note(start,seconds,midi,strength){const f=440*Math.pow(2,(midi-69)/12),from=Math.round(start*rate),count=Math.floor(seconds*rate);for(let i=0;i<count&&from+i<data.length;i++){const t=i/rate,env=Math.min(1,t/.012)*Math.exp(-t*5/seconds)*Math.min(1,(seconds-t)/.04);data[from+i]+=strength*env*(Math.sin(2*Math.PI*f*t)+.18*Math.sin(4*Math.PI*f*t));}}
  const melody=[72,76,79,76,74,76,79,81,77,76,74,72,74,76,79,0,72,76,79,84,81,79,76,74,77,76,74,71,72,0,79,0];
  melody.forEach((n,i)=>{if(n)note(i*beat/2,beat*.42,n,.20)});
  const bass=[48,48,53,55];for(let i=0;i<16;i++){note(i*beat,beat*.7,bass[Math.floor(i/4)],.24);note(i*beat+beat/2,beat*.20,60+bass[Math.floor(i/4)]%12,.045);}
  const out=context.createBuffer(1,data.length,rate);out.getChannelData(0).set(data);return out;
 }
 function pause(){if(source){try{source.stop()}catch{}source=null;}}
 function sync(){level();if(!wanted()){pause();return;}if(!context||context.state!=='running'||source)return;try{buffer ||= makeLoop();source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(volume);source.start();}catch{pause();}}
 function unlock(){if(!wanted())return;try{if(context?.state==='closed'){context=null;buffer=null;}if(!context){context=new(window.AudioContext||window.webkitAudioContext)();volume=context.createGain();volume.gain.value=0;volume.connect(context.destination);}if(context.state!=='running')context.resume().then(sync).catch(()=>{});else sync();}catch{}}
 function setup(s){settings=s;sync();}
 function screen(name){page=name;sync();}
 function duck(value){ducked=value;level();}
 return {setup,screen,unlock,pause,duck};
})();
