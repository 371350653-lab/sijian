
import fs from "node:fs/promises";
import path from "node:path";
export async function buildStandalone(siteDir,adapterPath,destination,{qa=false}={}){
 let model=(await fs.readFile(path.join(siteDir,"public/model.mjs"),"utf8")).replaceAll("export ","");
 let addon=(await fs.readFile(path.join(siteDir,"public/basic-tools.mjs"),"utf8")).replace(/^\s*import[^\n]+\n/gm,"").replaceAll("export ","");
 let client=(await fs.readFile(path.join(siteDir,"public/canvas.mjs"),"utf8")).replace(/^\s*import[^\n]+\n/gm,"").replace('const assetUrl=id=>"/api/assets/"+id;','const assetUrl=id=>localImages.get(id)||"";');
 const start=client.indexOf("async function api("),end=client.indexOf("const draftKey=",start);if(start<0||end<0)throw new Error("未找到保存接口");
 client=client.slice(0,start)+'async function api(url,options={}){return localApi(url,options);}\n'+client.slice(end);
 client=client.replace("文字、图片和视图自动保存在云端。换一台电脑，登录同一个账号就能继续。离线时，文字编辑会暂存为本机草稿，联网后请确认显示“已保存到云端”。","这是本地体验版，文字和图片保存在当前浏览器。跨电脑可先导出完整备份，再在另一台电脑导入。正式上线后才会提供账号登录与云端同步。").replaceAll("云端","本机").replace("重新登录","重新打开").replace('window.top.location.href="/signin-with-chatgpt?return_to=%2F"',"window.location.reload()");
 let adapter=await fs.readFile(adapterPath,"utf8");if(qa)adapter=adapter.replaceAll("mindspace-standalone-v1","mindspace-basic-tools-qa-v1").replaceAll("本机浏览器","功能验证");
 const selection=(await fs.readFile(path.join(siteDir,"public/selection-tools.mjs"),"utf8")).replace(/^\s*import[^\n]+\n/gm,"").replaceAll("export ","");
 const script=[model,adapter,addon,selection,client].join("\n").replaceAll("</script","<\\/script"),css=await fs.readFile(path.join(siteDir,"public/canvas.css"),"utf8"),favicon=await fs.readFile(path.join(siteDir,"public/favicon.svg"),"utf8");
 const html=(await fs.readFile(path.join(siteDir,"public/canvas.html"),"utf8")).replace('<link rel="stylesheet" href="/canvas.css">',()=>"<style>"+css+"</style>").replace('href="/favicon.svg"','href="data:image/svg+xml,'+encodeURIComponent(favicon)+'"').replace('href="/" target="_top"','href="#"').replaceAll("思间 · 个人思维画布","思间 · 本地体验版").replace("正在连接云端","正在读取本机数据").replace("给想法，一点生长的空间","本地体验版 · 数据保存在当前浏览器").replace('<script type="module" src="/canvas.mjs"></script>',()=>'<script type="module">'+script+"</script>");
 await fs.writeFile(destination,html);return {bytes:Buffer.byteLength(html),qa};
}
