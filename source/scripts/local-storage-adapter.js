const localImages=new Map();
const localDB=new Promise((resolve,reject)=>{const r=indexedDB.open("mindspace-standalone-v1",1);r.onupgradeneeded=()=>{const db=r.result;db.createObjectStore("maps",{keyPath:"id"});db.createObjectStore("revisions",{keyPath:["map_id","revision"]});db.createObjectStore("assets",{keyPath:"id"});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error("浏览器未允许本地存储，请换用普通浏览窗口"));});
const idbResult=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const txDone=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error("本地保存未完成"));});
function localError(text,status=400){const e=new Error(text);e.status=status;return e;}
async function localApi(url,options={}){
 const db=await localDB,p=url.split("?")[0].split("/").filter(Boolean).slice(1),method=options.method||"GET",body=options.body;
 if(p[0]==="me"){const tx=db.transaction("assets"),all=await idbResult(tx.objectStore("assets").getAll());for(const a of all)localImages.set(a.id,a.dataURL);return {name:"我",email:"本机浏览器",preview:true};}
 if(p[0]==="maps"&&p.length===1){
  if(method==="GET"){const tx=db.transaction("maps");const maps=await idbResult(tx.objectStore("maps").getAll());return {maps:maps.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))};}
  if(method==="POST"){const now=new Date().toISOString(),m={id:crypto.randomUUID(),title:body.title||"未命名导图",data:validateGraph(body.data),revision:1,createdAt:now,updatedAt:now,deletedAt:null};const tx=db.transaction("maps","readwrite");tx.objectStore("maps").put(m);await txDone(tx);return clone(m);}
 }
 if(p[0]==="maps"&&p[1]){
  const id=p[1];if(p[2]==="assets"&&method==="POST"){const file=body;const dataURL=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});const aid=crypto.randomUUID();const tx=db.transaction("assets","readwrite");tx.objectStore("assets").put({id:aid,mapId:id,dataURL});await txDone(tx);localImages.set(aid,dataURL);return {id:aid};}
  if(p[2]==="history"&&method==="GET"){const tx=db.transaction("revisions"),rows=(await idbResult(tx.objectStore("revisions").getAll())).filter(v=>v.map_id===id).sort((a,b)=>b.revision-a.revision);if(p[3]){const r=rows.find(v=>v.revision===Number(p[3]));if(!r)throw localError("找不到这个版本",404);return r;}return {versions:rows.slice(0,20)};}
  if(method==="GET"){const tx=db.transaction("maps"),m=await idbResult(tx.objectStore("maps").get(id));if(!m)throw localError("找不到这张导图",404);if(m.deletedAt)throw localError("导图已删除，请先恢复",410);return m;}
  const tx=db.transaction(["maps","revisions"],"readwrite"),store=tx.objectStore("maps"),m=await idbResult(store.get(id));if(!m)throw localError("找不到这张导图",404);
  if(p[2]==="restore"){m.deletedAt=null;m.revision++;m.updatedAt=new Date().toISOString();store.put(m);await txDone(tx);return clone(m);}
  if(body.revision!==m.revision)throw localError("另一个窗口更新了这张导图",409);
  if(method==="PUT"){const versions=tx.objectStore("revisions");versions.put({map_id:id,revision:m.revision,title:m.title,data:m.data,created_at:m.updatedAt});if(m.revision>20)versions.delete([id,m.revision-20]);m.title=body.title||"未命名导图";m.data=validateGraph(body.data);m.revision++;m.updatedAt=new Date().toISOString();store.put(m);await txDone(tx);return {revision:m.revision,updatedAt:m.updatedAt};}
  if(method==="DELETE"){m.deletedAt=new Date().toISOString();m.updatedAt=m.deletedAt;m.revision++;store.put(m);await txDone(tx);return {ok:true};}
 }
 throw localError("请求不存在",404);
}

