
import {palette,nodeSize,descendants,visibleNodes,arrange,newGraph,validateGraph,placeNewNode,placePeerTopic,canRemoveNodes,connectionPath} from "./model.mjs";
import {installSelectionTools} from "./selection-tools.mjs";
import {installBasicTools} from "./basic-tools.mjs";
const assetUrl=id=>"/api/assets/"+id;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],clone=v=>structuredClone(v),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const paths={plus:'M12 5v14M5 12h14',minus:'M5 12h14',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',lock:'M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4',shield:'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3zM8 12l3 3 5-6',map:'M5 4h14v16H5zM8 8h8M8 12h5M8 16h8',panel:'M3 4h18v16H3zM9 4v16',undo:'M3 8h10a7 7 0 0 1 7 7v4M3 8l5-5M3 8l5 5',redo:'M21 8H11a7 7 0 0 0-7 7v4M21 8l-5-5M21 8l-5 5',history:'M3 11a9 9 0 1 1 2 7M3 5v6h6M12 7v6l4 2',download:'M12 3v12M7 10l5 5 5-5M4 17v4h16v-4',upload:'M12 16V4M7 9l5-5 5 5M4 17v4h16v-4',chevron:'M7 10l5 5 5-5',help:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17h.01',fit:'M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5',branch:'M5 3v10a4 4 0 0 0 4 4h11M5 8h15M16 4l4 4-4 4M16 13l4 4-4 4',image:'M3 3h18v18H3zM3 17l6-6 6 6 3-3 3 3M15 7h.01',layout:'M9 3h6v5H9zM3 16h6v5H3zM15 16h6v5h-6zM12 8v4M6 16v-4h12v4',close:'M6 6l12 12M18 6 6 18',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',fold:'M4 7l4 5-4 5M20 7l-4 5 4 5M8 12h8',arrow:'M4 12h16M14 6l6 6-6 6',archive:'M3 4h18v5H3zM5 9v12h14V9M9 13h6',note:'M4 3h16v18H4zM8 8h8M8 12h8M8 16h5'};
Object.assign(paths,{pointer:"M5 3l14 10-7 1-4 7-3-18",type:"M4 5h16M12 5v15M8 20h8",rectangle:"M3 5h18v14H3z",sticky:"M4 3h16v12l-6 6H4zM14 21v-6h6",connector:"M3 20 20 3M11 3h9v9"});
const icon=n=>'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(paths[n]||paths.map)+'"/></svg>';
function icons(root=document){root.querySelectorAll("[data-icon]").forEach(e=>e.innerHTML=icon(e.dataset.icon));}icons();
const S={user:null,maps:[],doc:null,selected:null,multi:[],gen:0,saved:0,undo:[],redo:[],blocked:false,editing:null,space:false};
let saveTimer,savePromise=null,toastTimer,lastGroup="",lastGroupAt=0,gesture=null,childGesture=null,suppressHandleClick=null,selection=null;
const dirty=()=>S.gen!==S.saved;
function toast(t){clearTimeout(toastTimer);$("#toast").textContent=t;$("#toast").classList.remove("hidden");toastTimer=setTimeout(()=>$("#toast").classList.add("hidden"),3600);}
function status(text,kind=""){if(S.user?.preview)text=text.replaceAll("云端","本地预览");const e=$("#save-state");e.className="save-state "+kind;$("#save-text").textContent=text;}
async function api(url,options={}){const o={credentials:"same-origin",...options,headers:{...options.headers},signal:AbortSignal.timeout(25000)};if(o.body&&!(o.body instanceof Blob)&&!(o.body instanceof ArrayBuffer)){o.headers["Content-Type"]="application/json";o.body=JSON.stringify(o.body);}const r=await fetch(url,o);let b;try{b=await r.json();}catch{throw new Error(r.status===401?"登录已失效，请重新登录":"云端暂时没有响应，请稍后重试");}if(!r.ok){const e=new Error(b.error||"请求失败");e.status=r.status;throw e;}return b;}
const draftKey=()=>S.doc&&S.user?"mindspace:draft:"+S.user.email+":"+S.doc.id:null;
function keepDraft(){try{const key=draftKey();if(key)localStorage.setItem(key,JSON.stringify({title:S.doc.title,data:S.doc.data,revision:S.doc.revision,at:Date.now()}));}catch{status("本机草稿空间不足，请及时保存","error");}}
function rememberLast(){try{localStorage.setItem("mindspace:last:"+S.user.email,S.doc.id);}catch{}}
function changed(){S.gen++;keepDraft();status(S.blocked?"存在版本差异，请点击处理":"等待保存…",S.blocked?"error":"pending");clearTimeout(saveTimer);if(!S.blocked)saveTimer=setTimeout(flush,900);updateUndo();}
function snapshot(){return {data:clone(S.doc.data),title:S.doc.title};}
function mutation(fn,{group="",redraw=true}={}){if(!S.doc)return;const now=Date.now();if(!group||lastGroup!==group||now-lastGroupAt>800){S.undo.push(snapshot());if(S.undo.length>60)S.undo.shift();}lastGroup=group;lastGroupAt=now;S.redo=[];fn();changed();if(redraw)render();else{renderWorld();renderList();}}
function updateUndo(){$("#undo").disabled=!S.undo.length;$("#redo").disabled=!S.redo.length;}
function time(t){return new Date(t).toLocaleString("zh-CN",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false});}
function metadata(){if(!S.doc)return;const m={id:S.doc.id,title:S.doc.title,revision:S.doc.revision,createdAt:S.doc.createdAt,updatedAt:S.doc.updatedAt,deletedAt:null};let idx=S.maps.findIndex(v=>v.id===m.id);if(idx<0)S.maps.unshift(m);else S.maps[idx]=m;}
function renderList(){const term=$("#map-search").value.trim().toLowerCase(),maps=S.maps.filter(m=>!m.deletedAt&&m.title.toLowerCase().includes(term));$("#map-count").textContent=S.maps.filter(m=>!m.deletedAt).length;$("#map-list").innerHTML=maps.map(m=>'<div class="map-row '+(S.doc?.id===m.id?"active":"")+'"><button class="map-open" data-map="'+m.id+'">'+icon("map")+'<span class="map-text"><strong>'+esc(m.title)+'</strong><small>'+time(m.updatedAt)+'</small></span></button><button class="map-menu" aria-label="导图操作" data-menu="'+m.id+'">⋯</button></div>').join("")||(term?'<div class="loading-empty">没有找到相关导图</div>':'<div class="loading-empty">想法，从这里开始。<br>点击上方新建导图。</div>');}
function view(){if(!S.doc)return;const v=S.doc.data.viewport;$("#world").style.transform="translate("+v.x+"px,"+v.y+"px) scale("+v.scale+")";$("#zoom-value").textContent=Math.round(v.scale*100)+"%";}
function renderWorld(){if(!S.doc){$("#nodes").innerHTML="";$("#edges").innerHTML="";basic.toolbar();return;}const nodes=visibleNodes(S.doc.data.nodes),map=new Map(S.doc.data.nodes.map(n=>[n.id,n]));$("#nodes").innerHTML=nodes.map(n=>{const sz=nodeSize(n),c=palette[n.color],children=S.doc.data.nodes.filter(v=>v.parentId===n.id).length;return '<div class="node '+(n.parentId===null&&!n.detached&&!n.free&&n.kind!=="rectangle"?"root ":"")+(S.multi.includes(n.id)?"selected ":"")+'side-'+n.side+'" data-node="'+n.id+'" tabindex="0" role="button" aria-label="'+esc(n.label)+'" style="width:'+sz.w+'px;height:'+sz.h+'px;transform:translate('+(n.x-sz.w/2)+'px,'+(n.y-sz.h/2)+'px);--node-line:'+c.line+';--node-bg:'+c.bg+'">'+(n.images.length?'<img class="node-image" src="'+assetUrl(n.images[0])+'" data-preview="'+n.images[0]+'" alt="节点图片" draggable="false">'+(n.images.length>1?'<span class="node-image-count">'+n.images.length+' 张</span>':''):'')+'<div class="label" spellcheck="false">'+esc(n.label||"未命名节点")+'</div>'+(n.notes?'<div class="notes-marker">'+icon("note")+' 有备注</div>':'')+(!n.free&&!n.locked?'<button class="collapse-node branch-handle '+(!children?'empty':'')+'" data-branch-handle="'+n.id+'" '+(children?'data-collapse="'+n.id+'"':'')+' draggable="false" title="拖出子节点；'+(children?(n.collapsed?'单击展开分支':'单击折叠分支'):'单击添加子节点')+'" aria-label="'+(children?(n.collapsed?'展开分支':'折叠分支'):'添加子节点')+'">'+(children?(n.collapsed?children:'−'):'+')+'</button>':'')+'</div>';}).join("");
$("#edges").innerHTML=nodes.filter(n=>n.parentId!==null).map(n=>{const p=map.get(n.parentId),ps=nodeSize(p),ns=nodeSize(n),sign=n.side==="left"?-1:1,x1=p.x+sign*ps.w/2,x2=n.x-sign*ns.w/2,mx=(x1+x2)/2;return '<path class="edge" data-edge="'+n.id+'" stroke="'+palette[n.color].line+'" d="M '+x1+' '+p.y+' C '+mx+' '+p.y+', '+mx+' '+n.y+', '+x2+' '+n.y+'"/>';}).join("");$("#node-count").textContent=S.doc.data.nodes.length+" 个节点"+(nodes.length<S.doc.data.nodes.length?" · "+nodes.length+" 个可见":"");view();basic.decorate();selection?.refresh();}
function selected(){return S.doc?.data.nodes.find(n=>n.id===S.selected);}
function select(id){const canvas=$("#canvas"),before=canvas.getBoundingClientRect();S.selected=id;S.multi=id?[id]:[];$$(".node").forEach(e=>e.classList.toggle("selected",e.dataset.node===id));renderInspector();basic.onSelect();if(S.doc){const after=canvas.getBoundingClientRect(),v=S.doc.data.viewport;v.x+=(before.left+before.width/2)-(after.left+after.width/2);v.y+=(before.top+before.height/2)-(after.top+after.height/2);view();}selection?.refresh();}
function renderInspector(){const n=selected();$("#inspector").classList.toggle("hidden",!n);if(!n){basic.toolbar();return;}$("#node-label").value=n.label;$("#node-notes").value=n.notes;$("#colors").innerHTML=Object.entries(palette).map(([key,v])=>'<button aria-label="'+({teal:"青绿",blue:"浅蓝",rose:"浅粉",amber:"暖黄",violet:"浅紫"}[key])+'" class="color-swatch '+(n.color===key?"active":"")+'" data-color="'+key+'" style="--swatch:'+v.line+'"></button>').join("");$("#node-images").innerHTML=n.images.length?n.images.map(id=>'<div class="attachment"><img src="'+assetUrl(id)+'" alt="节点附件" data-preview="'+id+'"><button data-remove-image="'+id+'" aria-label="移除图片">×</button></div>').join(""):'<div class="attachment-empty">放一张图片，让想法更具体<br>支持 PNG / JPG / WebP / GIF · 8MB</div>';$("#delete-node").disabled=!canRemoveNodes(S.doc.data.nodes,[n.id,...descendants(S.doc.data.nodes,n.id)]);$("#fold span:last-child").textContent=n.collapsed?"展开分支":"折叠分支";const exclude=descendants(S.doc.data.nodes,n.id);exclude.add(n.id);$("#parent-select").innerHTML=n.parentId===null&&n.kind!=="rectangle"&&!n.detached?'<option>独立主题</option>':(n.kind==="rectangle"||n.detached?'<option value="" '+(n.parentId===null?'selected':'')+'>独立主题</option>':'')+S.doc.data.nodes.filter(p=>!p.free&&!exclude.has(p.id)).map(p=>'<option value="'+p.id+'" '+(p.id===n.parentId?"selected":"")+'>'+esc(p.label.slice(0,30)||"未命名节点")+'</option>').join("");$("#parent-select").disabled=n.parentId===null&&n.kind!=="rectangle"&&!n.detached;basic.inspector();}
function render(){if(S.selected&&!S.multi.includes(S.selected))S.multi=[S.selected];metadata();$("#map-title").value=S.doc?.title??"思间";renderList();renderWorld();renderInspector();updateUndo();}
function setDocument(doc){selection?.reset();basic.mode("select");clearChildGesture();doc.data=validateGraph(doc.data);S.line=null;S.doc=doc;S.gen=0;S.saved=0;S.undo=[];S.redo=[];S.selected=null;S.blocked=false;S.editing=null;render();rememberLast();status("已保存到云端");}
async function refreshList(){S.maps=(await api("/api/maps")).maps;renderList();}
async function openMap(id,{force=false}={}){if(basic.busy){toast("图片正在保存，请稍候再切换");return;}finishEdit();if(!force&&!await flush())return;try{const doc=await api("/api/maps/"+id);setDocument(doc);checkDraft();if(innerWidth<760)$("#sidebar").classList.add("collapsed");}catch(e){toast(e.message);}}
function showDialog(title,body,actions=[]){$("#dialog-title").textContent=title;$("#dialog-body").innerHTML=body;$("#dialog-actions").innerHTML="";for(const a of actions){const b=document.createElement("button");b.className=a.primary?"primary":"outline";b.textContent=a.label;b.addEventListener("click",async()=>{b.disabled=true;try{if(a.close!==false)$("#dialog").close();await a.run?.();}catch(e){toast(e.message);}finally{b.disabled=false;}});$("#dialog-actions").append(b);}if(!$("#dialog").open)$("#dialog").showModal();}
function checkDraft(){let d;try{d=JSON.parse(localStorage.getItem(draftKey())||"null");}catch{}if(!d)return;showDialog("发现一份未保存的草稿",'<p>之前的编辑尚未同步到云端。可以将草稿恢复为一张独立导图，保留两份内容。</p><p>草稿时间：'+esc(time(d.at))+'</p>',[{label:"使用云端版本",run:()=>{localStorage.removeItem(draftKey());}},{label:"恢复为新导图",primary:true,run:async()=>{const key=draftKey();const copy=await api("/api/maps",{method:"POST",body:{title:d.title+" · 恢复草稿",data:validateGraph(d.data)}});localStorage.removeItem(key);setDocument(copy);toast("草稿已恢复并保存到云端");}}]);}
function conflictDialog(){showDialog("另一台设备更新了这张导图",'<p>当前编辑还保留在这里。将它另存为副本，就能保留两份想法，再慢慢整理。</p>',[{label:"导出当前备份",close:false,run:exportBackup},{label:"另存为副本",primary:true,run:async()=>{const key=draftKey(),copy=await api("/api/maps",{method:"POST",body:{title:S.doc.title+" · 副本",data:S.doc.data}});localStorage.removeItem(key);setDocument(copy);await refreshList();toast("已将当前编辑保存为副本");}},{label:"查看云端版本",run:()=>showDialog("使用云端版本？","当前未同步的编辑会继续保留为本机草稿。建议先导出完整备份。",[{label:"返回",run:conflictDialog},{label:"读取云端",primary:true,run:()=>openMap(S.doc.id,{force:true})}])}]);}
async function flush(){clearTimeout(saveTimer);if(!S.doc)return true;if(S.blocked)return false;if(savePromise){await savePromise;return dirty()?flush():true;}if(!dirty())return true;const id=S.doc.id,generation=S.gen,payload={title:S.doc.title,data:clone(S.doc.data),revision:S.doc.revision};status("正在保存到云端…","pending");savePromise=(async()=>{try{const res=await api("/api/maps/"+id,{method:"PUT",body:payload});if(S.doc?.id===id){S.doc.revision=res.revision;S.doc.updatedAt=res.updatedAt;S.saved=generation;metadata();renderList();if(!dirty()){try{localStorage.removeItem(draftKey());}catch{}status("已保存到云端 · "+new Date(res.updatedAt).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit",hour12:false}));}else{keepDraft();status("等待保存…","pending");}}return true;}catch(e){status(e.status===409?"存在版本差异 · 点击处理":"尚未同步 · 点击重试","error");if(e.status===409){S.blocked=true;conflictDialog();}else if(e.status===401){toast("请重新登录；当前编辑已保留为本机草稿");}else toast(e.message);return false;}finally{savePromise=null;}})();const ok=await savePromise;if(ok&&dirty())return flush();return ok;}
async function createMap(welcome=false){if(basic.busy){toast("图片正在保存，请稍候再新建");return;}finishEdit();if(!await flush())return;try{const d=await api("/api/maps",{method:"POST",body:{title:welcome?"我的第一张导图":"未命名导图",data:newGraph(welcome)}});setDocument(d);if(welcome){$("#welcome").classList.remove("hidden");}else{select(d.data.nodes[0].id);startEdit(d.data.nodes[0].id);}toast("新导图已保存到云端");}catch(e){toast(e.message);}}
function fit(save=true){basic.fitAll(save);}
function zoom(factor,cx,cy){if(!S.doc)return;const r=$("#canvas").getBoundingClientRect(),v=S.doc.data.viewport,x=(cx??(r.left+r.width/2))-r.left-r.width/2,y=(cy??(r.top+r.height/2))-r.top-r.height/2,next=Math.max(.15,Math.min(2.5,v.scale*factor));v.x=x-(x-v.x)*next/v.scale;v.y=y-(y-v.y)*next/v.scale;v.scale=next;view();changed();}
function startEdit(id){const object=S.doc?.data.nodes.find(n=>n.id===id);if(!object||object.locked||object.kind==="image")return;finishEdit();select(id);const label=$('.node[data-node="'+id+'"] .label');if(!label)return;S.editing=id;label.contentEditable="true";label.title="Ctrl+回车换行 · 回车保存";label.textContent=selected().label;label.focus({preventScroll:true});const sel=getSelection(),range=document.createRange();range.selectNodeContents(label);sel.removeAllRanges();sel.addRange(range);label.addEventListener("blur",()=>finishEdit(),{once:true});}
function insertEditingNewline(target){
 const textarea=target.closest("textarea");
 if(textarea){if(textarea.readOnly||textarea.disabled)return;const start=textarea.selectionStart,end=textarea.selectionEnd;if(textarea.maxLength>=0&&textarea.value.length-(end-start)+1>textarea.maxLength)return;textarea.setRangeText("\n",start,end,"end");textarea.dispatchEvent(new Event("input",{bubbles:true}));return;}
 const label=S.editing?$('.node[data-node="'+S.editing+'"] .label'):null;if(!label||!label.isContentEditable)return;
 label.focus({preventScroll:true});
 if(typeof document.execCommand==="function"&&document.execCommand("insertLineBreak"))return;
 const selection=getSelection();if(!selection?.rangeCount)return;const range=selection.getRangeAt(0);if(!label.contains(range.commonAncestorContainer))return;
 range.deleteContents();const br=document.createElement("br");range.insertNode(br);const next=br.nextSibling;if(!next||next.nodeType===3&&!next.textContent&&!next.nextSibling)label.append(document.createElement("br"));range.setStartAfter(br);range.collapse(true);selection.removeAllRanges();selection.addRange(range);label.dispatchEvent(new Event("input",{bubbles:true}));
}
function finishEdit(){if(!S.editing)return;const id=S.editing,label=$('.node[data-node="'+id+'"] .label'),text=(label?.innerText??"").slice(0,2000);S.editing=null;if(label){label.contentEditable="false";label.removeAttribute("title");}const n=S.doc?.data.nodes.find(v=>v.id===id);if(n&&n.label!==text)mutation(()=>n.label=text||"未命名节点");}
function addNode(sibling=false,{sourceId=null,position=null}={}){
 finishEdit();if(!S.doc)return;const anchor=$("#canvas").getBoundingClientRect();
 const n=sourceId?S.doc.data.nodes.find(v=>v.id===sourceId):selected()||S.doc.data.nodes.find(v=>!v.free&&v.parentId===null);if(!n)return;
 if(n.free||n.locked){toast(n.locked?"对象已锁定，请先解锁":"请选择导图节点添加分支");return;}
 if(S.doc.data.nodes.length>=1000){toast("每张导图最多 1000 个节点");return;}
 const parentId=sibling?n.parentId:n.id,p=S.doc.data.nodes.find(v=>v.id===parentId),id=crypto.randomUUID(),peer=parentId===null,root=p?.parentId===null,branches=p?S.doc.data.nodes.filter(v=>v.parentId===p.id):[],docId=S.doc.id;
 const color=peer?n.color:root?(sibling?n.color:Object.keys(palette)[branches.length%5]):p.color,side=peer?n.side:position?(position.x>=p.x?"right":"left"):root?(sibling?n.side:branches.length%2?"left":"right"):p.side;
 mutation(()=>{if(p)p.collapsed=false;const node={id,parentId,label:peer?"同级主题":"新想法",x:0,y:0,color,side,collapsed:false,notes:"",images:[],edgeLabel:"",...(peer&&n.detached?{detached:true}:{}),...(sibling&&n.kind==="rectangle"?{kind:"rectangle",width:n.width,height:n.height,style:clone(n.style||{})}:{})};if(position){node.x=position.x;node.y=position.y;}else if(peer)placePeerTopic(S.doc.data,node,n);else placeNewNode(S.doc.data,node);S.doc.data.nodes.push(node);S.selected=id;});
 const after=$("#canvas").getBoundingClientRect(),v=S.doc.data.viewport;v.x+=(anchor.left+anchor.width/2)-(after.left+after.width/2);v.y+=(anchor.top+anchor.height/2)-(after.top+after.height/2);view();keepDraft();
 requestAnimationFrame(()=>{if(S.doc?.id===docId&&S.doc.data.nodes.some(n=>n.id===id))startEdit(id);});return id;
}
function removeNode(){finishEdit();const n=selected();if(!n||n.locked)return;const ids=descendants(S.doc.data.nodes,n.id);ids.add(n.id);if(!canRemoveNodes(S.doc.data.nodes,ids)){toast("请至少保留一个主题");return;}mutation(()=>{S.doc.data.nodes=S.doc.data.nodes.filter(v=>!ids.has(v.id));S.doc.data.links=(S.doc.data.links||[]).filter(l=>!ids.has(l.from)&&!ids.has(l.to));S.selected=n.parentId;});toast("节点已删除，可以撤销");}
function changeParent(id,parentId){const n=S.doc.data.nodes.find(v=>v.id===id),p=S.doc.data.nodes.find(v=>v.id===parentId);if(n&&(n.kind==="rectangle"||n.detached)&&!n.free&&!n.locked&&!parentId){n.parentId=null;return true;}if(!n||!p||n.free||p.free||n.locked||p.locked||n.parentId===null&&n.kind!=="rectangle"&&!n.detached||id===parentId||descendants(S.doc.data.nodes,id).has(parentId))return false;n.parentId=parentId;const ids=descendants(S.doc.data.nodes,id);ids.add(id);for(const child of S.doc.data.nodes.filter(v=>ids.has(v.id))){child.side=p.parentId===null?n.side:p.side;child.color=p.parentId===null?n.color:p.color;}p.collapsed=false;arrange(S.doc.data);return true;}
function undo(redo=false){finishEdit();const source=redo?S.redo:S.undo,target=redo?S.undo:S.redo;if(!source.length)return;target.push(snapshot());const s=source.pop();S.doc.title=s.title;S.doc.data=s.data;S.selected=null;S.multi=[];lastGroup="";changed();render();}

function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
async function uploadImage(file){finishEdit();const n=selected();if(!n){toast("请先选择一个节点");return;}if(n.images.length>=8){toast("每个节点最多放 8 张图片");return;}if(file.size>8*1024*1024){toast("单张图片不能超过 8MB");return;}if(!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)){toast("请选择 PNG、JPG、WebP 或 GIF 图片");return;}if(!await flush())return;const nid=n.id;status("正在上传图片…","pending");try{const r=await api("/api/maps/"+S.doc.id+"/assets",{method:"POST",headers:{"Content-Type":file.type},body:file});mutation(()=>{const target=S.doc.data.nodes.find(v=>v.id===nid);if(target)target.images.push(r.id);});await flush();toast("图片已上传");}catch(e){status("图片上传失败，请重试","error");toast(e.message);}}
function previewImage(id){showDialog("查看图片",'<img class="image-preview" src="'+assetUrl(id)+'" alt="节点图片">',[{label:"关闭"}]);}
async function assetData(id){const r=await fetch(assetUrl(id),{credentials:"same-origin"});if(!r.ok)throw new Error("图片读取失败，请稍后重试导出");const blob=await r.blob();return new Promise((resolve,reject)=>{const f=new FileReader();f.onload=()=>resolve(f.result);f.onerror=reject;f.readAsDataURL(blob);});}
async function exportBackup(){finishEdit();if(!S.doc)return;toast("正在打包导图和图片…");try{const images=Object.create(null),data=clone(S.doc.data),title=S.doc.title;for(const id of new Set(data.nodes.flatMap(n=>n.images)))images[id]=await assetData(id);const backup={format:"mindspace",version:1,title,data,images,exportedAt:new Date().toISOString()};download(new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}),title+".mindspace.json");toast("完整备份已导出，包含图片和可编辑内容");}catch(e){toast(e.message);}}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke();}
function wrapText(ctx,text,maxWidth){const lines=[];for(const line of text.split("\n")){let current="";for(const ch of [...line]){if(ctx.measureText(current+ch).width>maxWidth&&current){lines.push(current);current=ch;}else current+=ch;}lines.push(current);}return lines;}
async function exportPng(){return basic.exportPng();}
async function importBackup(file){finishEdit();if(!await flush())return;if(file.size>80*1024*1024){toast("备份文件请控制在 80MB 以内");return;}try{const b=JSON.parse(await file.text());if(b.format!=="mindspace"||b.version!==1)throw new Error("请选择思间导出的完整备份文件");const data=validateGraph(b.data),images=b.images||{},ids=new Set(data.nodes.flatMap(n=>n.images));for(const id of ids)if(typeof images[id]!=="string"||!/^data:image\/(png|jpeg|webp|gif);base64,/.test(images[id]))throw new Error("备份中缺少图片，或图片格式不正确");showDialog("导入这份备份？",'<p>将创建一张新导图，现有导图会继续保留。</p><p>'+esc(b.title||"未命名导图")+' · '+data.nodes.length+' 个节点 · '+ids.size+' 张图片</p>',[{label:"取消"},{label:"导入",primary:true,run:async()=>{toast("正在导入备份…");const clean=clone(data);clean.nodes.forEach(n=>n.images=[]);const d=await api("/api/maps",{method:"POST",body:{title:String(b.title||"导入的导图").slice(0,100),data:clean}});setDocument(d);try{const remap=Object.create(null);for(const id of ids){const blob=await(await fetch(images[id])).blob();const r=await api("/api/maps/"+d.id+"/assets",{method:"POST",body:blob,headers:{"Content-Type":blob.type}});remap[id]=r.id;}mutation(()=>{S.doc.data=data;for(const n of S.doc.data.nodes)n.images=n.images.map(id=>remap[id]);});if(await flush())toast("备份已导入并保存到云端");}catch(e){toast("导入未完成："+e.message+"。请保留原备份后重试");}}}]);}catch(e){toast(e.message||"备份文件读取失败");}}
function renameMap(id){
 const map=S.maps.find(m=>m.id===id);if(!map)return;
 let form,input,error,saveButton;
 const showError=message=>{error.textContent=message;error.hidden=false;input.setAttribute("aria-invalid","true");input.focus();};
 showDialog("重命名导图",'<form id="rename-map-form"><label class="rename-label" for="rename-map-title">导图名称</label><input id="rename-map-title" class="rename-input" type="text" maxlength="100" autocomplete="off" aria-describedby="rename-map-hint rename-map-error"><p id="rename-map-hint" class="rename-hint">最多 100 个字符，按 Enter 保存。</p><p id="rename-map-error" class="rename-error" role="alert" hidden></p></form>',[
  {label:"取消"},
  {label:"保存名称",primary:true,close:false,run:async()=>{
   const title=input.value.trim();if(!title){showError("请输入导图名称，不能只填写空格。");return;}
   if(basic.busy){showError("图片正在保存，请稍候再重命名。");return;}
   const dialog=$("#dialog"),buttons=[...dialog.querySelectorAll("button")],preventCancel=e=>e.preventDefault();
   buttons.forEach(b=>b.disabled=true);input.disabled=true;error.hidden=true;dialog.addEventListener("cancel",preventCancel);
   try{
    finishEdit();if(!await flush()){if(form.isConnected)showError("当前编辑尚未保存，请重试后再改名。");return;}
    if(S.doc?.id===id){
     if(S.doc.title!==title)mutation(()=>{S.doc.title=title;});
     if(!await flush()){if(form.isConnected)showError("名称尚未保存，请检查保存状态后重试。");return;}
    }else{
     const original=await api("/api/maps/"+id);
     if(original.title!==title){const saved=await api("/api/maps/"+id,{method:"PUT",body:{title,data:original.data,revision:original.revision}});Object.assign(map,{title,revision:saved.revision,updatedAt:saved.updatedAt});renderList();}
    }
    if(form.isConnected)dialog.close();toast("导图已重命名");
   }catch(e){if(form.isConnected)showError(e.status===409?"这张导图刚刚有更新，请关闭后重新打开重命名。":e.message);}
   finally{dialog.removeEventListener("cancel",preventCancel);input.disabled=false;buttons.forEach(b=>b.disabled=false);if(form.isConnected&&dialog.open)input.focus();}
  }}
 ]);
 form=$("#rename-map-form");input=$("#rename-map-title");error=$("#rename-map-error");saveButton=$("#dialog-actions .primary");
 input.value=S.doc?.id===id?S.doc.title:map.title;input.focus();input.select();
 form.onsubmit=e=>{e.preventDefault();saveButton.click();};
 input.onkeydown=e=>{if(e.key==="Enter"&&!e.isComposing&&e.keyCode!==229){e.preventDefault();saveButton.click();}};
 input.oninput=()=>{error.hidden=true;input.removeAttribute("aria-invalid");};
}

async function mapActions(id){const m=S.maps.find(v=>v.id===id);if(!m)return;showDialog("导图操作",'<p>'+esc(m.title)+'</p>',[{label:"重命名",run:()=>renameMap(id)},{label:"复制",run:async()=>{if(!await flush())return;const original=await api("/api/maps/"+id),d=await api("/api/maps",{method:"POST",body:{title:original.title+" · 副本",data:original.data}});setDocument(d);toast("已复制到云端");}},{label:"移到最近删除",run:()=>showDialog("移到最近删除？","这张导图和图片都可以从“最近删除”中恢复。",[{label:"取消"},{label:"移入",primary:true,run:async()=>{if(!await flush())return;const fresh=await api("/api/maps/"+id);await api("/api/maps/"+id,{method:"DELETE",body:{revision:fresh.revision}});if(S.doc?.id===id){S.doc=null;S.gen=0;S.saved=0;S.selected=null;}await refreshList();const next=S.maps.find(v=>!v.deletedAt);if(next)await openMap(next.id);else render();toast("已移到最近删除");}}])}]);}
async function trashDialog(){try{await refreshList();const maps=S.maps.filter(m=>m.deletedAt);showDialog("最近删除",maps.length?maps.map(m=>'<div class="dialog-list-row"><div><strong>'+esc(m.title)+'</strong><small>'+time(m.deletedAt)+'</small></div><button data-restore="'+m.id+'">恢复导图</button></div>').join(""):'<p>这里还没有删除的导图。</p>',[{label:"关闭"}]);}catch(e){toast(e.message);}}
async function historyDialog(){finishEdit();if(!S.doc||!await flush())return;try{const h=await api("/api/maps/"+S.doc.id+"/history");showDialog("历史版本",'<p>保留最近 20 次保存前的版本，恢复后仍可继续编辑。</p>'+(h.versions.length?h.versions.map(v=>'<div class="dialog-list-row"><div><strong>'+esc(v.title)+'</strong><small>'+time(v.created_at)+' · 版本 '+v.revision+'</small></div><button data-version="'+v.revision+'">恢复</button></div>').join(""):'<p>开始编辑后，历史版本会出现在这里。</p>'),[{label:"关闭"}]);}catch(e){toast(e.message);}}
function help(){showDialog("给想法，一点生长的空间",'<p>双击节点或独立文字编辑。左侧可添加文字、图片、矩形节点、便签和连线。矩形节点可以添加子节点、同级主题和关系虚线，拖动右下角可调整大小。拖动节点边缘的圆点可拉出子节点，松手后直接输入名称；单击圆点可折叠或展开分支。选中主题后点底部“关系”，再点另一个主题可添加关系虚线；也可选择左侧连线工具中的“关系虚线”后从节点拖出。选中两个节点可一键添加关系虚线。双击连线可以添加或修改关系文字。鼠标移到连线上或选中连线时，会显示剪刀；点击剪刀可剪断连接，两端节点和子分支原位保留。顶部“剪断”按钮或右键也可操作，剪断后可撤销。普通分支线和关系线都可设置线型、虚实、粗细、颜色与箭头；点击“复制样式”，再选另一条线“粘贴样式”，即可使用相同外观。新增节点会保留当前画面位置，点击“整理”才会重新排列。左键拖动画布空白处可框选，Shift+单击可多选；选中后点击“编组”或按 Ctrl+G，Ctrl+Shift+G 取消编组。可一键选择全部同级主题。框选后可按 Ctrl+C / Ctrl+V 复制粘贴节点及其内部连线，也可使用多选栏中的“靠左对齐”“居中对齐”“靠右对齐”。右键打开常用菜单，左键点击菜单外即可关闭。图片也可直接拖入或粘贴；选中后拖动右下角调整大小。选中文字后，顶部可设置字体、字号、加粗、颜色和对齐。</p><div class="help-row"><span>编辑文字时换行</span><kbd>Ctrl Enter</kbd></div><div class="help-row"><span>结束文字编辑</span><kbd>Enter</kbd></div><div class="help-row"><span>添加子节点</span><kbd>Tab</kbd></div><div class="help-row"><span>添加同级节点</span><kbd>Enter</kbd></div><div class="help-row"><span>撤销 / 重做</span><kbd>Ctrl Z / Ctrl Shift Z</kbd></div><div class="help-row"><span>复制 / 粘贴选中节点</span><kbd>Ctrl C / Ctrl V</kbd></div><div class="help-row"><span>删除选中节点</span><kbd>Delete</kbd></div><div class="help-row"><span>平移画布</span><kbd>空格 + 拖动</kbd></div><div class="help-row"><span>缩放画布</span><kbd>鼠标滚轮</kbd></div><div class="help-row"><span>保存 / 新建导图</span><kbd>Ctrl S / Alt N</kbd></div><p>文字、图片和视图自动保存在云端。换一台电脑，登录同一个账号就能继续。离线时，文字编辑会暂存为本机草稿，联网后请确认显示“已保存到云端”。</p>',[{label:"知道了",primary:true}]);}
$("#new-map").onclick=()=>createMap();
$("#map-search").oninput=renderList;
$("#map-list").onclick=e=>{const m=e.target.closest("[data-menu]");if(m){mapActions(m.dataset.menu);return;}const b=e.target.closest("[data-map]");if(b)openMap(b.dataset.map);};
$("#map-title").oninput=e=>{if(S.doc)mutation(()=>S.doc.title=e.target.value||"未命名导图",{group:"title",redraw:false});};
$("#map-title").onblur=()=>{if(S.doc)$("#map-title").value=S.doc.title;};
$("#save-state").onclick=()=>S.blocked?conflictDialog():flush();
$("#undo").onclick=()=>undo();$("#redo").onclick=()=>undo(true);
$("#history").onclick=historyDialog;$("#trash").onclick=trashDialog;$("#help").onclick=help;
$("#toggle-sidebar").onclick=()=>$("#sidebar").classList.toggle("collapsed");
$("#add-child").onclick=()=>addNode();$("#add-sibling").onclick=()=>addNode(true);
$("#arrange").onclick=()=>{if(S.doc){mutation(()=>arrange(S.doc.data));fit(false);toast("已整理节点");}};
$("#zoom-out").onclick=()=>zoom(1/1.15);$("#zoom-in").onclick=()=>zoom(1.15);
$("#zoom-value").onclick=()=>{if(S.doc)zoom(1/S.doc.data.viewport.scale);};
$("#fit").onclick=()=>fit();$("#close-inspector").onclick=()=>select(null);
$("#node-label").oninput=e=>{const n=selected();if(n)mutation(()=>n.label=e.target.value||"未命名节点",{group:"label-"+n.id,redraw:false});};
$("#node-notes").oninput=e=>{const n=selected();if(n)mutation(()=>n.notes=e.target.value,{group:"notes-"+n.id,redraw:false});};
$("#colors").onclick=e=>{const b=e.target.closest("[data-color]"),n=selected();if(!b||!n)return;mutation(()=>{const ids=descendants(S.doc.data.nodes,n.id);ids.add(n.id);for(const v of S.doc.data.nodes)if(ids.has(v.id))v.color=b.dataset.color;});};
$("#node-images").onclick=e=>{const b=e.target.closest("[data-remove-image]");if(b){mutation(()=>selected().images=selected().images.filter(id=>id!==b.dataset.removeImage));return;}const i=e.target.closest("[data-preview]");if(i)previewImage(i.dataset.preview);};
$("#parent-select").onchange=e=>{const n=selected();if(n)mutation(()=>changeParent(n.id,e.target.value));};
$("#delete-node").onclick=removeNode;$("#fold").onclick=()=>{const n=selected();if(n)mutation(()=>n.collapsed=!n.collapsed);};
function chooseImage(){if(!selected()){if(S.doc)select(S.doc.data.nodes.find(n=>n.parentId===null).id);else return;}$("#image-input").click();}
$("#add-image").onclick=chooseImage;$("#inspector-image").onclick=chooseImage;
$("#image-input").onchange=e=>{if(e.target.files[0])uploadImage(e.target.files[0]);e.target.value="";};
$("#export").onclick=()=>$("#export-menu").classList.toggle("hidden");
$("#export-png").onclick=()=>{$("#export-menu").classList.add("hidden");exportPng();};
$("#export-backup").onclick=()=>{$("#export-menu").classList.add("hidden");exportBackup();};
$("#import-backup").onclick=()=>{$("#export-menu").classList.add("hidden");$("#backup-input").click();};
$("#backup-input").onchange=e=>{if(e.target.files[0])importBackup(e.target.files[0]);e.target.value="";};
$("#dialog-close").onclick=()=>$("#dialog").close();
$("#dialog").onclick=async e=>{const restore=e.target.closest("[data-restore]"),ver=e.target.closest("[data-version]");if(restore){restore.disabled=true;try{if(!await flush())return;const doc=await api("/api/maps/"+restore.dataset.restore+"/restore",{method:"POST"});$("#dialog").close();setDocument(doc);await refreshList();toast("导图已恢复");}catch(error){toast(error.message);}finally{restore.disabled=false;}}if(ver){const revision=ver.dataset.version;showDialog("恢复这个版本？","恢复前的当前版本会继续保留在历史记录中。",[{label:"取消"},{label:"恢复版本",primary:true,run:async()=>{const old=await api("/api/maps/"+S.doc.id+"/history/"+revision);mutation(()=>{S.doc.title=old.title;S.doc.data=old.data;S.selected=null;});if(await flush())toast("历史版本已恢复");}}]);}};
$("#dismiss-welcome").onclick=()=>$("#welcome").classList.add("hidden");
document.addEventListener("click",e=>{if(!e.target.closest("#export-menu")&&!e.target.closest("#export"))$("#export-menu").classList.add("hidden");});
const canvas=$("#canvas");

function childWorldPoint(clientX,clientY){const r=canvas.getBoundingClientRect(),v=S.doc.data.viewport;return {x:Math.max(-100000,Math.min(100000,(clientX-r.left-r.width/2-v.x)/v.scale)),y:Math.max(-100000,Math.min(100000,(clientY-r.top-r.height/2-v.y)/v.scale))};}
function drawChildPreview(){
 $("#child-drag-preview")?.remove();const g=childGesture,n=S.doc?.data.nodes.find(n=>n.id===g?.sourceId);if(!g?.moved||!n)return;
 const p=g.point,sign=p.x>=n.x?1:-1,z=nodeSize(n),a={x:n.x+sign*z.w/2,y:n.y},b={x:p.x-sign*95,y:p.y};
 $("#edges").insertAdjacentHTML("beforeend",'<g id="child-drag-preview" class="child-drag-preview"><path d="'+connectionPath(a,b,'curve')+'"/><rect x="'+(p.x-95)+'" y="'+(p.y-29)+'" width="190" height="58" rx="10"/><text x="'+p.x+'" y="'+(p.y+5)+'" text-anchor="middle">新想法</text><text class="child-drag-instruction" x="'+p.x+'" y="'+(p.y+49)+'" text-anchor="middle">松手创建子节点 · Esc 取消</text></g>');
}
function clearChildGesture(suppress=false){
 const g=childGesture;childGesture=null;$("#child-drag-preview")?.remove();canvas.classList.remove("drawing-child");
 if(g){if(suppress)suppressHandleClick={id:g.sourceId,until:Date.now()+500};try{if(g.handle.hasPointerCapture(g.pointerId))g.handle.releasePointerCapture(g.pointerId);}catch{}}
 return g;
}
function stopChildEvent(e){e.preventDefault();e.stopImmediatePropagation();}
canvas.addEventListener("pointerdown",e=>{
 const button=e.target.closest("[data-branch-handle]");if(!button||e.button!==0||!S.doc)return;
 stopChildEvent(e);finishEdit();const source=S.doc.data.nodes.find(n=>n.id===button.dataset.branchHandle);if(!source||source.free||source.locked)return;
 basic.mode("select");const handle=$('.branch-handle[data-branch-handle="'+source.id+'"]');if(!handle)return;
 childGesture={sourceId:source.id,docId:S.doc.id,pointerId:e.pointerId,handle,startX:e.clientX,startY:e.clientY,point:childWorldPoint(e.clientX,e.clientY),moved:false};handle.setPointerCapture(e.pointerId);
},true);
canvas.addEventListener("pointermove",e=>{
 const g=childGesture;if(!g||e.pointerId!==g.pointerId)return;stopChildEvent(e);g.point=childWorldPoint(e.clientX,e.clientY);
 if(!g.moved&&Math.hypot(e.clientX-g.startX,e.clientY-g.startY)<7)return;g.moved=true;canvas.classList.add("drawing-child");drawChildPreview();
},true);
canvas.addEventListener("pointerup",e=>{
 const g=childGesture;if(!g||e.pointerId!==g.pointerId)return;stopChildEvent(e);
 if(!g.moved){clearChildGesture();return;}
 const r=canvas.getBoundingClientRect(),under=document.elementFromPoint(e.clientX,e.clientY),inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom,blocked=under?.closest(".node,button,input,textarea,select,.basic-tools,.format-toolbar,.welcome-card,.floating-tools,.zoom-controls,.line-options");
 const position=childWorldPoint(e.clientX,e.clientY);clearChildGesture(true);
 if(!inside||!under||!canvas.contains(under)||blocked||S.doc?.id!==g.docId)return;
 addNode(false,{sourceId:g.sourceId,position});
},true);
canvas.addEventListener("pointercancel",e=>{if(childGesture&&e.pointerId===childGesture.pointerId){stopChildEvent(e);clearChildGesture(true);}},true);
canvas.addEventListener("lostpointercapture",e=>{if(childGesture&&e.pointerId===childGesture.pointerId)clearChildGesture(true);},true);
canvas.addEventListener("click",e=>{const handle=e.target.closest("[data-branch-handle]");if(suppressHandleClick&&Date.now()<suppressHandleClick.until&&handle?.dataset.branchHandle===suppressHandleClick.id){stopChildEvent(e);suppressHandleClick=null;}},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&childGesture){stopChildEvent(e);clearChildGesture(true);}},true);

canvas.addEventListener("dblclick",e=>{const i=e.target.closest("[data-preview]");if(i){previewImage(i.dataset.preview);return;}const n=e.target.closest("[data-node]");if(n)startEdit(n.dataset.node);});
canvas.addEventListener("click",e=>{const b=e.target.closest("[data-branch-handle]");if(!b)return;const n=S.doc?.data.nodes.find(v=>v.id===b.dataset.branchHandle);if(!n||n.free||n.locked)return;if(b.hasAttribute("data-collapse"))mutation(()=>n.collapsed=!n.collapsed);else addNode(false,{sourceId:n.id});});
canvas.addEventListener("pointerdown",e=>{
 if(!S.doc||e.button!==0&&e.button!==1||e.target.closest("button,.welcome-card,[contenteditable=true]"))return;
 finishEdit();const node=e.target.closest("[data-node]"),isPan=!node||S.space||e.button===1;
 if(isPan){select(null);gesture={type:"pan",x:e.clientX,y:e.clientY,view:clone(S.doc.data.viewport),moved:false};canvas.classList.add("panning");}
 else{select(node.dataset.node);const ids=descendants(S.doc.data.nodes,node.dataset.node);ids.add(node.dataset.node);gesture={type:"node",x:e.clientX,y:e.clientY,id:node.dataset.node,ids,before:snapshot(),moved:false};}
 if(isPan)canvas.setPointerCapture(e.pointerId);if(e.button===1)e.preventDefault();
});
canvas.addEventListener("pointermove",e=>{if(!gesture)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(!gesture.moved&&Math.hypot(dx,dy)<4)return;gesture.moved=true;if(!canvas.hasPointerCapture(e.pointerId))canvas.setPointerCapture(e.pointerId);if(gesture.type==="pan"){S.doc.data.viewport.x=gesture.view.x+dx;S.doc.data.viewport.y=gesture.view.y+dy;view();}else{const scale=S.doc.data.viewport.scale;for(const n of S.doc.data.nodes){if(gesture.ids.has(n.id)){const orig=gesture.before.data.nodes.find(v=>v.id===n.id);n.x=orig.x+dx/scale;n.y=orig.y+dy/scale;}}renderWorld();const target=document.elementFromPoint(e.clientX,e.clientY)?.closest("[data-node]");$$(".drop-target").forEach(n=>n.classList.remove("drop-target"));if(target&&!gesture.ids.has(target.dataset.node))target.classList.add("drop-target");}});
function endGesture(e){if(!gesture)return;const g=gesture;gesture=null;canvas.classList.remove("panning");if(g.moved){if(g.type==="node"){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest("[data-node]");if(target&&!g.ids.has(target.dataset.node)&&changeParent(g.id,target.dataset.node))toast("已更改上级节点");S.undo.push(g.before);S.redo=[];render();}changed();}if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
canvas.addEventListener("pointerup",endGesture);canvas.addEventListener("pointercancel",endGesture);
canvas.addEventListener("wheel",e=>{if(e.target.closest(".welcome-card"))return;const label=e.target.closest(".node .label");if(label&&label.scrollHeight>label.clientHeight+1&&!e.ctrlKey&&!e.metaKey){e.stopPropagation();return;}e.preventDefault();if(S.doc)zoom(Math.exp(-e.deltaY*.0015),e.clientX,e.clientY);},{passive:false});
document.addEventListener("keydown",e=>{
 if(e.isComposing||e.keyCode===229)return;
 const input=e.target.closest("input,textarea,select,[contenteditable=true]"),mod=e.ctrlKey||e.metaKey;
 if(mod&&e.key.toLowerCase()==="s"){e.preventDefault();finishEdit();flush();return;}
 if(mod&&e.key==="Enter"){if(S.editing||e.target.closest("textarea")){e.preventDefault();insertEditingNewline(e.target);return;}if(!input){e.preventDefault();return;}}
 if(S.editing&&e.key==="Enter"&&!e.shiftKey){e.preventDefault();finishEdit();return;}
 if(S.editing&&e.key==="Escape"){const n=selected();const label=$('.node[data-node="'+n.id+'"] .label');label.textContent=n.label;finishEdit();return;}
 if(input)return;if($("#dialog").open)return;
 if(mod&&e.key.toLowerCase()==="z"){e.preventDefault();undo(e.shiftKey);return;}
 if(mod&&e.key.toLowerCase()==="y"){e.preventDefault();undo(true);return;}
 if(e.altKey&&e.key.toLowerCase()==="n"){e.preventDefault();createMap();return;}
 if(e.code==="Space"){e.preventDefault();S.space=true;canvas.style.cursor="grab";}
 if(e.key==="Tab"&&S.doc){e.preventDefault();addNode();}else if(e.key==="Enter"&&S.selected){e.preventDefault();addNode(true);}else if((e.key==="Delete"||e.key==="Backspace")&&S.selected){e.preventDefault();removeNode();}else if(e.key==="Escape"){select(null);$("#welcome").classList.add("hidden");}else if(e.key==="F2"&&S.selected){e.preventDefault();startEdit(S.selected);}
});
document.addEventListener("keyup",e=>{if(e.code==="Space"){S.space=false;canvas.style.cursor="";}});
window.addEventListener("blur",()=>{clearChildGesture(true);S.space=false;canvas.style.cursor="";});
window.addEventListener("beforeunload",e=>{finishEdit();if(dirty()){keepDraft();e.preventDefault();e.returnValue="";}});
document.addEventListener("visibilitychange",()=>{if(document.hidden){finishEdit();flush();}else checkRemote();});
window.addEventListener("online",()=>{if(dirty())flush();else checkRemote();});
window.addEventListener("offline",()=>status(dirty()?"当前离线 · 编辑保留为本机草稿":"当前离线 · 云端内容已载入","pending"));
async function checkRemote(){if(!S.doc||dirty()||savePromise||S.blocked||S.editing||gesture||childGesture||selection?.busy||document.hidden||document.activeElement?.matches("input,textarea"))return;try{const id=S.doc.id,doc=await api("/api/maps/"+id);if(S.doc.id===id&&!dirty()&&doc.revision>S.doc.revision){setDocument(doc);toast("已读取另一台设备保存的新内容");}}catch{}}
setInterval(checkRemote,30000);
async function boot(){if(innerWidth<760)$("#sidebar").classList.add("collapsed");const loading=document.createElement("div");loading.className="loading-mark";loading.textContent="正在打开你的思维空间";canvas.append(loading);try{S.user=await api("/api/me");$("#user-name").textContent=S.user.email;$("#avatar").textContent=(S.user.name||"我").slice(0,1).toUpperCase();await refreshList();if(!S.maps.length){await createMap(true);}else{let last;try{last=localStorage.getItem("mindspace:last:"+S.user.email);}catch{}const m=S.maps.find(v=>!v.deletedAt&&v.id===last)||S.maps.find(v=>!v.deletedAt);if(m)await openMap(m.id);else{status("已连接云端");render();}}}catch(e){status("连接失败 · 请刷新重试","error");showDialog("暂时无法打开思维空间",'<p>'+esc(e.message)+'</p><p>已有的本机草稿会继续保留，请联网后再试。</p>',[{label:"重新连接",primary:true,run:boot},{label:"重新登录",run:()=>{window.top.location.href="/signin-with-chatgpt?return_to=%2F";}}]);}finally{loading.remove();}}
const basic=installBasicTools({selection:()=>selection,S,$,$$,esc,icon,clone,mutation,changed,render,renderWorld,renderInspector,select,selected,startEdit,finishEdit,toast,api,flush,assetUrl,assetData,download,fit,zoom,undo,showDialog,removeNode,view,wrapText});
selection=installSelectionTools({S,$,$$,select,finishEdit,render,renderWorld,renderInspector,mutation,changed,snapshot,toast,basic});
boot();
