
const COLORS=["teal","blue","rose","amber","violet"],ID=/^[a-zA-Z0-9_-]{1,100}$/,HEX=/^#[0-9a-fA-F]{6}$/;
export const fonts={sans:'"Microsoft YaHei","PingFang SC",Arial,sans-serif',serif:'"SimSun","Songti SC",serif',mono:'"Consolas","Courier New",monospace'};
export function textStyle(n){const s=n.style||{};return {family:fonts[s.fontFamily]||fonts.sans,size:s.fontSize||(n.kind==="rectangle"?16:n.free?(n.kind==="text"?24:16):(n.parentId===null&&!n.detached?17:13)),bold:s.bold??(n.parentId===null&&!n.detached&&!n.free&&n.kind!=="rectangle"),align:s.align||"left",color:s.textColor||(n.parentId===null&&!n.detached&&!n.free&&n.kind!=="rectangle"?"#ffffff":"#354e40")};}
function style(s={}){const n=Number(s.fontSize);return {fontFamily:["sans","serif","mono"].includes(s.fontFamily)?s.fontFamily:"sans",...(Number.isFinite(n)?{fontSize:Math.max(10,Math.min(96,Math.round(n)))}:{}),...(typeof s.bold==="boolean"?{bold:s.bold}:{}),align:["left","center","right"].includes(s.align)?s.align:"left",...(HEX.test(s.textColor)?{textColor:s.textColor}:{})};}
function point(n){return Number.isFinite(n)&&Math.abs(n)<=100000;}
export function validateGraph(value){
 if(!value||value.version!==1||!Array.isArray(value.nodes)||value.nodes.length<1||value.nodes.length>1000)throw new Error("导图需要包含 1–1000 个节点");
 const ids=new Set(),nodes=value.nodes.map(n=>{
  if(!n||!ID.test(n.id)||ids.has(n.id))throw new Error("节点编号不正确");ids.add(n.id);
  if(typeof n.label!=="string"||n.label.length>2000||typeof(n.notes??"")!=="string"||(n.notes??"").length>10000)throw new Error("节点文字过长");
  if(typeof(n.edgeLabel??"")!=="string"||(n.edgeLabel??"").length>100)throw new Error("连线文字最多 100 个字符");
  if(!point(n.x)||!point(n.y))throw new Error("节点位置不正确");
  if(n.parentId!==null&&!ID.test(n.parentId))throw new Error("节点关系不正确");
  if(n.groupId!=null&&(typeof n.groupId!=="string"||!ID.test(n.groupId)))throw new Error("编组编号不正确");
  const images=n.images??[];if(!Array.isArray(images)||images.length>8||images.some(a=>!ID.test(a)))throw new Error("图片引用不正确");
  const rectangle=n.kind==="rectangle",free=!!n.free&&!rectangle;if(n.free&&(n.parentId!==null||!["text","image","rectangle","note"].includes(n.kind)))throw new Error("自由对象类型不正确");
  return {id:n.id,parentId:n.parentId,label:n.label,x:n.x,y:n.y,color:COLORS.includes(n.color)?n.color:"teal",side:n.side==="left"?"left":"right",collapsed:!!n.collapsed,detached:!!n.detached,notes:n.notes??"",images,style:style(n.style),locked:!!n.locked,lineType:["straight","elbow","curve"].includes(n.lineType)?n.lineType:"curve",arrow:!!n.arrow,lineDashed:!!n.lineDashed,lineWidth:[1,2,3].includes(n.lineWidth)?n.lineWidth:2,...(HEX.test(n.lineColor)?{lineColor:n.lineColor}:{}),edgeLabel:n.edgeLabel??"",groupId:n.groupId||null,...(free?{free:true,kind:n.kind,width:Math.max(70,Math.min(1600,Number(n.width)||240)),height:Math.max(30,Math.min(1600,Number(n.height)||100))}:rectangle?{kind:"rectangle",width:Math.max(70,Math.min(1600,Number(n.width)||260)),height:Math.max(30,Math.min(1600,Number(n.height)||120))}:{})};
 });
 const tree=nodes.filter(n=>!n.free);if(!tree.some(n=>n.parentId===null))throw new Error("导图需要至少一个主题");
 const byId=new Map(tree.map(n=>[n.id,n]));for(const n of tree){let cur=n;const seen=new Set();while(cur.parentId!==null){if(seen.has(cur.id))throw new Error("节点关系不能形成循环");seen.add(cur.id);cur=byId.get(cur.parentId);if(!cur)throw new Error("找不到上级节点");}}
 if(!Array.isArray(value.links??[])||(value.links??[]).length>1500)throw new Error("连线数量不正确");
 const links=(value.links??[]).map(l=>{if(!ID.test(l.id)||ids.has(l.id))throw new Error("连线编号不正确");ids.add(l.id);if(typeof(l.label??"")!=="string"||(l.label??"").length>100)throw new Error("连线文字最多 100 个字符");if(![l.x1,l.y1,l.x2,l.y2].every(point))throw new Error("连线位置不正确");if(l.from&&!nodes.some(n=>n.id===l.from)||l.to&&!nodes.some(n=>n.id===l.to)||l.from&&l.from===l.to)throw new Error("连线对象不正确");return {id:l.id,from:l.from||null,to:l.to||null,x1:l.x1,y1:l.y1,x2:l.x2,y2:l.y2,type:["straight","elbow","curve"].includes(l.type)?l.type:"straight",arrow:l.arrow!==false,color:HEX.test(l.color)?l.color:"#718b7d",width:[1,2,3].includes(l.width)?l.width:2,dashed:!!l.dashed,locked:!!l.locked,label:l.label??""};});
 let viewport={x:0,y:0,scale:1};if(value.viewport&&[value.viewport.x,value.viewport.y,value.viewport.scale].every(Number.isFinite))viewport={x:Math.max(-100000,Math.min(100000,value.viewport.x)),y:Math.max(-100000,Math.min(100000,value.viewport.y)),scale:Math.max(.15,Math.min(2.5,value.viewport.scale))};
 return {version:1,nodes,links,viewport};
}
export const palette={teal:{line:"#67a99b",bg:"#edf6f2",ink:"#215d51"},blue:{line:"#8aaede",bg:"#eff4fc",ink:"#42658d"},rose:{line:"#d9a0a6",bg:"#fbf0f1",ink:"#96535f"},amber:{line:"#d5b273",bg:"#fcf5e8",ink:"#8c6d38"},violet:{line:"#ae9bd3",bg:"#f3effb",ink:"#786397"}};
export function branchLineStyle(n){return {type:n.lineType||"curve",arrow:!!n.arrow,dashed:!!n.lineDashed,color:HEX.test(n.lineColor)?n.lineColor:(palette[n.color]||palette.teal).line,width:[1,2,3].includes(n.lineWidth)?n.lineWidth:2};}
export function nodeSize(n){const t=textStyle(n),sized=n.free||n.kind==="rectangle",w=sized?n.width||(n.kind==="rectangle"?260:240):n.parentId===null&&!n.detached?238:190,pad=n.free&&n.kind==="text"?12:34;if(n.free&&n.kind==="image")return {w,h:n.height||180};const lines=Math.min(sized?30:12,Math.max(1,n.label.split("\n").reduce((sum,line)=>sum+Math.max(1,Math.ceil([...line].length/Math.max(2,Math.floor((w-pad)/t.size)))),0))),content=Math.ceil(t.size*1.5)*lines+pad+(n.images?.length?106:0)+(n.notes?16:0);return {w,h:sized?Math.max(n.kind==="text"?38:n.height||(n.kind==="rectangle"?120:100),content):Math.max(n.parentId===null&&!n.detached?82:58,content)};}
export function descendants(nodes,id){const result=new Set();function visit(pid){for(const n of nodes.filter(n=>n.parentId===pid)){if(!result.has(n.id)){result.add(n.id);visit(n.id);}}}visit(id);return result;}
export function visibleNodes(nodes){const map=new Map(nodes.map(n=>[n.id,n]));return nodes.filter(n=>{let p=map.get(n.parentId);while(p){if(p.collapsed)return false;p=map.get(p.parentId);}return true;});}
export function arrange(data){
 const nodes=data.nodes.filter(n=>!n.free),roots=nodes.filter(n=>n.parentId===null);if(!roots.length)return data;
 const children=id=>nodes.filter(n=>n.parentId===id);
 function height(n){const ch=n.collapsed?[]:children(n.id);return Math.max(nodeSize(n).h,ch.reduce((s,c)=>s+height(c)+28,0)-28);}
 function place(n,x,y,side,color){n.x=x;n.y=y;n.side=side;n.color=color;const ch=n.collapsed?[]:children(n.id);let top=y-ch.reduce((s,c)=>s+height(c)+28,0)/2+14;for(const c of ch){const h=height(c);place(c,x+(side==="left"?-1:1)*(nodeSize(n).w/2+nodeSize(c).w/2+88),top+h/2,side,color);top+=h+28;}}
 let bottom=null;for(const root of roots){
  root.x=0;root.y=0;
  for(const side of ["left","right"]){const branches=children(root.id).filter(n=>n.side===side);let top=-branches.reduce((s,n)=>s+height(n)+38,0)/2+19;for(const b of branches){const h=height(b);place(b,(side==="left"?-1:1)*(nodeSize(root).w/2+nodeSize(b).w/2+116),top+h/2,side,b.color);top+=h+38;}}
  const ids=descendants(nodes,root.id);ids.add(root.id);const branch=visibleNodes(nodes).filter(n=>ids.has(n.id)),top=Math.min(...branch.map(n=>n.y-nodeSize(n).h/2)),shift=bottom===null?0:bottom+120-top;
  for(const n of nodes)if(ids.has(n.id))n.y+=shift;bottom=Math.max(...branch.map(n=>n.y+nodeSize(n).h/2));
 }
 return data;
}
// A peer topic is an independent tree, placed below the anchor without moving existing content.
export function placePeerTopic(data,node,anchor){
 const ids=descendants(data.nodes,anchor.id);ids.add(anchor.id);const occupied=visibleNodes(data.nodes),branch=occupied.filter(n=>ids.has(n.id)),z=nodeSize(node);
 node.x=anchor.x;node.y=Math.max(...branch.map(n=>n.y+nodeSize(n).h/2))+120+z.h/2;
 for(let tries=0;tries<=occupied.length;tries++){const overlap=occupied.filter(n=>{const size=nodeSize(n);return Math.abs(node.x-n.x)<(z.w+size.w)/2+36&&Math.abs(node.y-n.y)<(z.h+size.h)/2+60;});if(!overlap.length)break;node.y=Math.max(...overlap.map(n=>n.y+nodeSize(n).h/2))+120+z.h/2;}
 return node;
}
export function canRemoveNodes(nodes,ids){const remove=new Set(ids);return nodes.some(n=>!n.free&&n.parentId===null&&!remove.has(n.id));}
// Add one node beside its parent without rearranging any existing objects.
export function placeNewNode(data,node){
 const parent=data.nodes.find(n=>n.id===node.parentId);if(!parent)return node;
 const z=nodeSize(node),pz=nodeSize(parent),sign=node.side==="left"?-1:1;
 node.x=parent.x+sign*(pz.w/2+z.w/2+(parent.parentId===null?116:88));
 const siblings=data.nodes.filter(n=>!n.free&&n.parentId===parent.id&&n.side===node.side);
 node.y=siblings.length?Math.max(...siblings.map(n=>n.y+nodeSize(n).h/2))+28+z.h/2:parent.y;
 const occupied=visibleNodes(data.nodes);for(let tries=0;tries<=occupied.length;tries++){
  const overlap=occupied.filter(n=>{const size=nodeSize(n);return Math.abs(node.x-n.x)<(z.w+size.w)/2+18&&Math.abs(node.y-n.y)<(z.h+size.h)/2+24;});
  if(!overlap.length)break;node.y=Math.max(...overlap.map(n=>n.y+nodeSize(n).h/2))+24+z.h/2;
 }
 return node;
}
export function connectionCaption(a,b,text){
 text=String(text||"").trim();if(!text)return null;
 const lines=[];for(const paragraph of text.split("\n")){const chars=[...paragraph];if(!chars.length)lines.push("");for(let i=0;i<chars.length;i+=14)lines.push(chars.slice(i,i+14).join(""));}
 const width=Math.max(28,...lines.map(s=>[...s].reduce((w,c)=>w+(/[\u0000-\u00ff]/.test(c)?7:12),0)+18)),height=lines.length*18+6,x=(a.x+b.x)/2,y=(a.y+b.y)/2;
 return {x,y,width,height,lines};
}

export function connectionPoints(l,nodes){const map=new Map(nodes.map(n=>[n.id,n])),a=map.get(l.from),b=map.get(l.to);let p={x:a?a.x:l.x1,y:a?a.y:l.y1},q={x:b?b.x:l.x2,y:b?b.y:l.y2};function border(n,towards){if(!n)return null;const z=nodeSize(n),dx=towards.x-n.x,dy=towards.y-n.y,k=1/Math.max(Math.abs(dx)/(z.w/2),Math.abs(dy)/(z.h/2),.001);return {x:n.x+dx*k,y:n.y+dy*k};}return {a:a?border(a,q):p,b:b?border(b,p):q};}
export function connectionPath(a,b,type="straight"){if(Math.abs(a.x-b.x)<.01)return "M "+a.x+" "+a.y+" L "+b.x+" "+b.y;const mx=(a.x+b.x)/2;return type==="elbow"?"M "+a.x+" "+a.y+" H "+mx+" V "+b.y+" H "+b.x:type==="curve"?"M "+a.x+" "+a.y+" C "+mx+" "+a.y+", "+mx+" "+b.y+", "+b.x+" "+b.y:"M "+a.x+" "+a.y+" L "+b.x+" "+b.y;}
export function newGraph(welcome=false){const root={id:crypto.randomUUID(),parentId:null,label:welcome?"我的第一张导图":"中心主题",x:0,y:0,color:"teal",side:"right",collapsed:false,notes:"",images:[]};const nodes=[root];if(welcome){[["想完成的事","teal","right"],["下一步行动","blue","right"],["随手记下的灵感","amber","left"]].forEach(([label,color,side])=>{nodes.push({id:crypto.randomUUID(),parentId:root.id,label,x:0,y:0,color,side,notes:"",images:[],collapsed:false});});}return arrange({version:1,nodes,links:[],viewport:{x:0,y:0,scale:1}});}

export function groupMembers(nodes,ids){const selected=new Set(ids),groups=new Set(nodes.filter(n=>selected.has(n.id)&&n.groupId).map(n=>n.groupId));for(const n of nodes)if(groups.has(n.groupId))selected.add(n.id);return selected;}
export function movingMembers(nodes,ids){let selected=groupMembers(nodes,ids),size=-1;while(size!==selected.size){size=selected.size;for(const id of [...selected])for(const child of descendants(nodes,id))selected.add(child);selected=groupMembers(nodes,selected);}return selected;}

// Cutting a branch detaches its subtree without moving or deleting any nodes.
export function canCutConnection(data,kind,id){
 if(!data)return false;
 if(kind==="link"){const line=(data.links||[]).find(l=>l.id===id);return !!line&&!line.locked;}
 if(kind!=="tree")return false;
 const node=data.nodes.find(n=>n.id===id&&!n.free),parent=node&&data.nodes.find(n=>n.id===node.parentId);
 return !!parent&&!node.locked&&!parent.locked;
}
export function cutConnection(data,kind,id){
 if(!canCutConnection(data,kind,id))return false;
 if(kind==="link")data.links=data.links.filter(l=>l.id!==id);
 else{const node=data.nodes.find(n=>n.id===id);node.parentId=null;node.detached=true;node.edgeLabel="";}
 return true;
}

// Copy complete branches and groups once; external parents become independent nodes.
export function createNodeFragment(data,ids){
 const members=movingMembers(data.nodes,ids),nodes=structuredClone(data.nodes.filter(n=>members.has(n.id)));
 if(!nodes.length)return null;
 for(const n of nodes)if(n.parentId!==null&&!members.has(n.parentId)){n.parentId=null;if(!n.free&&n.kind!=="rectangle")n.detached=true;}
 return {kind:"nodes",version:1,nodes,links:structuredClone((data.links||[]).filter(l=>l.from&&l.to&&members.has(l.from)&&members.has(l.to)))};
}
export function prepareNodePaste(data,fragment,position){
 if(fragment?.kind!=="nodes"||fragment.version!==1||!Array.isArray(fragment.nodes)||!fragment.nodes.length)throw new Error("复制的节点数据不正确");
 const dummy=!fragment.nodes.some(n=>!n.free&&n.parentId===null)?{id:crypto.randomUUID(),parentId:null,label:"",x:0,y:0,images:[]}:null;
 const validated=validateGraph({version:1,nodes:dummy?[...fragment.nodes,dummy]:fragment.nodes,links:fragment.links||[]}),nodes=validated.nodes.filter(n=>n.id!==dummy?.id),links=validated.links;
 if(data.nodes.length+nodes.length>1000)throw new Error("粘贴后超过 1000 个节点，请减少选择范围");
 if((data.links?.length||0)+links.length>1500)throw new Error("粘贴后超过 1500 条连线，请减少选择范围");
 const boxes=nodes.map(n=>{const z=nodeSize(n);return {left:n.x-z.w/2,right:n.x+z.w/2,top:n.y-z.h/2,bottom:n.y+z.h/2};}),origin={x:(Math.min(...boxes.map(b=>b.left))+Math.max(...boxes.map(b=>b.right)))/2,y:(Math.min(...boxes.map(b=>b.top))+Math.max(...boxes.map(b=>b.bottom)))/2};
 const p=position||{x:origin.x+35,y:origin.y+35};if(!point(p.x)||!point(p.y))throw new Error("粘贴位置不正确");
 const offset=Math.hypot(p.x-origin.x,p.y-origin.y)<5?35:0,dx=p.x-origin.x+offset,dy=p.y-origin.y+offset,ids=new Map(nodes.map(n=>[n.id,crypto.randomUUID()])),groups=new Map();
 for(const n of nodes){n.id=ids.get(n.id);n.parentId=ids.get(n.parentId)||null;n.x+=dx;n.y+=dy;n.locked=false;if(n.groupId){if(!groups.has(n.groupId))groups.set(n.groupId,crypto.randomUUID());n.groupId=groups.get(n.groupId);}}
 for(const l of links){l.id=crypto.randomUUID();l.from=ids.get(l.from)||null;l.to=ids.get(l.to)||null;l.x1+=dx;l.x2+=dx;l.y1+=dy;l.y2+=dy;l.locked=false;}
 validateGraph({...data,nodes:[...data.nodes,...nodes],links:[...(data.links||[]),...links]});
 return {nodes,links};
}
// Alignment moves only the selected boxes; connections follow their endpoints.
export function alignNodes(data,ids,edge){
 if(!["left","center","right"].includes(edge))return false;
 const selected=new Set(ids),nodes=data.nodes.filter(n=>selected.has(n.id));if(nodes.length<2||nodes.some(n=>n.locked))return false;
 const bounds=nodes.map(n=>{const w=nodeSize(n).w;return {node:n,w,left:n.x-w/2,right:n.x+w/2};}),left=Math.min(...bounds.map(b=>b.left)),right=Math.max(...bounds.map(b=>b.right)),target=edge==="center"?(left+right)/2:edge==="left"?left:right;
 let changed=false;for(const b of bounds){const x=edge==="center"?target:target+(edge==="left"?b.w/2:-b.w/2);if(b.node.x!==x){b.node.x=x;changed=true;}}return changed;
}
