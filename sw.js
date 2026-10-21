'use strict';
// 更新時は v1 → v2 と変更。全ファイルを同じ版として保存します。
const PREFIX='shunsuke-shoot:'+self.registration.scope+':';
const CACHE=PREFIX+'v13';
const ASSETS=['./','./index.html','./style.css','./arcade.css','./arcade-stadium.svg','./data.js','./storage.js','./audio.js','./bgm.js','./bundled-chants.js','./bundled-audio.js','./app.js','./pwa.js','./manifest.webmanifest','./audio/praise.mp3','./audio/save.mp3','./audio/goal.mp3','./audio/crowd.wav','./icons/stadium.svg','./icons/shu.svg','./icons/sota.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
  if(req.mode==='navigate')return await cache.match('./index.html')||fetch(req);
  return await cache.match(req,{ignoreSearch:true})||fetch(req);
 }));
});

