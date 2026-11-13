# 思间 · 个人思维导图工具

简洁的个人脑图和白板工具。支持节点、子主题、关系线、图片、字体、框选、编组、左中右对齐、复制粘贴和完整备份。

## 数据保存

当前发布版本将文字和图片保存在访问者当前浏览器的 IndexedDB 中。GitHub 保存网页程序，不会接收访问者的脑图内容。此版本没有账号登录或跨电脑自动同步。

从本地文件切换到在线网址时，先在原网页导出完整备份，再在在线网页导入。更换电脑、浏览器或网址也需要导出和导入。清理浏览器站点数据会影响本地保存，请保留备份。

## 发布到 GitHub Pages

1. 把本目录中的 index.html 放在仓库根目录；其余文件用于维护源码。不要只上传 ZIP 文件。
2. 打开仓库 Settings → Pages。
3. Source 选择 Deploy from a branch。
4. Branch 选择 main，Folder 选择 / (root)，点击 Save。
5. 等待 GitHub Pages 发布完成后，从 Pages 页面打开实际生成的访问链接。

## 源码维护

可编辑的前端源文件在 source/public，浏览器本地保存接口在 source/scripts/local-storage-adapter.js。scripts/build-standalone.mjs 将这些文件组合成单文件网页。

电脑安装 Node.js 后，在仓库根目录运行：

```text
node scripts/build.mjs
```

无需安装第三方依赖。生成的 index.html 可本地打开，也可上传到 GitHub Pages。只修改 source 中的文件不会直接更新网页，需要重新生成并提交 index.html。

个人脑图内容、浏览器数据库、账号凭证和云端服务配置不包含在本发布包中。
