'use strict';
// 1～9の段は全81問を個別登録。full / prompt / answer は必ず人が確認して変更します。
// 配列内の「|」より前が出題音声、後ろが答えの読みです（数式から発音を推測しません）。
const CHANT_ROWS = [
 ['いんいちが|いち','いんにが|に','いんさんが|さん','いんしが|し','いんごが|ご','いんろくが|ろく','いんしちが|しち','いんはちが|はち','いんくが|く'],
 ['にいちが|に','ににんが|し','にさんが|ろく','にしが|はち','にご|じゅう','にろく|じゅうに','にしち|じゅうし','にはち|じゅうろく','にく|じゅうはち'],
 ['さんいちが|さん','さんにが|ろく','さざんが|く','さんし|じゅうに','さんご|じゅうご','さぶろく|じゅうはち','さんしち|にじゅういち','さんぱ|にじゅうし','さんく|にじゅうしち'],
 ['しいちが|し','しにが|はち','しさん|じゅうに','しし|じゅうろく','しご|にじゅう','しろく|にじゅうし','ししち|にじゅうはち','しは|さんじゅうに','しく|さんじゅうろく'],
 ['ごいちが|ご','ごに|じゅう','ごさん|じゅうご','ごし|にじゅう','ごご|にじゅうご','ごろく|さんじゅう','ごしち|さんじゅうご','ごは|しじゅう','ごっく|しじゅうご'],
 ['ろくいちが|ろく','ろくに|じゅうに','ろくさん|じゅうはち','ろくし|にじゅうし','ろくご|さんじゅう','ろくろく|さんじゅうろく','ろくしち|しじゅうに','ろくは|しじゅうはち','ろっく|ごじゅうし'],
 ['しちいちが|しち','しちに|じゅうし','しちさん|にじゅういち','しちし|にじゅうはち','しちご|さんじゅうご','しちろく|しじゅうに','しちしち|しじゅうく','しちは|ごじゅうろく','しちく|ろくじゅうさん'],
 ['はちいちが|はち','はちに|じゅうろく','はちさん|にじゅうし','はちし|さんじゅうに','はちご|しじゅう','はちろく|しじゅうはち','はちしち|ごじゅうろく','はっぱ|ろくじゅうし','はっく|しちじゅうに'],
 ['くいちが|く','くに|じゅうはち','くさん|にじゅうしち','くし|さんじゅうろく','くご|しじゅうご','くろく|ごじゅうし','くしち|ろくじゅうさん','くは|しちじゅうに','くく|はちじゅういち']
];
const EXTRA_TEN = [
 ['じゅうかけるいちは|','じゅう'],['じゅうかけるには|','にじゅう'],['じゅうかけるさんは|','さんじゅう'],
 ['じゅうかけるよんは|','よんじゅう'],['じゅうかけるごは|','ごじゅう'],['じゅうかけるろくは|','ろくじゅう'],
 ['じゅうかけるななは|','ななじゅう'],['じゅうかけるはちは|','はちじゅう'],['じゅうかけるきゅうは|','きゅうじゅう']
];
const QUESTIONS = CHANT_ROWS.flatMap((row,a)=>row.map((s,b)=>{
 const [prompt,answer]=s.split('|');return {id:`${a+1}-${b+1}`,a:a+1,b:b+1,value:(a+1)*(b+1),prompt,answer,full:prompt+answer};
})).concat(EXTRA_TEN.map(([p,answer],b)=>{const prompt=p.replace('|','');return {id:`10-${b+1}`,a:10,b:b+1,value:10*(b+1),prompt,answer,full:prompt+answer,extra:true};}));
const DEFAULT_SETTINGS = {
 bgmOn:true,bgmVolume:.28,name:'しゅうすけ',nick:'しゅう',number:'29',keeper:'そうた',count:3,speed:1,voiceOn:true,studyVolume:0.65,cheerVolume:0,voiceURI:'',gentleVoice:true,fluentVoiceV1:true,goalSoundOn:true,goalVolume:0.65,crowdVolume:0.4,goalHugoV1:true,soundSetupV8:true,
 cheers:{
  start:['{name}の、くくシュート！ はじまるよ！','{nick}くん、いっしょに やってみよう！'],
  question:['{nick}くん、これわかるかな？','ゆっくりで いいよ！'],
  correct:['せいかい！ {nick}くんすごい！','やったね！ おぼえたね！'],
  shoot:['いっけー！ {nick}！','それっ！ ナイスシュート！'],
  goal:['ゴーーール！ {nick}くんかっこいいー！','{keeper}くんもびっくり！'],
  retry:['だいじょうぶ！ もういっかい！','ゆっくり きいてみよう！'],
  clear:['{name}、やったね！ きょうもがんばったね！','ナイス！ またいっしょに あそぼう！']
 }
};
const EVENT_LABELS={start:'開始',question:'出題',correct:'正解',shoot:'シュート',goal:'ゴール',retry:'もう一度',clear:'クリア'};
function freshState(){return {version:1,settings:structuredClone(DEFAULT_SETTINGS),history:{},events:[],practice:{listened:0,spoken:0,goals:0,rounds:0,shots:0,saves:0}};}
// 間違いが多い問題を優先。連続正解すると重みを下げる（ゼロにはしない）。
function questionWeight(history){if(!history)return 3;return Math.max(0.2,(3+(history.due?6:0)+Math.min(history.wrong,8)*0.6)/(1+history.streak*1.5));}
function chooseQuestions(pool,count,history,random=Math.random){
 const remaining=[...pool],result=[];
 while(result.length<count&&pool.length){
  if(!remaining.length)remaining.push(...pool);
  const total=remaining.reduce((sum,q)=>sum+questionWeight(history[q.id]),0);
  let r=random()*total,at=0;
  for(;at<remaining.length-1;at++){r-=questionWeight(history[remaining[at].id]);if(r<0)break;}
  result.push(remaining.splice(at,1)[0]);
 }
 return result;
}
function applyAnswer(state,q,correct,firstTry){
 const h=state.history[q.id] ||= {correct:0,wrong:0,streak:0,wrongStreak:0,due:false,last:''};
 if(correct){h.correct++;h.wrongStreak=0;h.streak=firstTry?h.streak+1:0;if(h.streak>=3)h.due=false;}
 else {h.wrong++;h.streak=0;h.wrongStreak++;h.due=true;}
 h.last=new Date().toISOString();state.events.push({id:q.id,correct,firstTry,at:h.last});
 state.events=state.events.slice(-500);return h;
}
