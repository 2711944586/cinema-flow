# CinemaFlow 提交说明

## 1. 路由与页面交付范围

| 类型 | 路径 | 说明 |
| ------ | ------ | ------ |
| 根路由 | `/` | 重定向到 `/dashboard` |
| 标准页 | `/dashboard` | 首页仪表盘，聚合统计、快速入口、最近浏览、最近添加 |
| 标准页 | `/movies` | 标准片库页，支持查询参数、筛选、排序、分页 |
| 父级详情路由 | `/movies/:id` | 电影详情父级上下文，默认跳转到 `/info` |
| 嵌套路由 | `/movies/:id/info` | 电影基本信息、评分、文案与相关推荐 |
| 嵌套路由 | `/movies/:id/cast` | 演员表与主创信息 |
| 标准页 | `/add` | 独立添加电影页面 |
| 标准页 | `/about` | 项目说明、技术栈、模块总览与数据管理 |
| 增强页 | `/explore` | 沉浸式探索影库 |
| 增强页 | `/favorites` | 收藏中心 |
| 增强页 | `/timeline` | 电影时间线 |
| 增强页 | `/recommendations` | 分类推荐 |
| 增强页 | `/random` | 随机选片 |
| 增强页 | `/compare` | 电影对比 |
| 增强页 | `/calendar` | 真实观影日历 |
| 增强页 | `/reviews` | 影评墙 |
| 创新页 | `/watch-plans` | 待看片单、优先级与观影日期 |
| 创新页 | `/watch-logs` | 观影日志、情绪标签与会话评分 |
| 创新页 | `/smart-picks` | 智能选片与一键写回待看片单 |
| 新增创新页 | `/director-atlas` | 导演图谱 |
| 新增创新页 | `/mood-atlas` | 情绪图谱 |
| 新增创新页 | `/marathon` | 马拉松规划器 |
| 兜底路由 | `**` | 重定向到 `/dashboard` |

## 2. 本轮产品化升级内容

### UI 与导航体验

- 新增全局 `Page Jump Bar`，为 17 个顶级页面提供前后页切换与直接跳页能力。
- 消息面板从遮挡内容的右下角浮层改为布局侧栏中的 `最近动态` 模块。
- 去除带有“服务控制台 / 系统提示”意味的文案，统一替换为更自然的产品语言。
- 长列表页面统一接入共享分页器 `ListPagerComponent`，支持换页与页码跳转。

### 片库与数据层

- `MovieService` 在保留 44 条种子数据的同时，运行期自动抓取并合并多源片库。
- 通过规范化标题 identity key 去重，避免“中文名（English）/ 英文名”重复入库。
- 持久化时会剥离运行期生成的 SVG 海报/背景占位资源，防止 `localStorage` 体积失控。
- 本次验证环境中，片库已扩展到 `3295` 条可浏览电影记录，达到 20 倍扩容目标。

### 页面语义与业务修复

- 观影日历改为完全基于 `WatchLogService` 的真实观影记录，不再混用上映日期。
- 年份下拉范围自动延伸到当前年份，不再停留在 `2023`。
- Reviews、Watch Plans、Watch Logs 在新增内容后会自动回到第一页，避免分页错位。
- Marathon Planner 保存片单时会跳过已有 active 计划的电影，不覆盖用户已有安排。

## 3. Pages / Components / Services 职责划分

### Pages

- `dashboard-page`：组合统计、最近浏览、最近添加、快捷入口。
- `movie-list-page`：负责 `/movies` 的查询参数、列表视图、分页与跳转。
- `movie-detail-page`：负责详情父级上下文、上一部/下一部、删除、子导航。
- `movie-add-page`：负责独立新增流程与保存后跳转。
- `about-page`：负责产品说明、模块总览与数据管理区域。

### Components

- `page-jump-bar`：顶级页面切换与页面定位。
- `list-pager`：通用分页、切页与跳页输入。
- `movie-form`：真实海报校验、新增/编辑表单。
- `movie-calendar`：真实观影日历。
- `movie-review-wall`：影评墙与分页录入。
- `watch-plans`：待看片单与排期页面。
- `watch-logs`：观影日志页面。
- `smart-picks`：智能选片与预设管理页面。
- `director-atlas`：导演维度统计与作品聚合。
- `mood-atlas`：情绪维度统计与偏好地图。
- `marathon-planner`：时长预算选片与片单生成。
- `message-panel`：侧栏最近动态面板。

### Services

- `message.service`：统一服务消息流，供侧栏面板与 About 页面消费。
- `movie-state.service`：聚合多服务的页面级 view-model façade。
- `movie.service`：电影主库状态、远程扩库、去重合并与持久化。
- `watch-plan.service`：待看片单状态。
- `watch-log.service`：观影日志状态。
- `smart-picks.service`：智能选片预设与推荐结果。
- `data-port.service`：备份 / 恢复完整本地数据。

## 4. 课设要求与扩展要求的落地方式

- 多页面 SPA：所有标准页、增强页和新增创新页均通过 Angular Router 管理。
- 参数化路由：`/movies/:id` 作为详情父路由，并拆分 `info` / `cast` 子页。
- 查询参数：`/movies` 同步 `search`、`genre`、`sort`、`watched`、`favorite`、`view`、`page`、`pageSize`。
- 面包屑：根据当前路由自动生成，详情数字段显示为“详情”。
- 404：统一重定向到 `/dashboard`。
- 导航高亮：App Shell 顶部导航使用共享导航元数据统一驱动。
- 添加后跳转：`/add` 保存成功后进入 `/movies`。
- 删除后返回：详情页删除成功后返回 `/movies`。
- 上一部 / 下一部：详情页按片库顺序切换相邻电影。
- 服务化重构：保留 `MessageService`、`LoggerService`、`MovieStateService` façade 架构。
- 响应式数据层：Dashboard / Movies / About / Calendar 等页面都通过响应式流消费状态。
- 数据备份：JSON 导出除电影、影评、最近浏览外，也包含待看片单与观影日志等状态。
- 全页面截图：所有主要路由页面均已输出到 `docs/screenshots/`。

## 5. 六个创新功能页说明

### 既有三页

#### Watch Plans / 待看片单

- 管理待看片单、优先级与计划状态
- 支持安排观看日期、观影情境标签与备注
- 计划可切换为待安排 / 已排期 / 暂缓 / 已完成

#### Watch Logs / 观影日志

- 记录观影时间、地点、陪同对象、情绪标签与会话评分
- 记录日志后自动把电影标记为已观影
- 若电影已存在待看片单，记录日志后会自动完成计划

#### Smart Picks / 智能选片

- 基于时长、评分、类型、语言、待看片单与收藏偏好做即时推荐
- 支持保存 / 应用 / 删除预设
- 可将推荐结果一键加入待看片单，形成“推荐 → 计划 → 观影日志”闭环

### 本轮新增三页

#### Director Atlas / 导演图谱

- 按导演聚合作品数量、均分、收藏数、已看数与总时长
- 支持搜索导演名或作品名
- 右侧 spotlight 区展示导演代表作品矩阵

#### Mood Atlas / 情绪图谱

- 读取观影日志中的情绪标签并聚合成偏好地图
- 统计唯一观影会话数量，避免多标签重复计数
- 支持情绪 / 电影双维度搜索与空态提示

#### Marathon Planner / 马拉松规划器

- 根据时长预算、类型偏好、收藏偏好与已看开关自动选片
- 可生成 1~5 部的连看片单
- 写回待看片单时跳过已有 active 计划，保护用户现有安排

> 旧有的全局快速跳转、最近浏览、数据备份与恢复能力均保留，并已与新页面、新片库和新分页体系兼容。

## 6. 运行与验证

```bash
npm install
npm run build
CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe" npm run test -- --watch=false --browsers=ChromeHeadless
```

### 本次实际执行结果

- `npm run build`：成功（存在 Angular bundle budget warning，不影响产物生成）
- `CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe" npm run test -- --watch=false --browsers=ChromeHeadless`：成功（`12 / 12` 测试通过）
- `lint`：`package.json` 中没有 `lint` 脚本，因此未执行
- 只读代码审查：已执行，并已修复审查指出的重复去重、计划覆写、日历语义与分页错位问题

## 7. 截图文件清单

位于 `docs/screenshots/`：

- `dashboard.png`
- `movies.png`
- `movies-search-inception.png`
- `movie-detail-info.png`
- `movie-detail-cast.png`
- `add.png`
- `about.png`
- `explore.png`
- `favorites.png`
- `timeline.png`
- `recommendations.png`
- `random.png`
- `compare.png`
- `calendar.png`
- `reviews.png`
- `watch-plans.png`
- `watch-logs.png`
- `smart-picks.png`
- `director-atlas.png`
- `mood-atlas.png`
- `marathon.png`
- `command-palette.png`
- `recent-history.png`
- `data-management.png`
