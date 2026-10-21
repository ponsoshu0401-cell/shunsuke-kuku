'use strict';
// 全個人データをこのDBだけに保存。画像・音声はBlobとして保持します。
const Store = (()=>{
 let db=null;const memory=new Map();let persistent=true;
 function warn(){persistent=false;document.getElementById('storage-warning').hidden=false;}
 async function open(){
  try{db=await new Promise((resolve,reject)=>{const r=indexedDB.open('shunsuke-kuku-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('DB blocked'));});db.onversionchange=()=>{db.close();warn();};}
  catch{warn();}
 }
 async function get(key){
  if(memory.has(key))return memory.get(key);
  if(!db)return undefined;
  try{const value=await new Promise((resolve,reject)=>{const r=db.transaction('kv').objectStore('kv').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(value!==undefined)memory.set(key,value);return value;}
  catch{warn();return memory.get(key);}
 }
 async function put(key,value){
  memory.set(key,value);
  if(!db){warn();return false;}
  try{await new Promise((resolve,reject)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(value,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});return true;}
  catch{warn();return false;}
 }
 async function remove(key){
  memory.delete(key);
  if(!db){warn();return false;}
  try{await new Promise((resolve,reject)=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').delete(key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});return true;}catch{warn();return false;}
 }
 async function keys(){if(!db)return [...memory.keys()];try{return await new Promise((resolve,reject)=>{const r=db.transaction('kv').objectStore('kv').getAllKeys();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}catch{warn();return [...memory.keys()];}}
 return {open,get,put,remove,keys,get persistent(){return persistent;}};
})();
