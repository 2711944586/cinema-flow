# CinemaFlow 提交说明

## 1. 新旧路由对照

| 类型 | 路径 | 说明 |
|------|------|------|
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
- `movie-detail-info`: 详情基本信息子页。
- `movie-detail-cast`: 详情演员表子页。
- `confirm-dialog`: 删除与导入确认。

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

## 4. 三个新增功能

### 全局快速跳转

- 快捷键：`Ctrl+K / Cmd+K`
- 支持搜索页面与电影
- 支持键盘上下选择、回车跳转

### 最近浏览

- 访问详情页时记录最近浏览
- 使用 `localStorage` 持久化
- 仪表盘与详情页侧边都可继续查看

### 数据备份与恢复

- 支持导出当前片库为 JSON
- 支持导入 JSON 覆盖本地状态
- 备份内容包含电影、收藏/已看状态、评分、笔记、影评、最近浏览

## 5. 运行与验证

```bash
npm install
npm run build
npm run test -- --watch=false
```

### 本次实际执行结果

- `npm run build`：成功
- `npm run test -- --watch=false`：已执行，但 Karma 在当前沙箱环境中启动 Chrome 时 `spawn EPERM`
- `lint`：`package.json` 中没有 `lint` 脚本，因此未执行

## 6. 建议截图清单

- `/dashboard`
- `/movies`
- `/movies?search=inception&genre=科幻&sort=toprated`
- `/movies/1/info`
- `/movies/1/cast`
- `/add`
- `/about`
- `/explore`
- 快速跳转面板
- 最近浏览区域
- 数据备份与恢复区域
