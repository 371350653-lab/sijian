
import {palette,fonts,textStyle,nodeSize,descendants,visibleNodes,connectionPoints,connectionPath,connectionCaption,canRemoveNodes,branchLineStyle,canCutConnection,cutConnection,createNodeFragment,prepareNodePaste,validateGraph} from "./model.mjs";
export function installBasicTools(A){
 const {S,$,$$,esc,icon,clone,mutation,changed,render,renderWorld,select,selected,startEdit,finishEdit,toast,api,flush,assetUrl,assetData,download,fit,zoom,undo,showDialog}=A;
 const canvas=$("#canvas"),C={mode:"select",lineType:"straight",arrow:true,context:null,clipboard:null,pasteText:"",pasteSerial:0,pasteContext:null,draw:null,resize:null,endpoint:null,picker:null,busy:false,lastConnectionClick:null,relationFrom:null,lineStyleClipboard:null};
 const root=()=>S.doc?.data.nodes.find(n=>!n.free&&n.parentId===null),line=()=>S.doc?.data.links?.find(l=>l.id===S.line);
 const world=(x,y)=>{const r=canvas.getBoundingClientRect(),v=S.doc.data.viewport;return {x:(x-r.left-r.width/2-v.x)/v.scale,y:(y-r.top-r.height/2-v.y)/v.scale};};
 const center=()=>{const r=canvas.getBoundingClientRect();return world(r.left+r.width/2,r.top+r.height/2);};
 function mode(m){C.mode=m;if(m!=="relation"){C.relationFrom=null;C.draw=null;}$("#line-options").classList.add("hidden");$$("[data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===m));$("#line-tool").classList.toggle("active",m==="line"||m==="relation");$("#add-relation").classList.toggle("active",m==="relation");for(const el of $$(".node"))el.classList.toggle("relation-source",m==="relation"&&el.dataset.node===C.relationFrom);canvas.classList.toggle("tool-crosshair",m!=="select");const hints={text:"点击画布放置文字",rectangle:"点击画布放置矩形节点，可继续添加子节点和关系",note:"点击画布放置便签",line:"从一个位置拖到另一个位置，可吸附到对象 · Esc 退出",relation:C.relationFrom?"点击另一个主题连接关系虚线 · 也可从节点拖出 · Esc 取消":"依次点击两个主题，或从一个主题拖到另一个主题 · Esc 取消"};$("#tool-hint").textContent=hints[m]||"";$("#tool-hint").classList.toggle("hidden",!hints[m]);}
 function object(kind,p=center(),extra={}){if(!S.doc)return null;const id=crypto.randomUUID();mutation(()=>{S.doc.data.nodes.push({id,parentId:null,free:kind!=="rectangle",kind,label:kind==="text"?"输入文字":kind==="note"?"记下一点想法":kind==="rectangle"?"新节点":"",x:p.x,y:p.y,width:kind==="text"?260:kind==="note"?220:260,height:kind==="text"?46:kind==="note"?160:120,color:kind==="note"?"amber":"teal",side:"right",collapsed:false,notes:"",images:[],style:{fontSize:kind==="text"?24:16,bold:false},...extra});S.selected=id;S.line=null;});mode("select");return id;}
 function toolbar(){const n=selected(),l=line(),bar=$("#format-toolbar");bar.classList.toggle("hidden",!n&&!l||n?.kind==="image"&&!n.locked);if(!n&&!l)return;const locked=!!(n||l).locked,isText=!!n&&n.kind!=="image";bar.querySelector(".text-format").classList.toggle("hidden",!isText);bar.querySelector(".connector-format").classList.toggle("hidden",!l&&(!n||n.parentId===null));$("#locked-hint").classList.toggle("hidden",!locked);
  for(const e of bar.querySelectorAll("select,input,button"))e.disabled=locked;
  if(n){const t=textStyle(n),s=n.style||{};if(document.activeElement!==$("#font-family"))$("#font-family").value=s.fontFamily||"sans";if(document.activeElement!==$("#font-size"))$("#font-size").value=t.size;$("#font-bold").setAttribute("aria-pressed",String(t.bold));$("#text-align").value=t.align;$("#text-color").value=t.color;bar.style.setProperty("--text-color",t.color);}
  const config=readLineStyle()||{};$("#line-dash").classList.remove("hidden");$("#line-dash").value=config.dashed?"dashed":"solid";$("#line-type").value=config.type||"curve";$("#line-width").value=String(config.width||2);$("#line-arrow").setAttribute("aria-pressed",String(!!config.arrow));$("#line-color").classList.remove("hidden");$("#line-color").value=config.color||"#718b7d";$("#copy-line-style").disabled=!readLineStyle();$("#paste-line-style").disabled=locked||!C.lineStyleClipboard;const target=connectionTarget();$("#cut-line").disabled=!target||!canCutConnection(S.doc.data,target.kind,target.id);

 }
 function onSelect(){S.line=null;decorate();}
 function selectLine(id){select(null);S.line=id;drawLinks();toolbar();}
 function inspector(){const n=selected();toolbar();if(!n)return;const panel=$("#inspector");panel.classList.toggle("is-free",!!n.free);panel.classList.toggle("is-image",n.kind==="image");panel.querySelector(".inspector-header strong").textContent=n.free?({text:"文字详情",image:"图片详情",rectangle:"矩形详情",note:"便签详情"}[n.kind]):n.kind==="rectangle"?"矩形节点详情":"节点详情";$("#parent-select").previousElementSibling.style.display=n.free?"none":"";$("#parent-select").disabled=n.free||n.parentId===null&&n.kind!=="rectangle"&&!n.detached||n.locked;$("#delete-node").disabled=!canRemoveNodes(S.doc.data.nodes,[n.id,...descendants(S.doc.data.nodes,n.id)])||n.locked;for(const e of panel.querySelectorAll("textarea,#colors button,#inspector-image,#fold"))e.disabled=!!n.locked;}
 function decorate(){if(!S.doc){toolbar();return;}for(const handle of $$(".resize-handle,.object-lock"))handle.remove();for(const n of S.doc.data.nodes){const el=$('.node[data-node="'+n.id+'"]');if(!el)continue;el.classList.toggle("root",n.parentId===null&&!n.detached&&!n.free&&n.kind!=="rectangle");el.classList.toggle("rectangle-node",!n.free&&n.kind==="rectangle");el.classList.toggle("relation-source",C.mode==="relation"&&n.id===C.relationFrom);el.classList.toggle("free-object",!!n.free);if(n.free)el.classList.add("free-"+n.kind);el.classList.toggle("locked",!!n.locked);const label=el.querySelector(".label"),t=textStyle(n);Object.assign(label.style,{fontFamily:t.family,fontSize:t.size+"px",fontWeight:t.bold?"700":n.free||n.kind==="rectangle"?"400":"500",lineHeight:"1.5",textAlign:t.align,color:t.color});el.setAttribute("aria-label",n.kind==="image"?n.label||"图片":n.label||"未命名对象");if(n.locked)el.insertAdjacentHTML("beforeend",'<span class="object-lock">已锁定</span>');if((n.free||n.kind==="rectangle")&&S.selected===n.id&&!n.locked)el.insertAdjacentHTML("beforeend",'<span class="resize-handle" data-resize="'+n.id+'" role="button" aria-label="调整大小"></span>');}
 drawLinks();toolbar();
 $("#node-count").textContent=S.doc.data.nodes.filter(n=>!n.free).length+" 个节点"+(S.doc.data.nodes.some(n=>n.free)?" · "+S.doc.data.nodes.filter(n=>n.free).length+" 个自由对象":"")+(S.doc.data.links?.length?" · "+S.doc.data.links.length+" 条连线":"");
 }
 function drawLinks(){
  const svg=$("#edges");svg.querySelectorAll(".custom-links,defs").forEach(e=>e.remove());if(!S.doc)return;
  const ns=visibleNodes(S.doc.data.nodes),byId=new Map(ns.map(n=>[n.id,n]));
  svg.insertAdjacentHTML("afterbegin",'<defs><marker id="basic-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 z" fill="context-stroke"/></marker></defs>');
  let html="";
  for(const n of ns.filter(n=>n.parentId!==null)){
   const p=byId.get(n.parentId),el=svg.querySelector('[data-edge="'+n.id+'"]');if(!p||!el)continue;
   const sign=n.side==="left"?-1:1,a={x:p.x+sign*nodeSize(p).w/2,y:p.y},b={x:n.x-sign*nodeSize(n).w/2,y:n.y},style=branchLineStyle(n),d=connectionPath(a,b,style.type);
   el.setAttribute("d",d);el.setAttribute("stroke",style.color);el.setAttribute("stroke-width",String(style.width));if(style.dashed)el.setAttribute("stroke-dasharray","7 5");else el.removeAttribute("stroke-dasharray");el.setAttribute("stroke-linecap","round");el.setAttribute("stroke-linejoin","round");if(style.arrow)el.setAttribute("marker-end","url(#basic-arrow)");else el.removeAttribute("marker-end");
   html+='<g class="connection-control '+(S.selected===n.id?'active':'')+'"><path class="link-hit tree-link-hit" d="'+d+'" data-tree-edge="'+n.id+'" role="button" tabindex="0" aria-label="编辑分支连线文字：'+esc(n.edgeLabel||n.label)+'"/>'+captionSvg(a,b,n.edgeLabel,'data-tree-edge="'+n.id+'"')+scissorsSvg(a,b,'tree',n.id,n.edgeLabel,n.label)+'</g>';
  }
  for(const l of S.doc.data.links||[]){
   if(l.from&&!byId.has(l.from)||l.to&&!byId.has(l.to))continue;
   const p=connectionPoints(l,ns),d=connectionPath(p.a,p.b,l.type),active=l.id===S.line;
   html+='<path class="free-link" stroke-linecap="round" stroke-linejoin="round" d="'+d+'" stroke="'+l.color+'" stroke-width="'+(active?l.width+1:l.width)+'" '+(l.dashed?'stroke-dasharray="7 5" stroke-linecap="round"':'')+' '+(l.arrow?'marker-end="url(#basic-arrow)"':'')+'/><g class="connection-control '+(active?'active':'')+'"><path class="link-hit" d="'+d+'" data-link="'+l.id+'" role="button" tabindex="0" aria-label="'+(l.dashed?"编辑关系虚线文字：":"编辑自由连线文字：")+esc(l.label||"未标注")+'"/>'+captionSvg(p.a,p.b,l.label,'data-link="'+l.id+'"')+scissorsSvg(p.a,p.b,'link',l.id,l.label,l.label||'未标注')+'</g>';
   if(active&&!l.locked)for(const [end,v] of [["from",p.a],["to",p.b]])html+='<circle class="link-endpoint" data-endpoint="'+end+'" data-link="'+l.id+'" cx="'+v.x+'" cy="'+v.y+'" r="5"/>';
  }
  if(C.draw)html+='<path class="free-link" d="'+connectionPath(C.draw.a,C.draw.b,C.draw.relation?"curve":C.lineType)+'" stroke="#87a07e" stroke-width="2" stroke-dasharray="5 4" '+(!C.draw.relation&&C.arrow?'marker-end="url(#basic-arrow)"':'')+'/>';
  svg.insertAdjacentHTML("beforeend",'<g class="custom-links">'+html+'</g>');
 }
 function scissorsSvg(a,b,kind,id,text,label){
  if(!canCutConnection(S.doc.data,kind,id))return "";
  const x=(a.x+b.x)/2,y=(a.y+b.y)/2-(text?28:0);
  return '<g class="connection-cut" data-cut-kind="'+kind+'" data-cut-id="'+id+'" transform="translate('+x+' '+y+')" role="button" tabindex="0" aria-label="剪断'+(kind==='tree'?'分支连线':'关系连线')+'：'+esc(label)+'"><title>剪断连线，保留两端节点 · 可撤销</title><circle class="cut-background" r="12"/><g class="cut-icon"><circle cx="-5" cy="-4" r="2.6"/><circle cx="-5" cy="4" r="2.6"/><path d="M -2.7 -2.7 L 6 6 M -2.7 2.7 L 6 -6"/></g></g>';
 }
 function cutAt(kind,id){
  finishEdit();if(!S.doc)return;if(!canCutConnection(S.doc.data,kind,id)){toast("连线或节点已锁定，请先解锁");return;}
  mode("select");mutation(()=>{cutConnection(S.doc.data,kind,id);S.line=null;S.selected=kind==="tree"?id:null;S.multi=S.selected?[S.selected]:[];});C.lastConnectionClick=null;
  toast(kind==="tree"?"已剪断分支线，节点及子分支原位保留 · 可撤销":"已剪断关系线，节点原位保留 · 可撤销");
 }
 function connectRelation(from,to){
  if(!S.doc||from===to){toast("请选择另一个主题");return false;}
  const a=S.doc.data.nodes.find(n=>n.id===from),b=S.doc.data.nodes.find(n=>n.id===to);if(!a||!b){toast("请先选择两个节点");return false;}
  const existing=(S.doc.data.links||[]).find(l=>l.dashed&&(l.from===from&&l.to===to||l.from===to&&l.to===from));if(existing){mode("select");selectLine(existing.id);toast("这两个节点已有关系虚线");return true;}
  if((S.doc.data.links?.length||0)>=1500){toast("每张导图最多 1500 条连线");return false;}
  const id=crypto.randomUUID();mutation(()=>{(S.doc.data.links??=[]).push({id,from,to,x1:a.x,y1:a.y,x2:b.x,y2:b.y,type:"curve",arrow:false,color:"#7b9589",width:2,dashed:true,locked:false,label:""});S.selected=null;S.line=id;});mode("select");drawLinks();toolbar();toast("关系虚线已添加，双击虚线可写关系名称");return true;
 }
 function startRelation(){finishEdit();if(!S.doc)return;const ids=(S.multi||[]).filter(id=>S.doc.data.nodes.some(n=>n.id===id));if(ids.length===2){connectRelation(ids[0],ids[1]);return;}C.relationFrom=selected()?.id||null;mode("relation");}
 function connectionTarget(){const l=line(),n=selected();return l?{kind:"link",id:l.id}:n&&!n.free&&n.parentId!==null?{kind:"tree",id:n.id}:null;}
 function connectionObject(kind,id){return kind==="link"?S.doc?.data.links.find(l=>l.id===id):S.doc?.data.nodes.find(n=>n.id===id&&n.parentId!==null);}
 function editConnection(kind,id){
  finishEdit();const obj=connectionObject(kind,id);if(!obj)return;if(obj.locked){toast("对象已锁定，请先解锁");return;}
  let field,form;const save=async value=>{const target=connectionObject(kind,id);if(!target||target.locked)return;const text=value.trim();if(text!==(kind==="link"?target.label||"":target.edgeLabel||""))mutation(()=>{if(kind==="link")target.label=text;else target.edgeLabel=text;});if(await flush())toast(text?"连线文字已保存":"已清除连线文字");};
  showDialog("编辑连线文字",'<form id="connection-label-form"><label class="rename-label" for="connection-label-input">连线文字</label><textarea id="connection-label-input" rows="2" maxlength="100" placeholder="例如：相关、依赖、属于、下一步" aria-describedby="connection-label-hint"></textarea><p id="connection-label-hint" class="rename-hint">最多 100 个字符。Enter 保存，Ctrl + Enter / Shift + Enter 换行；留空可清除。</p></form>',[{label:"取消"},{label:"保存文字",primary:true,run:()=>save(field.value)}]);
  field=$("#connection-label-input");form=$("#connection-label-form");field.value=kind==="link"?obj.label||"":obj.edgeLabel||"";field.focus({preventScroll:true});field.select();
  const submit=()=>$("#dialog-actions .primary").click();form.onsubmit=e=>{e.preventDefault();submit();};field.onkeydown=e=>{if(e.key==="Enter"&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();submit();}};
 }
 function connectionClick(e,kind,id){
  const previous=C.lastConnectionClick,now=Date.now();C.lastConnectionClick={kind,id,at:now,x:e.clientX,y:e.clientY};
  if(kind==="link")selectLine(id);else if(S.selected!==id||S.line)select(id);
  if(previous&&previous.kind===kind&&previous.id===id&&now-previous.at<480&&Math.hypot(e.clientX-previous.x,e.clientY-previous.y)<7){C.lastConnectionClick=null;editConnection(kind,id);}
 }
 function captionSvg(a,b,text,attributes){const c=connectionCaption(a,b,text);if(!c)return "";return '<g class="connection-caption" '+attributes+' transform="translate('+c.x+' '+c.y+')"><rect x="'+(-c.width/2)+'" y="'+(-c.height/2)+'" width="'+c.width+'" height="'+c.height+'" rx="4"/><text text-anchor="middle">'+c.lines.map((line,i)=>'<tspan x="0" y="'+(-(c.lines.length-1)*9+4+i*18)+'">'+esc(line)+'</tspan>').join("")+'</text></g>';}
 function captions(nodes,links){const byId=new Map(nodes.map(n=>[n.id,n])),all=[];for(const n of nodes.filter(n=>n.parentId!==null)){const p=byId.get(n.parentId);if(!p)continue;const sign=n.side==="left"?-1:1,c=connectionCaption({x:p.x+sign*nodeSize(p).w/2,y:p.y},{x:n.x-sign*nodeSize(n).w/2,y:n.y},n.edgeLabel);if(c)all.push(c);}for(const l of links||[]){if(l.from&&!byId.has(l.from)||l.to&&!byId.has(l.to))continue;const p=connectionPoints(l,nodes),c=connectionCaption(p.a,p.b,l.label);if(c)all.push(c);}return all;}

 function setText(patch){const n=selected();if(!n||n.locked)return;finishEdit();mutation(()=>n.style={...(n.style||{}),...patch},{group:"format-"+n.id,redraw:false});inspector();}
 function readLineStyle(){const l=line(),n=selected();return l?{type:l.type,dashed:!!l.dashed,color:l.color,width:l.width,arrow:!!l.arrow}:n&&!n.free&&n.parentId!==null?branchLineStyle(n):null;}
 function copyLineStyle(){const style=readLineStyle();if(!style)return;C.lineStyleClipboard=clone(style);toolbar();toast("已复制线条样式，选中另一条线后可粘贴");}
 function pasteLineStyle(){if(!C.lineStyleClipboard||!readLineStyle())return;setLine(clone(C.lineStyleClipboard));toast("已应用相同线条样式，文字和节点关系保留");}
 function setLine(patch){const l=line(),n=selected();if((l||n)?.locked)return;mutation(()=>{if(l)Object.assign(l,patch);else if(n){if(patch.type)n.lineType=patch.type;if("arrow" in patch)n.arrow=patch.arrow;if("dashed" in patch)n.lineDashed=patch.dashed;if("color" in patch)n.lineColor=patch.color;if("width" in patch)n.lineWidth=patch.width;}},{group:"line-"+(l?.id||n?.id)});}
 function chooseImage(p=center(),target=null){finishEdit();if(!S.doc)return;C.picker={p,target};$("#image-input").click();}
 async function upload(files,p=center(),target=null){if(C.busy)return;C.busy=true;const currentId=S.doc?.id;let added=0;try{finishEdit();if(!await flush())return;for(const [i,file] of [...files].filter(f=>f.type.startsWith("image/")).slice(0,8).entries()){if(!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)||file.size>8388608){toast("请选择不超过 8MB 的 PNG、JPG、WebP 或 GIF");continue;}const n=S.doc.data.nodes.find(n=>n.id===target);if(n?.locked){toast("对象已锁定，请先解锁");continue;}if(n&&n.images.length>=8){toast("每个对象最多放 8 张图片");break;}statusUpload("正在保存图片…");const r=await api("/api/maps/"+currentId+"/assets",{method:"POST",headers:{"Content-Type":file.type},body:file});if(S.doc?.id!==currentId){toast("画布已切换，请回到原导图重新插入图片");break;}if(n){mutation(()=>n.images.push(r.id));}else{let width=300,height=200;try{const bm=await createImageBitmap(file);const ratio=Math.min(360/bm.width,320/bm.height,1);width=Math.max(70,Math.round(bm.width*ratio));height=Math.max(30,Math.round(bm.height*ratio));bm.close();}catch{}object("image",{x:p.x+i*22,y:p.y+i*22},{width,height,images:[r.id],label:""});}if(!await flush())return;added++;}if(added)toast("图片已保存");}catch(e){$("#save-text").textContent="图片未保存 · 请重试";$("#save-state").classList.remove("pending");$("#save-state").classList.add("error");toast(e.message||"图片插入失败");}finally{C.busy=false;}}
 function statusUpload(t){$("#save-text").textContent=t;$("#save-state").classList.remove("error");$("#save-state").classList.add("pending");}
 const fragmentType="application/x-mindspace-fragment+json";
 const editingTarget=e=>e.target.closest("input,textarea,select,[contenteditable=true]")||$("#dialog").open;
 const copyIds=()=>S.multi?.length?S.multi:selected()?[selected().id]:[];
 const hasCopy=()=>!!S.doc&&(!!line()||copyIds().length>0);
 function copy(e){
  finishEdit();if(!S.doc)return false;const l=line(),ids=copyIds();
  if(l){C.clipboard={kind:"line",data:clone(l),mapId:S.doc.id};C.pasteText="连线";}
  else{const fragment=createNodeFragment(S.doc.data,ids);if(!fragment)return false;C.clipboard={...fragment,mapId:S.doc.id};C.pasteText=fragment.nodes.map(n=>n.label||"图片").join("\n");}
  C.pasteSerial=0;C.pasteContext=C.context?{...C.context}:null;
  if(e?.clipboardData){e.preventDefault();e.stopImmediatePropagation();e.clipboardData.setData("text/plain",C.pasteText);e.clipboardData.setData(fragmentType,JSON.stringify(C.clipboard));}
  else{try{navigator.clipboard?.writeText(C.pasteText).catch(()=>{});}catch{}}
  toast("已复制，可按 Ctrl+V 粘贴"+(C.clipboard.kind==="nodes"?"（"+C.clipboard.nodes.length+" 个节点）":""));return true;
 }
 function keyboardPastePoint(){return C.context&&(!C.pasteContext||C.context.x!==C.pasteContext.x||C.context.y!==C.pasteContext.y)?C.context:null;}
 async function pasteCopy(position=null){
  if(!S.doc||!C.clipboard)return false;finishEdit();const clip=C.clipboard,docId=S.doc.id;
  if(clip.kind==="line"){
   const l=clone(clip.data),points=connectionPoints(l,clip.mapId===docId?S.doc.data.nodes:[]),p=position||{x:(points.a.x+points.b.x)/2+35*(C.pasteSerial+1),y:(points.a.y+points.b.y)/2+35*(C.pasteSerial+1)},dx=p.x-(points.a.x+points.b.x)/2,dy=p.y-(points.a.y+points.b.y)/2;
   if((S.doc.data.links?.length||0)>=1500)throw new Error("每张导图最多 1500 条连线");
   l.id=crypto.randomUUID();l.from=null;l.to=null;l.x1=points.a.x+dx;l.y1=points.a.y+dy;l.x2=points.b.x+dx;l.y2=points.b.y+dy;l.locked=false;
   // Validate a native clipboard payload before adding it to the document.
   const valid=validateGraph({...S.doc.data,links:[...(S.doc.data.links||[]),l]}).links.at(-1);
   mutation(()=>{(S.doc.data.links??=[]).push(valid);S.selected=null;S.multi=[];S.line=valid.id;});C.pasteSerial++;return true;
  }
  const prepared=prepareNodePaste(S.doc.data,clip,position);
  if(!position&&C.pasteSerial){for(const n of prepared.nodes){n.x+=35*C.pasteSerial;n.y+=35*C.pasteSerial;}for(const l of prepared.links){l.x1+=35*C.pasteSerial;l.x2+=35*C.pasteSerial;l.y1+=35*C.pasteSerial;l.y2+=35*C.pasteSerial;}}
  const images=[...new Set(prepared.nodes.flatMap(n=>n.images||[]))];
  if(images.length&&clip.mapId!==docId){
   if(C.busy){toast("图片正在保存，请稍候再粘贴");return true;}C.busy=true;
   try{if(!await flush())return true;const replacements=new Map();for(const id of images){const blob=await(await fetch(await assetData(id))).blob();const result=await api("/api/maps/"+docId+"/assets",{method:"POST",headers:{"Content-Type":blob.type},body:blob});replacements.set(id,result.id);}if(S.doc?.id!==docId)return true;for(const n of prepared.nodes)n.images=n.images.map(id=>replacements.get(id));}finally{C.busy=false;}
  }
  if(S.doc?.id!==docId)return true;
  validateGraph({...S.doc.data,nodes:[...S.doc.data.nodes,...prepared.nodes],links:[...(S.doc.data.links||[]),...prepared.links]});
  mutation(()=>{S.doc.data.nodes.push(...prepared.nodes);(S.doc.data.links??=[]).push(...prepared.links);S.multi=prepared.nodes.map(n=>n.id);S.selected=S.multi.length===1?S.multi[0]:null;S.line=null;});C.pasteSerial++;mode("select");toast("已粘贴 "+prepared.nodes.length+" 个节点 · 可撤销");return true;
 }
 async function paste(p=null){
  try{if(navigator.clipboard?.read){const items=await navigator.clipboard.read();for(const item of items){const t=item.types.find(t=>t.startsWith("image/"));if(t){const blob=await item.getType(t);await upload([new File([blob],"粘贴图片",{type:t})],p||center());return;}}for(const item of items)if(item.types.includes("text/plain")){const t=await(await item.getType("text/plain")).text();if(t===C.pasteText&&await pasteCopy(p))return;if(t.trim()){object("text",p||center(),{label:t.slice(0,2000)});return;}}}else if(navigator.clipboard?.readText){const t=await navigator.clipboard.readText();if(t===C.pasteText&&await pasteCopy(p))return;if(t.trim()){object("text",p||center(),{label:t.slice(0,2000)});return;}}}catch{}
  if(!await pasteCopy(p))toast("请在画布上按 Ctrl+V 粘贴文字或图片");
 }
 function removeSelection(){if(copyIds().length>1)A.selection?.()?.removeMany();else remove();}
 async function duplicate(){if(copy())await pasteCopy();}
 function remove(){const n=selected(),l=line();if((n||l)?.locked){toast("对象已锁定，请先解锁");return;}if(l){mutation(()=>{S.doc.data.links=S.doc.data.links.filter(v=>v.id!==l.id);S.line=null;});}else A.removeNode();}
 function toggleLock(){const obj=line()||selected();if(obj)mutation(()=>obj.locked=!obj.locked);}
 function unlock(){mutation(()=>{S.doc.data.nodes.forEach(n=>n.locked=false);(S.doc.data.links||[]).forEach(l=>l.locked=false);});toast("已解锁全部对象");}
 function menu(e){if(!S.doc)return;e.preventDefault();e.stopPropagation();const id=e.target.closest("[data-node]")?.dataset.node||e.target.closest("[data-tree-edge]")?.dataset.treeEdge,lid=e.target.closest("[data-link]")?.dataset.link,p=world(e.clientX,e.clientY);finishEdit();canvas.focus({preventScroll:true});if(lid)selectLine(lid);else if(!((S.multi?.length||0)>1&&(!id||S.multi.includes(id))))select(id||null);const n=selected(),l=line(),obj=n||l,rows=[],add=(label,run,shortcut="",disabled=false,danger=false)=>rows.push({label,run,shortcut,disabled,danger}),sep=()=>rows.push(null);C.context=p;
  A.selection?.()?.contextRows(add,sep);
  if(!obj&&copyIds().length>1){add("复制选中节点",copy,"Ctrl+C");add("剪切选中节点",()=>{copy();removeSelection();},"Ctrl+X",!canRemoveNodes(S.doc.data.nodes,new Set(createNodeFragment(S.doc.data,copyIds()).nodes.map(n=>n.id)))||S.doc.data.nodes.some(n=>copyIds().includes(n.id)&&n.locked));add("创建副本",duplicate,"Ctrl+D");sep();}
  if(obj){if(n){add("添加关系虚线",startRelation);sep();}if(connectionTarget()){const target=connectionTarget();add("✂ 剪断连线（保留节点）",()=>cutAt(target.kind,target.id),"",!canCutConnection(S.doc.data,target.kind,target.id));add("编辑连线文字",()=>{const c=connectionTarget();if(c)editConnection(c.kind,c.id);},"双击连线",obj.locked);sep();}add("复制",copy,"Ctrl+C");add("剪切",()=>{copy();remove();},"Ctrl+X",obj.locked||!!n&&!canRemoveNodes(S.doc.data.nodes,[n.id,...descendants(S.doc.data.nodes,n.id)]));add("创建副本",duplicate,"Ctrl+D");sep();add(obj.locked?"解锁":"锁定",toggleLock);add("删除",remove,"Delete",obj.locked||!!n&&!canRemoveNodes(S.doc.data.nodes,[n.id,...descendants(S.doc.data.nodes,n.id)]),true);sep();}
  add("粘贴",()=>paste(p),"Ctrl+V");if(!obj&&copyIds().length===0){sep();add("添加文字",()=>{const id=object("text",p);if(id)startEdit(id);},"T");add("插入图片",()=>chooseImage(p));add("添加矩形节点",()=>{const id=object("rectangle",p);if(id)startEdit(id);},"R");add("添加便签",()=>object("note",p),"N");}sep();add("撤销",()=>undo(),"Ctrl+Z",!S.undo.length);add("重做",()=>undo(true),"Ctrl+Shift+Z",!S.redo.length);sep();add("适应全部内容",fit);add(canvas.classList.contains("no-grid")?"显示点阵背景":"隐藏点阵背景",toggleGrid);add("解锁全部",unlock);
  closeMenu();const el=document.createElement("div");el.id="canvas-context";el.className="context-menu";el.setAttribute("role","menu");el.innerHTML=rows.map((r,i)=>r?'<button role="menuitem" data-context="'+i+'" '+(r.disabled?"disabled":"")+' class="'+(r.danger?"danger":"")+'"><span>'+esc(r.label)+'</span><small>'+esc(r.shortcut)+'</small></button>':'<div class="menu-separator"></div>').join("");el.addEventListener("click",async ev=>{const b=ev.target.closest("[data-context]");if(!b)return;const row=rows[Number(b.dataset.context)];closeMenu();try{await row.run();}catch(error){toast(error.message);}});document.body.append(el);const r=el.getBoundingClientRect();el.style.left=Math.max(8,Math.min(innerWidth-r.width-8,e.clientX))+"px";el.style.top=Math.max(8,Math.min(innerHeight-r.height-8,e.clientY))+"px";
 }
 function closeMenu(){$("#canvas-context")?.remove();}
 function toggleGrid(){canvas.classList.toggle("no-grid");canvas.style.backgroundImage=canvas.classList.contains("no-grid")?"none":"";try{localStorage.setItem("mindspace:grid",canvas.classList.contains("no-grid")?"off":"on");}catch{}}

 function hit(e){return document.elementFromPoint(e.clientX,e.clientY)?.closest("[data-node]")?.dataset.node||null;}
 function stop(e){e.preventDefault();e.stopImmediatePropagation();}
 canvas.addEventListener("contextmenu",menu);
 document.addEventListener("pointerdown",e=>{if(!e.target.closest("#canvas-context"))closeMenu();if(!e.target.closest("#line-options,#line-tool"))$("#line-options").classList.add("hidden");},true);
 window.addEventListener("blur",closeMenu);
 canvas.addEventListener("pointerdown",e=>{
  if(!S.doc||e.button!==0||e.target.closest(".basic-tools,.format-toolbar,.line-options,.welcome-card,.floating-tools,.zoom-controls,.tool-hint"))return;
  const cut=e.target.closest("[data-cut-kind]");if(cut){stop(e);cutAt(cut.dataset.cutKind,cut.dataset.cutId);return;}
  C.context=world(e.clientX,e.clientY);
  const target=e.target.closest("[data-node]")?.dataset.node,id=target,node=S.doc.data.nodes.find(n=>n.id===id),linkEl=e.target.closest("[data-link]"),endpoint=e.target.closest("[data-endpoint]"),resize=e.target.closest("[data-resize]");
  if(e.target.closest("[contenteditable=true]"))return;
  if(resize){stop(e);finishEdit();const n=S.doc.data.nodes.find(n=>n.id===resize.dataset.resize);if(n.locked)return;C.resize={id:n.id,p:world(e.clientX,e.clientY),width:nodeSize(n).w,height:nodeSize(n).h};canvas.setPointerCapture(e.pointerId);return;}
  if(endpoint){stop(e);const l=S.doc.data.links.find(l=>l.id===endpoint.dataset.link);if(l.locked)return;C.endpoint={id:l.id,end:endpoint.dataset.endpoint,before:clone(l)};canvas.setPointerCapture(e.pointerId);return;}
  if(C.mode==="relation"&&!S.space){stop(e);finishEdit();if(!id){toast("请选择要连接的主题，Esc 可取消");return;}if(C.relationFrom&&C.relationFrom!==id){connectRelation(C.relationFrom,id);return;}C.relationFrom=id;mode("relation");const p=world(e.clientX,e.clientY);C.draw={a:p,b:p,from:id,relation:true};canvas.setPointerCapture(e.pointerId);drawLinks();return;}
  if(C.mode==="line"&&!S.space){stop(e);finishEdit();select(null);const p=world(e.clientX,e.clientY);C.draw={a:p,b:p,from:id||null};canvas.setPointerCapture(e.pointerId);drawLinks();return;}
  if(["text","rectangle","note"].includes(C.mode)&&!S.space){stop(e);finishEdit();const kind=C.mode,id=object(kind,world(e.clientX,e.clientY));if(["text","rectangle","note"].includes(kind))startEdit(id);return;}
  const treeEl=e.target.closest("[data-tree-edge]");if(linkEl||treeEl){stop(e);finishEdit();connectionClick(e,linkEl?"link":"tree",linkEl?linkEl.dataset.link:treeEl.dataset.treeEdge);return;}
  if(node?.locked){stop(e);finishEdit();select(node.id);}
 },true);
 canvas.addEventListener("pointermove",e=>{
  if(C.draw){stop(e);C.draw.b=world(e.clientX,e.clientY);drawLinks();}
  if(C.resize){stop(e);const r=C.resize,n=S.doc.data.nodes.find(n=>n.id===r.id),p=world(e.clientX,e.clientY),dw=2*(p.x-r.p.x),dh=2*(p.y-r.p.y);n.width=Math.max(70,Math.min(1600,r.width+dw));n.height=n.kind==="image"?Math.max(30,Math.min(1600,n.width*r.height/r.width)):Math.max(30,Math.min(1600,r.height+dh));renderWorld();}
  if(C.endpoint){stop(e);const p=world(e.clientX,e.clientY),l=line(),end=C.endpoint.end;l[end]=null;l[end==="from"?"x1":"x2"]=p.x;l[end==="from"?"y1":"y2"]=p.y;drawLinks();}
 },true);
 canvas.addEventListener("pointerup",e=>{
  if(C.draw){stop(e);const d=C.draw;C.draw=null;const to=hit(e),moved=Math.hypot(d.a.x-d.b.x,d.a.y-d.b.y)>12;if(d.relation){if(moved&&to&&to!==d.from)connectRelation(d.from,to);else if(moved)toast("请连接到另一个主题，或点击它完成连接");drawLinks();}else{if(moved){const id=crypto.randomUUID();mutation(()=>{(S.doc.data.links??=[]).push({id,from:d.from,to:to===d.from?null:to,x1:d.a.x,y1:d.a.y,x2:d.b.x,y2:d.b.y,type:C.lineType,arrow:C.arrow,color:"#718b7d",width:2,dashed:false,locked:false});S.selected=null;S.line=id;});}drawLinks();mode("select");}}

  if(C.resize){stop(e);const r=C.resize;C.resize=null;const n=S.doc.data.nodes.find(n=>n.id===r.id),w=n.width,h=n.height;n.width=r.width;n.height=r.height;mutation(()=>{n.width=w;n.height=h;});}
  if(C.endpoint){stop(e);const r=C.endpoint;C.endpoint=null;const l=S.doc.data.links.find(l=>l.id===r.id),to=hit(e);l[r.end]=to===l[r.end==="from"?"to":"from"]?null:to;const after=clone(l);Object.assign(l,r.before);mutation(()=>Object.assign(l,after));}
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
 },true);
 canvas.addEventListener("pointercancel",()=>{if(C.resize){const n=S.doc?.data.nodes.find(n=>n.id===C.resize.id);if(n){n.width=C.resize.width;n.height=C.resize.height;}}if(C.endpoint){const l=S.doc.data.links.find(l=>l.id===C.endpoint.id);Object.assign(l,C.endpoint.before);}C.draw=null;C.resize=null;C.endpoint=null;renderWorld();});
 canvas.addEventListener("dblclick",e=>{const n=S.doc?.data.nodes.find(n=>n.id===e.target.closest("[data-node]")?.dataset.node);if(n?.locked){stop(e);toast("对象已锁定，请先右键解锁");}},true);
 canvas.addEventListener("dragover",e=>{if(e.dataTransfer?.types.includes("Files")){e.preventDefault();canvas.classList.add("file-over");}});
 canvas.addEventListener("dragleave",e=>{if(!canvas.contains(e.relatedTarget))canvas.classList.remove("file-over");});
 canvas.addEventListener("drop",e=>{if(!e.dataTransfer?.files.length)return;e.preventDefault();canvas.classList.remove("file-over");if(S.doc)upload(e.dataTransfer.files,world(e.clientX,e.clientY));});
 document.addEventListener("copy",e=>{if(!editingTarget(e)&&hasCopy())copy(e);},true);
 document.addEventListener("cut",e=>{if(!editingTarget(e)&&hasCopy()&&copy(e))removeSelection();},true);
 document.addEventListener("paste",async e=>{
  if(editingTarget(e)||!S.doc)return;
  const files=[...(e.clipboardData?.files||[])].filter(f=>f.type.startsWith("image/")),p=keyboardPastePoint();
  if(files.length){e.preventDefault();upload(files,p||center());return;}
  const encoded=e.clipboardData?.getData(fragmentType),t=e.clipboardData?.getData("text/plain");
  try{
   if(encoded){e.preventDefault();if(encoded.length>6000000)throw new Error("复制内容过大，请减少选择范围");const clip=JSON.parse(encoded);if(!["nodes","line"].includes(clip.kind))throw new Error("复制内容不正确");if(JSON.stringify(clip)!==JSON.stringify(C.clipboard)){C.pasteSerial=0;C.clipboard=clip;C.pasteText=t||"";}await pasteCopy(p);return;}
   if(t?.trim()){e.preventDefault();if(t===C.pasteText&&await pasteCopy(p))return;object("text",p||center(),{label:t.slice(0,2000)});}
   else if(C.clipboard){e.preventDefault();await pasteCopy(p);}
  }catch(error){toast(error.message||"粘贴失败，请重新复制");}
 },true);
 document.addEventListener("keydown",e=>{
  if(e.isComposing||e.keyCode===229)return;
  const input=e.target.closest("input,textarea,select,[contenteditable=true]"),mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
  if(input||$("#dialog").open)return;
   const cut=e.target.closest("[data-cut-kind]");if(cut&&["Enter"," "].includes(e.key)){stop(e);cutAt(cut.dataset.cutKind,cut.dataset.cutId);return;}
   const connectionEl=e.target.closest("[data-tree-edge],[data-link]");if(connectionEl&&["Enter","F2"].includes(e.key)){stop(e);editConnection(connectionEl.dataset.link?"link":"tree",connectionEl.dataset.link||connectionEl.dataset.treeEdge);return;}
  if(e.key==="Escape"){closeMenu();mode("select");S.line=null;drawLinks();toolbar();}
  if(mod&&key==="d"&&hasCopy()){stop(e);duplicate().catch(error=>toast(error.message));return;}
  if(mod&&key==="b"&&selected()){stop(e);setText({bold:!textStyle(selected()).bold});return;}
  if((e.key==="Delete"||e.key==="Backspace")&&(line()||selected()?.free||selected()?.locked)){stop(e);remove();return;}
  if(e.key==="Tab"&&selected()?.free){stop(e);toast("自由对象不添加子节点；可使用连线连接");return;}
  if(e.key==="Enter"&&selected()?.free){stop(e);if(selected().kind!=="image"&&!selected().locked)startEdit(selected().id);return;}
  if(e.key==="F2"&&selected()?.locked){stop(e);return;}
  if(!mod&&!e.altKey){if(key==="v")mode("select");if(key==="t")mode("text");if(key==="r")mode("rectangle");if(key==="n")mode("note");if(key==="l")mode("line");}
 },true);
 for(const b of $$("[data-tool]"))b.onclick=()=>{finishEdit();mode(b.dataset.tool);};
 $("#line-tool").onclick=()=>$("#line-options").classList.toggle("hidden");
 $("#add-relation").onclick=startRelation;for(const b of $$("[data-relationship-mode]"))b.onclick=startRelation;
 for(const b of $$("[data-line-mode]"))b.onclick=()=>{C.lineType=b.dataset.lineMode;mode("line");};
 $("#canvas-image").onclick=()=>chooseImage();$("#add-image").onclick=()=>chooseImage();
 $("#inspector-image").onclick=()=>chooseImage(center(),selected()?.id);
 $("#image-input").onchange=e=>{const p=C.picker||{p:center(),target:null};C.picker=null;if(e.target.files.length)upload(e.target.files,p.p,p.target);e.target.value="";};
 $("#font-family").onchange=e=>setText({fontFamily:e.target.value});
 $("#font-size").oninput=e=>{const value=Number(e.target.value);if(value>=10&&value<=96)setText({fontSize:Math.round(value)});};
 $("#font-size").onchange=e=>setText({fontSize:Math.max(10,Math.min(96,Number(e.target.value)||16))});
 $("#font-bold").onclick=()=>{const n=selected();if(n)setText({bold:!textStyle(n).bold});};
 $("#text-align").onchange=e=>setText({align:e.target.value});$("#text-color").oninput=e=>setText({textColor:e.target.value});
 $("#cut-line").onclick=()=>{const target=connectionTarget();if(target)cutAt(target.kind,target.id);};
 $("#line-label").onclick=()=>{const c=connectionTarget();if(c)editConnection(c.kind,c.id);};
 $("#copy-line-style").onclick=copyLineStyle;$("#paste-line-style").onclick=pasteLineStyle;$("#line-width").onchange=e=>setLine({width:Number(e.target.value)});$("#line-dash").onchange=e=>setLine({dashed:e.target.value==="dashed"});$("#line-type").onchange=e=>setLine({type:e.target.value});$("#line-arrow").onclick=()=>{const obj=line()||selected();if(obj)setLine({arrow:!obj.arrow});};$("#line-color").oninput=e=>setLine({color:e.target.value});
 try{if(localStorage.getItem("mindspace:grid")==="off")toggleGrid();}catch{}
 async function exportPng(){
  finishEdit();if(!S.doc)return;toast("正在生成图片…");try{
   const data=clone(S.doc.data),nodes=visibleNodes(data.nodes),map=new Map(nodes.map(n=>[n.id,n])),links=(data.links||[]).filter(l=>(!l.from||map.has(l.from))&&(!l.to||map.has(l.to))),xs=[],ys=[];
   for(const n of nodes){const z=nodeSize(n);xs.push(n.x-z.w/2,n.x+z.w/2);ys.push(n.y-z.h/2,n.y+z.h/2);}for(const l of links){const p=connectionPoints(l,nodes);xs.push(p.a.x,p.b.x);ys.push(p.a.y,p.b.y);}const edgeCaptions=captions(nodes,links);for(const c of edgeCaptions){xs.push(c.x-c.width/2,c.x+c.width/2);ys.push(c.y-c.height/2,c.y+c.height/2);}const minX=Math.min(...xs)-55,minY=Math.min(...ys)-85,w=Math.max(...xs)-minX+55,h=Math.max(...ys)-minY+55,scale=Math.min(2,8192/Math.max(w,h)),out=document.createElement("canvas");out.width=Math.ceil(w*scale);out.height=Math.ceil(h*scale);const ctx=out.getContext("2d");ctx.scale(scale,scale);ctx.fillStyle="#f8f9f6";ctx.fillRect(0,0,w,h);ctx.translate(-minX,-minY);ctx.font="14px "+fonts.sans;ctx.fillStyle="#7e937f";ctx.fillText(S.doc.title,minX+30,minY+35);
   function edge(a,b,type,color,width,arrow,dashed=false){ctx.setLineDash(dashed?[7,5]:[]);ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.moveTo(a.x,a.y);const mx=(a.x+b.x)/2;if(type==="curve")ctx.bezierCurveTo(mx,a.y,mx,b.y,b.x,b.y);else if(type==="elbow"){ctx.lineTo(mx,a.y);ctx.lineTo(mx,b.y);ctx.lineTo(b.x,b.y);}else ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);if(arrow){const angle=type==="straight"||Math.abs(a.x-b.x)<.01?Math.atan2(b.y-a.y,b.x-a.x):Math.atan2(0,b.x-mx||1),r=9;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-r*Math.cos(angle-.4),b.y-r*Math.sin(angle-.4));ctx.lineTo(b.x-r*Math.cos(angle+.4),b.y-r*Math.sin(angle+.4));ctx.closePath();ctx.fillStyle=color;ctx.fill();}}
   for(const n of nodes.filter(n=>n.parentId!==null)){const p=map.get(n.parentId),s=n.side==="left"?-1:1,style=branchLineStyle(n);edge({x:p.x+s*nodeSize(p).w/2,y:p.y},{x:n.x-s*nodeSize(n).w/2,y:n.y},style.type,style.color,style.width,style.arrow,style.dashed);}for(const l of links){const p=connectionPoints(l,nodes);edge(p.a,p.b,l.type,l.color,l.width,l.arrow,l.dashed);}
       for(const c of edgeCaptions){ctx.save();ctx.fillStyle="#f8f9f6";ctx.beginPath();ctx.roundRect(c.x-c.width/2,c.y-c.height/2,c.width,c.height,4);ctx.fill();ctx.fillStyle="#506a59";ctx.font="12px "+fonts.sans;ctx.textAlign="center";c.lines.forEach((text,i)=>ctx.fillText(text,c.x,c.y-(c.lines.length-1)*9+4+i*18));ctx.restore();}
for(const n of nodes){const z=nodeSize(n),x=n.x-z.w/2,y=n.y-z.h/2,isRoot=n.parentId===null&&!n.detached&&!n.free&&n.kind!=="rectangle",t=textStyle(n),freeText=n.free&&n.kind==="text",freeImage=n.free&&n.kind==="image";ctx.save();if(!freeText&&!freeImage){ctx.fillStyle=isRoot?"#315f4e":n.kind==="note"?"#fbf3c9":n.free||n.kind==="rectangle"?palette[n.color].bg:"#ffffff";ctx.strokeStyle=isRoot?"#315f4e":palette[n.color].line;ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x,y,z.w,z.h,n.free||n.kind==="rectangle"?4:isRoot?13:10);ctx.fill();ctx.stroke();}
    let top=y+(freeText?6:16),available=z.h-(freeText?12:30);if(n.images.length){const image=new Image();image.src=await assetData(n.images[0]);await image.decode();const iw=freeImage?z.w:z.w-32,ih=freeImage?z.h:92,r=Math.min(iw/image.width,ih/image.height);ctx.drawImage(image,x+(z.w-image.width*r)/2,freeImage?y+(z.h-image.height*r)/2:y+12,image.width*r,image.height*r);if(freeImage){ctx.restore();continue;}top=y+119;available-=106;}
    ctx.beginPath();ctx.rect(x+3,y+3,z.w-6,z.h-6);ctx.clip();ctx.fillStyle=t.color;ctx.font=(t.bold?"700 ":"400 ")+t.size+"px "+t.family;const pad=freeText?6:16,lh=t.size*1.5,lines=A.wrapText(ctx,n.label,z.w-pad*2).slice(0,Math.max(1,Math.floor(available/lh)));if(!freeText&&!n.images.length)top=y+(z.h-lines.length*lh)/2;ctx.textAlign=t.align;const tx=t.align==="center"?n.x:t.align==="right"?x+z.w-pad:x+pad;lines.forEach((line,i)=>ctx.fillText(line,tx,top+t.size+i*lh));ctx.restore();
   }
   const blob=await new Promise(r=>out.toBlob(r,"image/png"));if(!blob)throw new Error("画布过大，请缩减内容后再导出");download(blob,S.doc.title+".png");toast("图片已导出，包含文字格式和自由对象");
  }catch(e){toast(e.message||"图片导出失败");}
 }
 return {decorate,inspector,onSelect,toolbar,drawLinks,exportPng,startRelation,copy,paste,duplicate,get toolMode(){return C.mode},get busy(){return C.busy},remove,mode,fitAll(){
   if(!S.doc)return;const nodes=visibleNodes(S.doc.data.nodes),r=canvas.getBoundingClientRect(),xs=[],ys=[];for(const n of nodes){const z=nodeSize(n);xs.push(n.x-z.w/2,n.x+z.w/2);ys.push(n.y-z.h/2,n.y+z.h/2);}for(const l of S.doc.data.links||[]){const p=connectionPoints(l,nodes);xs.push(p.a.x,p.b.x);ys.push(p.a.y,p.b.y);}for(const c of captions(nodes,S.doc.data.links)){xs.push(c.x-c.width/2,c.x+c.width/2);ys.push(c.y-c.height/2,c.y+c.height/2);}const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),scale=Math.max(.15,Math.min(1.1,(r.width-180)/(maxX-minX||1),(r.height-220)/(maxY-minY||1)));S.doc.data.viewport={x:-(minX+maxX)/2*scale,y:-(minY+maxY)/2*scale,scale};A.view();changed();
 }};
}
