# CinemaFlow 提交说明

## 1. 新旧路由对照

| 类型 | 路径 | 说明 |
| ------ | ------ | ------ |
| 根路由 | `/` | 重定向到 `/dashboard` |
| 新增标准页 | `/dashboard` | 首页仪表盘，整合统计、快捷入口、最近浏览、最近添加 |
| 新增标准页 | `/movies` | 标准电影列表页，支持查询参数同步 |
| 新增标准页 | `/movies/:id` | 电影详情父路由，默认跳转到 `/info` |
| 嵌套路由 | `/movies/:id/info` | 电影基本信息、评分、笔记 |
| 嵌套路由 | `/movies/:id/cast` | 演员表 |
| 新增标准页 | `/add` | 独立添加电影页面 |
| 新增标准页 | `/about` | 项目说明与数据管理 |
| 保留增强页 | `/explore` | 沉浸式探索影库 |
| 保留增强页 | `/favorites` | 收藏中心 |
| 保留增强页 | `/timeline` | 电影时间线 |
| 保留增强页 | `/recommendations` | 分类推荐 |
| 保留增强页 | `/random` | 随机选片 |
| 保留增强页 | `/compare` | 电影对比 |
| 保留增强页 | `/calendar` | 观影日历 |
| 保留增强页 | `/reviews` | 影评墙 |
| 新增创新页 | `/watch-plans` | 待看片单、优先级与观影日期 |
| 新增创新页 | `/watch-logs` | 观影日志、心情标签与会话评分 |
| 新增创新页 | `/smart-picks` | 智能选片与一键写回待看片单 |
| 兜底路由 | `**` | 重定向到 `/dashboard` |

## 2. Pages 与 Components 的职责划分

### Pages

- `dashboard-page`: 组合统计、最近浏览、最近添加、快捷入口。
- `movie-list-page`: 负责查询参数、列表视图、删除与跳转。
- `movie-detail-page`: 负责详情父级上下文、上一部/下一部、删除、子导航。
- `movie-add-page`: 负责独立新增流程与保存后跳转。
- `about-page`: 负责产品说明、模块总览、数据管理区域。

### Components

- `movie-form`: 继续承担真实海报校验、新增/编辑表单。
- `movie-stats`: 继续承担统计面板。
- `breadcrumb`: 全局面包屑。
- `command-palette`: 全局快速跳转。
- `recent-history`: 最近浏览展示。
- `data-management`: 导出 / 导入 JSON。
- `message-panel`: 全局服务消息面板。
- `movie-detail-info`: 详情基本信息子页。
- `movie-detail-cast`: 详情演员表子页。
- `confirm-dialog`: 删除与导入确认。
- `watch-plans`: 待看片单与排期页面。
- `watch-logs`: 观影日志页面。
- `smart-picks`: 智能选片与预设管理页面。

### Services

- `message.service`: 统一服务消息流，支持右下角消息面板。
- `movie-state.service`: 聚合多服务的页面级 view-model façade。
- `watch-plan.service`: 待看片单状态。
- `watch-log.service`: 观影日志状态。
- `smart-picks.service`: 智能选片预设与推荐结果。

## 3. 课设要求落地方式

- 多页面 SPA：所有标准页与增强模块都由 Angular Router 管理。
- 参数化路由：`/movies/:id`。
- 查询参数：`/movies` 同步 `search`、`genre`、`sort`、`watched`、`favorite`、`view`。
- 面包屑：根据当前路由自动生成，数字段显示为“详情”。
- 嵌套路由：详情页拆成 `/info` 与 `/cast`。
- 404：统一重定向到 `/dashboard`。
- 导航高亮：App Shell 顶部导航使用 `routerLinkActive`。
- 添加后跳转：`/add` 保存成功后进入 `/movies`。
- 删除后返回：详情页删除成功后返回 `/movies`。
- 上一部 / 下一部：详情页按片库顺序切换相邻电影。
- 服务化重构：新增 `MessageService`、`LoggerService` 日志流、`MovieStateService` 页面 façade。
- 响应式数据层：Dashboard / Movies / Movie Detail / About 通过 `vm$ + async` 消费页面状态。
- 服务消息面板：右下角常驻消息面板展示最近服务消息，About 页同步展示服务日志。
- 导入导出扩展：JSON 备份除电影、影评、最近浏览外，也包含待看片单、观影日志与智能选片预设。

## 4. 三个新增创新页面

### Watch Plans / 待看片单

- 管理待看片单、优先级与计划状态
- 支持安排观看日期、观影情境标签与备注
- 计划可切换为待安排 / 已排期 / 暂缓 / 已完成

### Watch Logs / 观影日志

- 记录观影时间、地点、陪同对象、情绪标签与会话评分
- 记录日志后自动把电影标记为已观影
- 若电影已存在待看片单，记录日志后会自动完成计划

### Smart Picks / 智能选片

- 基于时长、评分、类型、语言、待看片单与收藏偏好做即时推荐
- 支持保存 / 应用 / 删除预设
- 可将推荐结果一键加入待看片单，形成“推荐 → 计划 → 观影日志”闭环

> 第三次上机课中的全局快速跳转、最近浏览、数据备份与恢复能力仍然保留，并已与本轮服务化架构兼容。

## 5. 运行与验证

```bash
npm install
npm run build
CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe" npm run test -- --watch=false --browsers=ChromeHeadless
```

### 本次实际执行结果

- `npm run build`：成功（存在 Angular bundle budget warning，不影响产物生成）
- `CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe" npm run test -- --watch=false --browsers=ChromeHeadless`：成功（1 / 1 测试通过）
- `lint`：`package.json` 中没有 `lint` 脚本，因此未执行

## 6. 建议截图清单

本仓库已直接生成以下截图文件，位于 `docs/screenshots/`：

- `dashboard.png`
- `movies.png`
- `movies-search-inception.png`
- `movie-detail-info.png`
- `movie-detail-cast.png`
- `add.png`
- `about.png`
- `watch-plans.png`
- `watch-logs.png`
- `smart-picks.png`
- `explore.png`
- `command-palette.png`
- `recent-history.png`
- `data-management.png`
