# 冷愁藏书馆

个人实体藏书档案，使用原生 HTML、CSS 和 JavaScript，无需前端构建或数据库。

正式网页：https://lengchou6.github.io/lengchou-library/

## 当前馆藏与浏览

共78册、159张原始照片，按游戏与设计、写作与叙事、文学与小说、人文与社科四类陈列。同系列相邻，每册独立建档；完整书名自然换行，副标题弱化显示。首页仅保留搜索、核心分类和排序。

- 根据屏幕宽度显示5、4、3或2列，以连续层板承托实拍封面。
- 支持书名、作者、译者、ISBN、编号、出版社、系列、别名和标签搜索；中文输入完成后再检索，卡片节点和搜索索引复用。
- 分类、搜索、系列与排序记录在网址查询参数中，可刷新恢复或分享；单书地址为 `#book/LC-000001`。
- 详情提供照片切换与全屏查看、同系列跳转、相邻藏书导航。切图保留上一张直至新预览准备好，并提前加载下一张预览（节省流量模式除外）。
- 详情优先展示出版社、版本与简介，完整书目可展开；未知字段省略。
- 支持键盘、焦点恢复、失败图片重试与减少动态效果设置。
- 单一实拍书架，不提供主题切换或语种筛选，不使用本地存储记录偏好。

## 图片与性能

原图逐字节保留，展示资源只缩小、压缩完整画面，不裁切、调正或重绘。

- 封面生成320、480、720像素宽WebP，通过 `srcset` 适配屏幕；详情预览宽度上限960像素。
- 放大查看时请求原图；首排优先加载，其余封面延迟加载，使用异步解码和固定图片区域减少跳动。
- 衍生文件名包含原图、尺寸、质量与处理版本的摘要，原图变更后生成新地址。
- `.cache/photos/` 缓存转换结果，GitHub Actions跨部署复用，新增照片只生成新增资源。
- 衍生图不提交Git，发布工作流从原图生成并更新书目中的展示路径。保留旧版v1预览地址，兼容尚未刷新的页面缓存。
- 图片失败后自动重试当前响应式资源，再回退到原图；连续失败才提示，手动重试会实际重新请求图片。书目请求每次重新验证缓存。

本地准备和查看：

```bash
python -m pip install Pillow==11.3.0
python scripts/optimize_photos.py
python scripts/validate_catalog.py
python scripts/audit_catalog.py
node --check dist/app.js
python -m http.server 8080 --directory dist
```

浏览器访问 `http://localhost:8080`，不要直接打开HTML文件。

## 代码结构

| 路径 | 用途 |
| --- | --- |
| `dist/index.html` | 页面结构 |
| `dist/styles.css` | 书架、详情、手机与全屏查看样式 |
| `dist/app.js` | 检索、筛选、路由、图片与交互 |
| `dist/data/books.json` | 书目、系列、整套定价及汇率记录 |
| `dist/assets/LC-xxxxxx/` | 每册原始照片与生成的展示资源 |
| `scripts/optimize_photos.py` | 增量生成完整构图预览 |
| `scripts/validate_catalog.py` | 编号、ISBN、时间、价格与资源路径校验 |
| `scripts/audit_catalog.py` | 同图、同ISBN、同名版本审计 |
| `.github/workflows/pages.yml` | 生成、校验并发布GitHub Pages |

## 数据约定

- `id`固定，一册一个；ISBN不是实体册唯一标识，未知ISBN为 `null`，ISBN-10保留原印并校验。
- `title`和 `subtitle`共同组成完整书名，短名可放入搜索别名。
- 作者无法核实可为空数组，其他未知信息使用 `null`，不从封面推断版权页信息。
- `photos[].original`保留原始照片；`preview`、`thumbnail`、`sources`由优化脚本生成。每张照片保留拍摄时间，`sha256`用于核验原图。
- `accessionedAt`采用正面照片拍摄时间，带 `+08:00` 时区。
- `seriesGroups`表示书系关系，各册保留独立记录；不推断同系列为同次购买。
- `priceGroups`表示整套定价，合计仅计一次，不虚构单册分摊价格。
- `listPrice`为封底定价，`paidPrice`为实际支付价格。外币保留原币，使用数据内固定汇率提供参考折算，非实时汇率或估值。
- 成色仅根据已有照片判断外观，未检查内页、装订、缺页或笔记。

## 发布与公开内容

仓库 `lengchou6/lengchou-library` 及GitHub Pages均公开。推送到 `main` 后自动生成图片、校验并发布 `dist/`。原始照片、购买信息、备注或存放位置一旦录入发布数据，也会随网页公开；仅隐藏界面不会删除公开数据。

原备用站 https://lengchou-library.lengchou6.chatgpt.site 需单独维护，不随GitHub同步。

## 2026-10-25 14:31批次

新增7册、14张完整原图：《The Art of Joy》英文版、《L’arte della gioia》意大利文版、《霍比特人》《金叶：来自金枝的故事》《遥远的救世主》《背叛》《天幕红尘》。两册萨皮恩扎作品按同一作品不同语种关联，各自独立建档。保留GBP与EUR原币价格，欧元补用既有2026-10-16汇率日期，1 EUR=7.5228 CNY。英文本封底英国与加拿大双地区价格仅取GBP为主定价，不重复累计。
