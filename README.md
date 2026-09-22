# DAI JINYAN — Photography

这是 `daijinyan.top` 的摄影作品站。网站采用轻量静态生成方式：照片、项目和分类全部由 JSON 数据管理，页面由构建脚本自动生成，再由 GitHub Actions 部署到 GitHub Pages。

## 日常工作流程

### 无代码可视化后台（推荐）

访问 `https://daijinyan.top/admin/`，使用只授权给本仓库的 GitHub 细粒度访问令牌连接。后台支持：

- 上传 JPG、PNG 或 WebP，并自动识别横竖方向；
- 修改标题、日期、地点、Project、Category 与项目内顺序；
- 控制照片是否进入首页、精选页、Archive，以及是否公开显示；
- 一次点击完成图片与 JSON 数据的原子提交，随后由 GitHub Actions 自动发布。

令牌仅保存在当前浏览器标签页的内存中，刷新或关闭页面后需要重新输入，不会写入仓库、URL 或浏览器本地存储。建议使用 GitHub Fine-grained personal access token：Repository access 仅选择 `RedneckRuntu.github.io`，Repository permissions 仅将 Contents 设为 Read and write，并设置有效期。

### 本地脚本流程

1. 将导出的 JPG 放进 `content/photos/`，建议使用 sRGB，长边 2400–4000 px，不要上传 RAW。
2. 使用 `npm run add-photo` 写入作品信息，或直接编辑 `content/data/photos.json`。
3. 运行 `npm run build`。它会先检查数据，再自动生成多尺寸 WebP、全部页面、站点地图和 404 页面。
4. 运行 `npm run preview`，浏览 `http://localhost:4173`。
5. 确认后提交并推送到 `main`，GitHub Actions 会自动发布。

首次在一台新电脑上使用时，先安装 Node.js 22，然后在仓库目录执行 `npm ci`。

## 增加一张照片

```bash
npm run add-photo -- "D:\\Photos\\new-photo.jpg" --id nanjing-002 --project nanjing-zhenze --categories street,architecture --date 2026-10 --location Nanjing --title "" --alt "A quiet street in Nanjing"
```

必要参数：原图路径、`--id`、`--project`、`--alt`。常用可选参数：

- `--categories street,night`：多个分类用英文逗号分隔。
- `--featured true`：显示在 PHOTOGRAPHS。
- `--homepage true --homepageOrder 3`：显示在首页并指定顺序。
- `--archive false`：不进入 ARCHIVE；默认进入。
- `--order 4`：在所属项目中的序列位置。
- `--visible false`：保留数据但暂不公开。

脚本会复制图片、识别横竖方向并写入数据。构建时才生成网页尺寸，不要手工修改 `dist/`。

## 手工修改照片

照片数据位于 `content/data/photos.json`。主要字段：

- `id`：永久且唯一的英文标识，发布后尽量不要改。
- `src`：`content/photos/` 中的文件名。
- `project`：主要摄影项目的 id；一张照片只设一个主要项目。
- `categories`：可以有多个分类。
- `order`：在 Project 页面中的人工序列。
- `featured`：是否进入精选单张页。
- `homepage` 与 `homepageOrder`：是否进入首页及首页顺序。
- `archive`：是否进入档案。
- `visible`：总开关。设为 `false` 即隐藏。
- `alt`：准确描述画面，用于无障碍和图片 SEO。

删除照片时，先从 `photos.json` 删除对应对象，再删除 `content/photos/` 中的原图。若它是某个 Project 的封面，必须先更换该项目的 `cover`。

## 管理 Project / Series

新建项目：

```bash
npm run new-project -- --id new-series --title "New Series" --cover photo-id --year "2027—" --location "China" --subtitle "Short introduction"
```

项目数据位于 `content/data/projects.json`：

- 修改 `title`、`subtitle`、`description` 可更新文案。
- 修改 `cover` 可更换封面，值必须是已有照片 id。
- 修改 `homepageOrder` 可调整首页项目顺序。
- `featured: false` 可让项目不在首页出现，但保留独立页面。
- `visible: false` 可整体隐藏项目。

项目页照片顺序完全由每张照片的 `order` 控制，不会按上传时间、文件名或 EXIF 自动重排。

## 管理 Category

分类数据位于 `content/data/categories.json`。新增分类时添加一个包含 `id`、`title`、`visible`、`order` 的对象。修改名称只需改 `title`；修改 id 时，必须同时修改所有照片的 `categories`。删除分类前，先从照片数据中移除对应 id。

Project 是有明确叙事顺序的摄影系列；Category 是照片属性。不要用 Category 代替 Project。

## 首页策展

首页不是按时间排序的 Feed：

- Project 是否出现由 `projects.json` 的 `featured` 决定，顺序由 `homepageOrder` 决定。
- 单张照片是否出现由 `photos.json` 的 `homepage` 决定，顺序也由 `homepageOrder` 决定。
- 首页 Hero 当前在 `src/build.mjs` 中指定为 `old-building-yellow-flowers`。更换时搜索 `const hero` 并替换照片 id。

## 图片处理

原图只保存在 `content/photos/`。构建脚本根据原始宽度生成 640、1024、1600 px（不放大）的 WebP，并输出 `srcset`。首屏 Hero 会优先加载，其余照片懒加载。网页不加载 RAW，也不会强制裁切照片。

原始照片应另行备份；GitHub 仓库不是完整照片资产库。

## 本地检查

```bash
npm ci
npm run validate
npm run build
npm run preview
```

`validate` 会检查重复 id、缺失文件、无效 Project、无效 Category 和封面引用。构建产物位于 `dist/`，它不会提交到 Git。

## 发布到 GitHub Pages

仓库：`RedneckRuntu/RedneckRuntu.github.io`

1. 在 GitHub 仓库的 Settings → Pages 中，将 Source 设为 GitHub Actions。
2. 推送到 `main`。
3. 打开 Actions，等待 `Deploy photography portfolio` 完成。
4. 在 Pages 设置中确认 Custom domain 为 `daijinyan.top`，并启用 Enforce HTTPS。

`CNAME` 会被原样复制到发布目录。现有 DNS 应保持：根域名的四条 GitHub Pages A 记录，以及 `www` 指向 `RedneckRuntu.github.io` 的 CNAME。无需购买 ECS。

## 回滚

重构前的旧站保存在分支 `backup/pre-photography-redesign-20260920`。日常回滚优先使用 GitHub 的 Revert，或对目标提交执行 `git revert <commit>`，这样不会改写历史。若整次重构需要撤回，可从备份分支创建新的恢复提交并推送到 `main`。

## 目录说明

```text
content/data/       照片、项目、分类和站点信息
content/photos/     网页用原始 JPG
src/                页面生成、样式和交互
tools/              添加照片、创建项目、检查数据
.github/workflows/  自动构建和部署
dist/               自动生成，不要手工编辑
CNAME               自定义域名，必须保留
```

## 设计原则

Photography first。页面保持克制，不使用统一比例裁切、花哨滚动动画、厚重组件或默认展示完整 EXIF。网站结构允许长期增加照片、分类和项目，但不会把维护工作变成手工复制 HTML。
