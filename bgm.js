'use strict';
// Original meadow music, generated entirely offline: piano, bells and a soft pad.
const BGM=(()=>{
 let context,source,volume,buffer,settings={},page='home',ducked=false,previewing=false;
 function wanted(){return settings.bgmOn!==false&&(settings.bgmVolume??.5)>0&&(settings.voiceOn||settings.goalSoundOn)&&(['home','game','finish'].includes(page)||previewing)&&!document.hidden;}
 function updateButton(){const el=document.getElementById?.('bgm-start');if(el){el.hidden=page!=='home'||!wanted();el.textContent=context?.state==='running'?'BGM さいせいちゅう':'タップで BGMを つける';}}
 function level(){if(!volume||!context)return;const target=wanted()?(settings.bgmVolume??.5)*.75*(ducked?.22:1):0;volume.gain.setTargetAtTime(target,context.currentTime,.08);}
 function makeLoop(){
  const rate=22050,beat=60/76,length=beat*64,data=new Float32Array(Math.ceil(rate*length));
  function note(start,seconds,midi,strength,pad=false){
   const f=440*Math.pow(2,(midi-69)/12),from=Math.round(start*rate),count=Math.floor(seconds*rate);
   for(let i=0;i<count&&from+i<data.length;i++){
    const t=i/rate,attack=pad?.65:.018,release=pad?.9:.22;
    const env=Math.min(1,t/attack)*Math.min(1,(seconds-t)/release)*(pad?1:Math.exp(-t*3.8/seconds));
    const tone=Math.sin(2*Math.PI*f*t)+.18*Math.sin(4*Math.PI*f*t)*Math.exp(-t*3)+.07*Math.sin(6*Math.PI*f*t)*Math.exp(-t*6);
    data[from+i]+=strength*env*tone;
   }
  }
  const chords=[[48,55,64],[45,52,60],[53,60,69],[55,62,67],[48,55,64],[52,59,67],[53,60,69],[55,62,69]];
  const melody=[72,0,76,79,76,0,74,0,72,69,0,72,74,0,71,0,76,0,79,84,79,76,0,74,72,0,69,72,71,0,74,0];
  for(let bar=0;bar<16;bar++){
   const chord=chords[bar%8],at=bar*4*beat;
   chord.forEach(n=>note(at,beat*3.8,n,.025,true));
   [0,2,1,2].forEach((n,i)=>note(at+i*beat,beat*1.65,chord[n]+12,.12));
   for(let i=0;i<2;i++){const m=melody[bar*2+i];if(m)note(at+(i*2+.5)*beat,beat*2.3,m,.17);}
  }
  let peak=0;for(const sample of data)peak=Math.max(peak,Math.abs(sample));
  if(peak)for(let i=0;i<data.length;i++)data[i]=data[i]/peak*.85;
  const fade=rate*.18;for(let i=0;i<fade;i++){const g=i/fade;data[i]*=g;data[data.length-1-i]*=g;}
  const out=context.createBuffer(1,data.length,rate);out.getChannelData(0).set(data);return out;
 }
 function pause(){if(source){try{source.stop()}catch{}source=null;}}
 function sync(){level();updateButton();if(!wanted()){pause();return;}if(!context||context.state!=='running'||source)return;try{buffer ||= makeLoop();source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(volume);source.start();}catch{pause();}}
 function unlock(){if(!wanted()){updateButton();return;}try{if(context?.state==='closed'){context=null;buffer=null;}if(!context){context=new(window.AudioContext||window.webkitAudioContext)();volume=context.createGain();volume.gain.value=0;volume.connect(context.destination);}if(context.state!=='running')context.resume().then(sync).catch(updateButton);else sync();}catch{updateButton();}}
 function setup(s){settings=s;sync();}
 function screen(name){page=name;previewing=false;sync();}
 function preview(){previewing=true;unlock();}
 function duck(value){ducked=value;level();}
 return {setup,screen,unlock,pause,duck,preview};
})();
