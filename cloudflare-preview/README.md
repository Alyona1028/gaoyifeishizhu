# 海关研究资料库 · 静态预览版

这是给 Cloudflare Pages 的**纯静态预览副本**：不需要 D1、R2、Access，也不需要任何环境变量。

## 上传

1. Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → **Upload assets**。
2. 把整个 `cloudflare-preview` 文件夹拖进去。
3. 点 **Deploy**，打开生成的 `*.pages.dev` 地址即可。

## 说明

- 页面里的文件、成员、日志都是示例数据，仅用于看界面。
- 上传、改名、删除只在当前浏览器临时生效，刷新即还原。
- 正式版需要绑定 D1（变量名 `DB`）和 R2（变量名 `FILES`），配置见主项目。
