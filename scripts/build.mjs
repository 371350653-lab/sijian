import path from "node:path";
import {fileURLToPath} from "node:url";
import {buildStandalone} from "./build-standalone.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const result=await buildStandalone(path.join(root,"source"),path.join(root,"source/scripts/local-storage-adapter.js"),path.join(root,"index.html"));
console.log("已更新 index.html（"+result.bytes+" 字节）");
