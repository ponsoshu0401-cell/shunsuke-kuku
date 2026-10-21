'use strict';
const $=id=>document.getElementById(id);
let state=freshState(),screen='home',mode='listen',selected=2,queue=[],position=0,current=null,phase='question',hadWrong=false,hintUsed=false,flow=0,continuous=false,listenPosition=0,listenPool=[],roundPool=[],isReview=false;
let roundScore={goals:0,shots:0,saves:0};
const photoURLs={};let recording=null,recordStarting=false;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function persist(){return Store.put('state',state);}
function setText(id,text){$(id).textContent=text;}
function go(name){$('native-audio-check')?.pause?.();flow++;continuous=false;Voice.stop();if(recording||recordStarting)cancelRecording();screen=name;if(typeof BGM!=='undefined'){BGM.screen(name);BGM.unlock();}document.body?.classList.toggle('game-active',name==='game');document.querySelectorAll('.screen').forEach(el=>el.hidden=el.id!==name);window.scrollTo({top:0,behavior:'instant'});}
function poolForSelection(){return QUESTIONS.filter(q=>selected==='recommended'?[2,5,10].includes(q.a):q.a===selected);}
function selectionLabel(){return selected==='recommended'?'おすすめ 2・5・10':`${selected}の だん`;}
function duePool(){return QUESTIONS.filter(q=>state.history[q.id]?.due);}
function updateScore(){setText('score-goals',roundScore.goals);setText('score-shots',roundScore.shots);setText('score-saves',roundScore.saves);setText('score-saves-label',state.settings.keeper+'の セーブ');$('scoreboard').hidden=mode!=='quiz';}
function updateHome(){
 const due=duePool().length;setText('due-count',`${due}もん`);$('review').disabled=!due;
 setText('home-stats',`ゴール ${state.practice.goals}かい ／ ${state.practice.shots}シュート ・ きいた くく ${state.practice.listened}かい`);
 setText('hero-name',state.settings.name);setText('shirt-number',state.settings.number);setText('home-shirt-number',state.settings.number);
 document.querySelectorAll('[data-name]').forEach(el=>el.textContent=state.settings[el.dataset.name]);
 const soundOn=state.settings.voiceOn&&state.settings.goalSoundOn;setText('sound-toggle',soundOn?'おと ON':'おとをつける');$('sound-toggle').setAttribute('aria-pressed',String(soundOn));
 $('goal-voice-on').checked=state.settings.goalSoundOn;$('voice-on').checked=state.settings.voiceOn;Voice.setup(state.settings);if(typeof BGM!=='undefined')BGM.setup(state.settings);
}
function selectLevel(level){selected=level;document.querySelectorAll('[data-level]').forEach(button=>{const yes=Number(button.dataset.level)===level;button.classList.toggle('selected',yes);button.setAttribute('aria-pressed',String(yes));});$('recommended').classList.toggle('selected',level==='recommended');$('recommended').setAttribute('aria-pressed',String(level==='recommended'));setText('selection-note',level===10?'10の だんは「じゅう かける…」で よむよ。':selectionLabel());}
function selectMode(next){mode=next;document.querySelectorAll('[data-mode]').forEach(button=>{const yes=button.dataset.mode===mode;button.classList.toggle('selected',yes);button.setAttribute('aria-pressed',String(yes));});}
async function openListen(pool){
 go('learn');listenPool=[...pool];listenPosition=0;$('learn-speed').value=String(state.settings.speed);setText('learn-title','きいて おぼえる');
 setText('learn-guide',pool.length===1?'もういちど いっしょに いってみよう。':'こえに あわせて いってみよう。');
 $('chant-list').replaceChildren();
 for(const q of listenPool){const b=document.createElement('button');b.className='chant-row';b.dataset.question=q.id;b.setAttribute('aria-label',`${q.a}かける${q.b}。${q.full}。きく`);
 const num=document.createElement('span');num.className='row-num';num.textContent=q.a+'のだん';const content=document.createElement('span');const eq=document.createElement('b');eq.textContent=`${q.a} × ${q.b} = ${q.value}`;const reading=document.createElement('small');reading.textContent=q.full;content.append(eq,reading);const speaker=document.createElement('img');speaker.className='speaker';speaker.src='ui-speaker.svg';speaker.alt='';speaker.setAttribute('aria-hidden','true');b.append(num,content,speaker);b.addEventListener('click',()=>playSingle(q));$('chant-list').append(b);}
 setText('play-all','じゅんばんに きく');
}
function highlight(id){document.querySelectorAll('.chant-row').forEach(el=>{const active=el.dataset.question===id;el.classList.toggle('active',active);el.setAttribute('aria-current',active?'true':'false');});}
async function noteListen(){state.practice.listened++;await persist();updateHome();}
async function playSingle(q){const ticket=++flow;continuous=false;Voice.stop();highlight(q.id);const ok=await Voice.chant(q);if(ticket!==flow)return;highlight(null);if(ok&&state.settings.voiceOn&&state.settings.studyVolume>0)await noteListen();}
async function playAll(){
 if(continuous)return;continuous=true;const ticket=++flow;Voice.stop();
 for(let i=listenPosition;i<listenPool.length;i++){
  if(ticket!==flow||!continuous)return;listenPosition=i;const q=listenPool[i];highlight(q.id);
  document.querySelector(`[data-question="${q.id}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'});
  const ok=await Voice.chant(q);if(ticket!==flow)return;
  if(!ok){continuous=false;highlight(null);setText('play-all','ここから きく');return;}
  if(state.settings.voiceOn&&state.settings.studyVolume>0)await noteListen();await wait(450);if(ticket!==flow)return;
 }
 continuous=false;listenPosition=0;highlight(null);setText('play-all','もういちど きく');
}
function stopAll(){flow++;continuous=false;Voice.stop();highlight(null);setText('play-all','ここから きく');}
function beginGame(pool,review=false){
 if(!pool.length){go('home');return;}roundPool=[...pool];isReview=review;
 roundScore={goals:0,shots:0,saves:0};updateScore();queue=chooseQuestions(pool,state.settings.count,state.history);position=0;go('game');renderQuestion();
}
function renderQuestion(){
 flow++;Voice.stop();const ticket=flow;current=queue[position];phase='question';hadWrong=false;hintUsed=false;
 $('stadium').classList.remove('shooting','saving');$('goal-banner').hidden=true;$('save-banner').hidden=true;$('repeat').disabled=false;$('confetti').replaceChildren();
 setText('game-mode',mode==='speak'?'つづきを いおう':isReview?'ふくしゅう':'くくシュート！');setText('counter',`${position+1} / ${queue.length}`);
 setText('question-guide',mode==='speak'?'こえに だして いってみよう':'つづきは なあに？');setText('equation',`${current.a} × ${current.b} = ？`);setText('reading',current.prompt+'…？');setText('feedback','');
 $('answers').hidden=mode==='speak';$('reveal').hidden=mode!=='speak';$('reveal').disabled=false;$('next').hidden=true;$('retry-tools').hidden=true;$('listen-help').hidden=true;
 renderChoices();if(typeof ShotMotion!=='undefined')ShotMotion.prepare();
 (async()=>{await Voice.cheer('question');if(ticket!==flow)return;await Voice.chant(current,true);})();
}
function renderChoices(){
 const answer=current.value,values=new Set([answer]);const candidates=[answer-current.a,answer+current.a,answer+2*current.a,answer-1,answer+1].filter(n=>n>0&&n!==answer);
 while(values.size<3&&candidates.length){const i=Math.floor(Math.random()*candidates.length);values.add(candidates.splice(i,1)[0]);}
 const choices=[...values].sort(()=>Math.random()-.5);$('answers').replaceChildren();
 choices.forEach(value=>{const button=document.createElement('button');button.textContent=value;button.setAttribute('aria-label',String(value));button.addEventListener('click',()=>answerQuestion(value,button));$('answers').append(button);});
}
function recoverSave(){phase='question';$('repeat').disabled=false;[...$('answers').children].forEach(b=>b.disabled=false);$('retry-tools').hidden=false;$('listen-help').hidden=(state.history[current.id]?.wrongStreak||0)<2;setText('feedback','だいじょうぶ！ もういちど できるよ。');}
async function answerQuestion(value,button){
 if(phase!=='question')return;Voice.unlock();const q=current;const ticket=++flow;Voice.stop();if(typeof ShotMotion!=='undefined')ShotMotion.prepare();
 roundScore.shots++;state.practice.shots++;updateScore();
 if(value!==q.value){
  phase='saving';hadWrong=true;roundScore.saves++;state.practice.saves++;updateScore();
  const h=applyAnswer(state,q,false,false);persist();
  [...$('answers').children].forEach(b=>b.disabled=true);$('repeat').disabled=true;
  $('retry-tools').hidden=true;$('listen-help').hidden=true;$('goal-banner').hidden=true;$('save-banner').hidden=true;
  $('stadium').classList.remove('shooting','saving');void $('stadium').offsetWidth;$('stadium').classList.add('saving');
  setText('feedback',state.settings.keeper+'が キャッチ！');
  try{await wait(800);if(ticket!==flow)return;$('save-banner').hidden=false;recoverSave();await Voice.save();}
  finally{if(ticket===flow){recoverSave();}}
  return;
 }
 phase='solved';showNext();$('next').disabled=true;applyAnswer(state,q,true,!hadWrong&&!hintUsed);state.practice.goals++;roundScore.goals++;updateScore();persist();
 [...$('answers').children].forEach(b=>{b.disabled=true;if(Number(b.textContent)===q.value)b.classList.add('correct');});
 $('retry-tools').hidden=true;$('listen-help').hidden=true;$('save-banner').hidden=true;setText('equation',q.a+' × '+q.b+' = '+q.value);setText('reading',q.full);setText('feedback','せいかい！ シュート！');
 $('stadium').classList.remove('saving','shooting');void $('stadium').offsetWidth;$('stadium').classList.add('shooting');
 try{
  await wait(850);if(ticket!==flow)return;$('goal-banner').hidden=false;makeConfetti();showNext();
  const goalPlayback=Voice.goal();await Voice.crowd();await goalPlayback;if(ticket!==flow)return;
  await Voice.praise();if(ticket!==flow)return;await Voice.chant(q);
 }finally{if(ticket===flow)showNext();}
}

function showNext(){$('next').disabled=false;setText('next',position===queue.length-1?'できた！ →':mode==='speak'?'いえた！ つぎへ →':'つぎへ →');$('next').hidden=false;}
function makeConfetti(){const box=$('confetti');for(let i=0;i<22;i++){const p=document.createElement('i');p.style.left=`${Math.random()*100}%`;p.style.animationDelay=`${Math.random()*.5}s`;box.append(p);}}
async function reveal(){if(phase!=='question')return;phase='revealed';const ticket=++flow;Voice.stop();$('reveal').disabled=true;setText('equation',`${current.a} × ${current.b} = ${current.value}`);setText('reading',current.full);setText('feedback','いっしょに いってみよう！');state.practice.spoken++;persist();showNext();await Voice.chant(current);if(ticket!==flow)return;}
function nextQuestion(){if(!['solved','revealed'].includes(phase)||$('next').disabled)return;flow++;Voice.stop();position++;if(position<queue.length)renderQuestion();else finishRound();}
function finishRound(){state.practice.rounds++;persist();go('finish');setText('finish-message',mode==='speak'?`${queue.length}もん、こえに だす れんしゅうを したね！`:`${roundScore.shots}シュートで ${roundScore.goals}ゴール！ ナイスシュート！`);updateHome();Voice.cheer('clear');}
async function hint(){if(phase!=='question')return;hintUsed=true;const ticket=++flow;Voice.stop();setText('feedback','こえを きいて いってみよう。');setText('reading',current.full);await Voice.chant(current);if(ticket===flow&&phase==='question')setText('reading',current.prompt+'…？');}
function loadSettingsForm(){
 const voiceSelect=$('set-voice');voiceSelect.replaceChildren();const standard=document.createElement('option');standard.value='';standard.textContent='自動で選ぶ（端末内の日本語音声）';voiceSelect.append(standard);for(const voice of Voice.listVoices?.()||[]){const option=document.createElement('option');option.value=voice.voiceURI;option.textContent=voice.name;voiceSelect.append(option);}voiceSelect.value=state.settings.voiceURI||'';
 const s=state.settings;for(const name of ['name','nick','number','keeper','count','speed'])$('set-'+name).value=s[name];$('set-study-volume').value=s.studyVolume;$('set-bgm-volume').value=s.bgmVolume;$('set-bgm-on').checked=s.bgmOn;$('set-cheer-volume').value=s.cheerVolume;$('set-goal-volume').value=s.goalVolume;$('set-crowd-volume').value=s.crowdVolume;
 $('cheer-editors').replaceChildren();for(const [key,label]of Object.entries(EVENT_LABELS)){const l=document.createElement('label');l.textContent=label;const text=document.createElement('textarea');text.id='cheer-'+key;text.maxLength=600;text.value=s.cheers[key].join('\n');l.append(text);$('cheer-editors').append(l);}
 setText('settings-status','');renderHistory();refreshAudioSlots();updateAudioTarget();
}
let settingsSaveTimer;
async function saveSettings(event){
 event?.preventDefault();clearTimeout(settingsSaveTimer);
 const fields={};for(const key of ['name','nick','keeper'])fields[key]=$('set-'+key).value.trim();
 const number=$('set-number').value.normalize('NFKC').trim();
 if(Object.values(fields).some(value=>!value)||!/^\d{1,2}$/.test(number)){setText('settings-status','名前を入力し、背番号は0〜99の数字にしてください。');return false;}
 const s=state.settings;Object.assign(s,fields,{number,voiceURI:$('set-voice').value,gentleVoice:true});
 s.count=Number($('set-count').value);s.speed=Number($('set-speed').value);
 s.bgmOn=$('set-bgm-on').checked;
 for(const key of ['study','cheer','goal','crowd','bgm'])s[key+'Volume']=Number($('set-'+key+'-volume').value);
 for(const key of Object.keys(EVENT_LABELS))s.cheers[key]=$('cheer-'+key).value.split('\n').map(v=>v.trim()).filter(Boolean).slice(0,8);
 Voice.stop();updateHome();refreshAudioSlots();await updateAudioTarget();
 const ok=await persist();setText('settings-status',ok?'変更を反映し、この端末に保存しました。':'変更は反映しましたが、端末に保存できませんでした。');return true;
}
function scheduleSettingsSave(){clearTimeout(settingsSaveTimer);setText('settings-status','変更を保存しています…');settingsSaveTimer=setTimeout(()=>saveSettings(),300);}
async function returnHome(){if(screen==='parents'&&!(await saveSettings()))return;go('home');updateHome();}

function renderHistory(){
 const list=Object.entries(state.history),correct=list.reduce((n,[,h])=>n+h.correct,0),wrong=list.reduce((n,[,h])=>n+h.wrong,0);
 setText('stats-summary',`正解 ${correct}回 ／ 再挑戦 ${wrong}回 ／ 復習 ${duePool().length}問。聞いた回数 ${state.practice.listened}回、続きの練習 ${state.practice.spoken}回、ゴール ${state.practice.goals}回、クリア ${state.practice.rounds}回。シュート ${state.practice.shots}回、GKセーブ ${state.practice.saves}回。直近${state.events.length}件の回答履歴を端末内に保存しています。`);
 $('history-table').replaceChildren();for(const q of QUESTIONS){const h=state.history[q.id];if(!h)continue;const tr=document.createElement('tr');for(const text of [`${q.a}×${q.b}`,h.correct,h.wrong,h.streak,h.due?'れんしゅう':'—']){const td=document.createElement('td');td.textContent=text;tr.append(td);}$('history-table').append(tr);}
}
async function refreshFace(person){
 if(photoURLs[person]){URL.revokeObjectURL(photoURLs[person]);delete photoURLs[person];}
 const blob=await Store.get('photo:'+person);const src=blob?URL.createObjectURL(blob):`icons/${person}.svg`;if(blob)photoURLs[person]=src;
 document.querySelectorAll(`[data-face="${person}"]`).forEach(img=>img.src=src);$('photo-'+person).src=src;
}
async function importPhoto(person,file){
 if(!file)return;setText('photo-status','写真を準備しています…');
 try{
  if(file.size>15*1024*1024)throw Error('15MB以下の写真を選んでください。');
  if(!/^image\/(jpeg|png|webp|heic|heif|avif)$/i.test(file.type))throw Error('JPEG・PNGなどの写真を選んでください。HEICが開けない場合はJPEGへ変換してください。');
  const url=URL.createObjectURL(file);let image;
  try{image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('写真を開けませんでした。JPEGかPNGを試してください。'));img.src=url;});}
  finally{URL.revokeObjectURL(url);}
  const side=Math.min(image.naturalWidth,image.naturalHeight);if(!side)throw Error('写真を開けませんでした。');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=Math.min(384,side);const ctx=canvas.getContext('2d');ctx.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));if(!blob)throw Error('写真を変換できませんでした。');
  const ok=await Store.put('photo:'+person,blob);await refreshFace(person);setText('photo-status',ok?'写真をこの端末に保存しました。':'写真を表示しましたが、保存できませんでした。');
 }catch(error){setText('photo-status',error.message);}
}
async function deletePhoto(person){if(!confirm('この写真を端末内のアプリから削除しますか？'))return;const ok=await Store.remove('photo:'+person);await refreshFace(person);setText('photo-status',ok?'写真を削除しました。元のキャラクターに戻りました。':'画面から外しましたが、保存領域の削除を確認できません。');}
function refreshAudioSlots(){const key=$('audio-event').value||'goal';const old=$('audio-slot').value;$('audio-slot').replaceChildren();(state.settings.cheers[key]||[]).forEach((line,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`${i+1}. ${Voice.cheerText(line)}`;$('audio-slot').append(o);});if([...$('audio-slot').options].some(o=>o.value===old))$('audio-slot').value=old;}
function audioTarget(){
 const type=$('audio-kind').value;
 if(type==='praise')return {key:'bundle:praise-ellis',text:'ゴール後のほめる音声（Ellis）',kind:'goal'};
 if(type==='save')return {key:'bundle:save-emma',text:'GKセーブの音声（Emma）',kind:'goal'};
 if(type==='cheer'){const event=$('audio-event').value,i=$('audio-slot').value;if(event==='goal')return {key:'bundle:goal-hugo',text:'ゴールの音声（添付MP3）',kind:'goal'};if(i==='')return null;return {key:`cheer:${event}:${i}`,text:Voice.cheerText(state.settings.cheers[event][Number(i)]||''),kind:'cheer'};}
 const q=QUESTIONS.find(q=>q.id===$('audio-question').value)||QUESTIONS[0];return {key:type+':'+q.id,text:type==='prompt'?q.prompt+'…？':q.full,kind:'study'};
}
let audioTargetVersion=0;
async function updateAudioTarget(){
 const version=++audioTargetVersion;const cheer=$('audio-kind').value==='cheer';$('audio-question-label').hidden=cheer||['praise','save'].includes($('audio-kind').value);$('audio-event-label').hidden=!cheer;$('audio-slot-label').hidden=!cheer||$('audio-event').value==='goal';
 const target=audioTarget();setText('audio-script',target?`読む内容：${target.text}`:'先に応援セリフを保存してください。');const blob=target?await Store.get('audio:'+target.key):null;if(version!==audioTargetVersion)return;setText('audio-file-status',blob?'登録済み：オフラインでも再生できます。':target?.key.startsWith('bundle:')?'同梱した音声を使用します。別の録音を登録すると差し替えられます。':'録音は未登録です。端末内の日本語合成音声を使います。');$('preview-audio').disabled=!target;$('delete-audio').disabled=!blob;
}
async function validateAudio(blob){
 if(!blob.size||blob.size>10*1024*1024)throw Error('音声は空でない10MB以下のファイルを選んでください。');
 const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)throw Error('このブラウザーは音声の登録に対応していません。');const ctx=new AudioCtx();
 try{const decoded=await ctx.decodeAudioData(await blob.arrayBuffer());if(decoded.duration>90)throw Error('音声は90秒以内にしてください。');}
 catch(error){if(error.message.includes('90秒'))throw error;throw Error('この端末で再生できません。MP3・AAC（M4A）・WAVを試してください。');}finally{await ctx.close();}
}
async function importAudio(blob,target){
 if(!target){setText('audio-file-status','先にセリフを設定してください。');return;}
 try{setText('audio-file-status','音声を確認しています…');await validateAudio(blob);const ok=await Store.put('audio:'+target.key,blob);await updateAudioTarget();setText('audio-file-status',ok?`「${target.text}」をこの端末に保存しました。`:'音声を一時登録しましたが、保存できませんでした。');}
 catch(error){setText('audio-file-status',error.message);}
}
async function startRecording(){
 if(recording||recordStarting)return;const target=audioTarget();if(!target)return;
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setText('record-status','この環境では直接録音できません。スマートフォンの録音アプリで録音し、ファイルを登録してください。');return;}
 recordStarting=true;const ticket=flow;$('record').disabled=true;Voice.stop();
 let stream;
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:true});if(ticket!==flow){stream.getTracks().forEach(t=>t.stop());return;}
  const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type));const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);const chunks=[];const session={recorder,stream,cancel:false,target,timer:null};recording=session;
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>{clearTimeout(session.timer);stream.getTracks().forEach(t=>t.stop());recording=null;$('record').disabled=false;$('stop-record').disabled=true;if(!session.cancel){await importAudio(new Blob(chunks,{type:recorder.mimeType}),target);setText('record-status','録音を終了しました。再生して確認してください。');}else setText('record-status','録音を取り消しました。');};
  recorder.onerror=()=>{session.cancel=true;if(recorder.state!=='inactive')recorder.stop();stream.getTracks().forEach(t=>t.stop());setText('record-status','録音できませんでした。音声ファイルの登録を試してください。');};
  recorder.start();session.timer=setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop();},90000);$('stop-record').disabled=false;setText('record-status',`録音中：「${target.text}」。90秒で自動保存します。`);
 }catch{stream?.getTracks().forEach(t=>t.stop());$('record').disabled=false;setText('record-status','マイクを使えませんでした。許可を確認するか、音声ファイルを登録してください。');}
 finally{recordStarting=false;if(!recording)$('record').disabled=false;}
}
function cancelRecording(){recordStarting=false;if(recording){recording.cancel=true;if(recording.recorder.state!=='inactive')recording.recorder.stop();}}
function safeState(saved){
 const result=freshState();if(!saved||saved.version!==1)return result;
 const s=saved.settings||{};for(const k of ['name','nick','keeper'])if(typeof s[k]==='string'&&s[k].trim())result.settings[k]=s[k].slice(0,20);
 if(/^\d{1,2}$/.test(s.number))result.settings.number=s.number;
 if([3,5,9].includes(s.count))result.settings.count=s.count;if([.65,.85,1,1.15].includes(s.speed))result.settings.speed=s.speed;
 for(const k of ['studyVolume','cheerVolume','goalVolume','crowdVolume','bgmVolume'])if(Number.isFinite(s[k])&&s[k]>=0&&s[k]<=1)result.settings[k]=s[k];if(typeof s.voiceOn==='boolean')result.settings.voiceOn=s.voiceOn;
 if(!s.fluentVoiceV1&&result.settings.speed===.85)result.settings.speed=1;
 if(typeof s.bgmOn==='boolean')result.settings.bgmOn=s.bgmOn;
 if(typeof s.goalSoundOn==='boolean')result.settings.goalSoundOn=s.goalSoundOn;
 if(!s.goalHugoV1){result.settings.goalSoundOn=true;if(result.settings.goalVolume===0)result.settings.goalVolume=.65;result.settings.crowdVolume=.4;}
 if(typeof s.voiceURI==='string')result.settings.voiceURI=s.voiceURI;
 if(!s.gentleVoice){result.settings.voiceOn=false;result.settings.cheerVolume=0;result.settings.studyVolume=.65;}
 if(!s.soundSetupV8){result.settings.voiceOn=true;result.settings.goalSoundOn=true;if(result.settings.studyVolume===0)result.settings.studyVolume=.65;if(result.settings.goalVolume===0)result.settings.goalVolume=.65;}
 for(const k of Object.keys(EVENT_LABELS))if(Array.isArray(s.cheers?.[k]))result.settings.cheers[k]=s.cheers[k].filter(v=>typeof v==='string').slice(0,8).map(v=>v.slice(0,300));
 for(const q of QUESTIONS){const h=saved.history?.[q.id];if(h&&['correct','wrong','streak','wrongStreak'].every(k=>Number.isSafeInteger(h[k])&&h[k]>=0))result.history[q.id]={...h,due:Boolean(h.due)};}
 if(Array.isArray(saved.events))result.events=saved.events.filter(e=>QUESTIONS.some(q=>q.id===e.id)&&typeof e.correct==='boolean').slice(-500);
 for(const k of Object.keys(result.practice))if(Number.isSafeInteger(saved.practice?.[k])&&saved.practice[k]>=0)result.practice[k]=saved.practice[k];if(!Number.isSafeInteger(saved.practice?.shots))result.practice.shots=Object.values(result.history).reduce((n,h)=>n+h.correct+h.wrong,0);if(!Number.isSafeInteger(saved.practice?.saves))result.practice.saves=Object.values(result.history).reduce((n,h)=>n+h.wrong,0);return result;
}
async function boot(){
 $('start').disabled=true;
 await Store.open();state=safeState(await Store.get('state'));Voice.setup(state.settings);
 for(let n=1;n<=9;n++){const b=document.createElement('button');b.dataset.level=n;b.textContent=n;b.setAttribute('aria-label',`${n}のだん`);b.addEventListener('click',()=>selectLevel(n));$('levels').append(b);}
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>selectMode(b.dataset.mode)));$('extra-ten').addEventListener('click',()=>selectLevel(10));$('recommended').addEventListener('click',()=>selectLevel('recommended'));
 $('sound-toggle').addEventListener('click',()=>{Voice.unlock();const on=!(state.settings.voiceOn&&state.settings.goalSoundOn);state.settings.voiceOn=on;state.settings.goalSoundOn=on;state.settings.soundSetupV8=true;if(on){if(state.settings.studyVolume===0)state.settings.studyVolume=.65;if(state.settings.goalVolume===0)state.settings.goalVolume=.65;}Voice.stop();updateHome();persist();if(on)Voice.play('sound-check','ににんがし。','study');});
 $('start').addEventListener('click',()=>{Voice.unlock();if(mode==='listen'){openListen(poolForSelection());Voice.cheer('start');}else{beginGame(poolForSelection());const ticket=++flow;Voice.stop();(async()=>{await Voice.cheer('start');if(ticket!==flow)return;await Voice.chant(current,true);})();}});
 $('review').addEventListener('click',()=>{selectMode('quiz');Voice.unlock();beginGame(duePool(),true);});
 $('play-all').addEventListener('click',()=>{Voice.unlock();playAll();});$('stop-all').addEventListener('click',stopAll);
 $('learn-speed').addEventListener('change',()=>{stopAll();state.settings.speed=Number($('learn-speed').value);Voice.setup(state.settings);persist();});
 $('try-shoot').addEventListener('click',()=>{selectMode('quiz');Voice.unlock();beginGame(listenPool);});
 for(const id of ['learn-home','game-home','finish-home','parent-home'])$(id).addEventListener('click',returnHome);
 $('brand').addEventListener('click',e=>{e.preventDefault();returnHome();});
 $('repeat').addEventListener('click',()=>{if(phase==='solved')showNext();if(phase==='saving')recoverSave();flow++;Voice.unlock();Voice.chant(current,phase==='question');});
 $('reveal').addEventListener('click',()=>{Voice.unlock();reveal();});$('next').addEventListener('click',nextQuestion);
 $('retry').addEventListener('click',()=>{flow++;Voice.stop();$('stadium').classList.remove('saving');$('save-banner').hidden=true;setText('feedback','ゆっくり えらんでね。');setText('reading',current.prompt+'…？');});$('hint').addEventListener('click',()=>{Voice.unlock();hint();});$('listen-help').addEventListener('click',()=>openListen([current]));
 $('again').addEventListener('click',()=>{Voice.unlock();beginGame(isReview?(duePool().length?duePool():roundPool):roundPool,isReview);});
 $('open-parent').addEventListener('click',()=>{go('parents');loadSettingsForm();});$('settings-form').addEventListener('submit',saveSettings);$('settings-form').addEventListener('input',scheduleSettingsSave);$('settings-form').addEventListener('change',()=>saveSettings());
 $('test-goal').addEventListener('click',async()=>{Voice.unlock();if(!(await saveSettings()))return;setText('settings-status','ゴール音声と歓声を再生しています…');const playback=Voice.goal();await Voice.crowd();const ok=await playback;if(ok)await Voice.praise();setText('settings-status',ok?'再生を終了しました。聞こえない場合はゴール音声のONと端末の音量を確認してください。':'再生できませんでした。画面下の音声メッセージを確認してください。');});
 $('test-bgm').addEventListener('click',async()=>{if(!(await saveSettings())||typeof BGM==='undefined')return;BGM.preview();setText('settings-status','BGMをためしています。音量を動かして聞き比べられます。');});
 $('stop-bgm').addEventListener('click',()=>{if(typeof BGM!=='undefined'){BGM.screen(screen);BGM.pause();}setText('settings-status','BGMをとめました。');});
 $('test-save').addEventListener('click',async()=>{Voice.unlock();if(!(await saveSettings()))return;setText('settings-status','GKセーブの音声を再生しています…');const ok=await Voice.save();setText('settings-status',ok?'再生を終了しました。':'再生できませんでした。ゲームの音声ONと音量を確認してください。');});
 $('test-voice').addEventListener('click',async()=>{Voice.unlock();Voice.setup({...state.settings,voiceOn:true,voiceURI:$('set-voice').value,speed:Number($('set-speed').value),studyVolume:.6});try{await Voice.play('voice-preview','ににんがし。いっしょに、いってみよう。');}finally{Voice.setup(state.settings);}});
 $('goal-voice-on').addEventListener('change',()=>{state.settings.goalSoundOn=$('goal-voice-on').checked;Voice.stop();Voice.setup(state.settings);persist();});
 $('voice-on').addEventListener('change',()=>{state.settings.voiceOn=$('voice-on').checked;Voice.stop();Voice.setup(state.settings);persist();});
 for(const person of ['shu','sota']){$('upload-'+person).addEventListener('change',e=>{importPhoto(person,e.target.files[0]);e.target.value='';});$('delete-'+person).addEventListener('click',()=>deletePhoto(person));}
 for(const q of QUESTIONS){const o=document.createElement('option');o.value=q.id;o.textContent=`${q.a}×${q.b}＝${q.value} ${q.full}`;$('audio-question').append(o);}
 for(const [event,label]of Object.entries(EVENT_LABELS)){const o=document.createElement('option');o.value=event;o.textContent=label;$('audio-event').append(o);}
 $('audio-question').value='2-2';$('audio-event').value='goal';refreshAudioSlots();
 for(const id of ['audio-kind','audio-question','audio-slot'])$(id).addEventListener('change',updateAudioTarget);$('audio-event').addEventListener('change',()=>{refreshAudioSlots();updateAudioTarget();});
 $('audio-upload').addEventListener('change',e=>{const file=e.target.files[0];if(file)importAudio(file,audioTarget());e.target.value='';});
 $('preview-audio').addEventListener('click',()=>{Voice.unlock();const t=audioTarget();if(t)Voice.play(t.key,t.text,t.kind);});$('delete-audio').addEventListener('click',async()=>{const t=audioTarget();if(t&&confirm('この録音を削除しますか？')){Voice.stop();const ok=await Store.remove('audio:'+t.key);await updateAudioTarget();if(!ok)setText('audio-file-status','削除の保存を確認できませんでした。');}});
 $('record').addEventListener('click',startRecording);$('stop-record').addEventListener('click',()=>{if(recording?.recorder.state==='recording')recording.recorder.stop();});
 $('clear-history').addEventListener('click',async()=>{if(confirm('学習記録をすべて消しますか？写真・録音・設定は残ります。')){const empty=freshState();state.history=empty.history;state.events=[];state.practice=empty.practice;await persist();renderHistory();updateHome();}});
 $('persist-storage').addEventListener('click',async()=>{try{const ok=await navigator.storage?.persist?.();setText('persist-status',ok?'保存のリクエストが許可されました。データ消去に備えて原本も残してください。':'ブラウザーが管理します。永続保存の許可は得られませんでした。');}catch{setText('persist-status','この環境ではリクエストできません。');}});
 $('bgm-start')?.addEventListener('click',()=>{if(typeof BGM!=='undefined')BGM.unlock();});
 $('set-bgm-volume').addEventListener('input',()=>{state.settings.bgmVolume=Number($('set-bgm-volume').value);if(typeof BGM!=='undefined')BGM.setup(state.settings);});
 document.addEventListener('pointerdown',()=>Voice.unlock(),{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&typeof BGM!=='undefined')BGM.unlock();if(document.hidden){if(typeof BGM!=='undefined')BGM.pause();flow++;continuous=false;Voice.stop();highlight(null);cancelRecording();if(phase==='solved')showNext();}});
 window.addEventListener('pagehide',()=>{Voice.stop();cancelRecording();});
 await refreshFace('shu');await refreshFace('sota');updateHome();if(typeof BGM!=='undefined')BGM.unlock();selectLevel(2);selectMode('listen');$('start').disabled=false;
 try{const local=await Voice.localVoice();if(!local)setText('voice-status','こえが でないときは、おうちの ひとと おんせいを とうろくしてね。');}
 catch{setText('voice-status','こえを つかえません。がめんで あそべるよ。');}
}
boot().catch(error=>{console.error('起動処理のエラー',error);setText('storage-warning','じゅんびが できませんでした。しゅうせいばんの ファイルを ぜんぶ ひらいてね。');$('storage-warning').hidden=false;});


