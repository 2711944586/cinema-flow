# CinemaFlow

CinemaFlow 是一个基于 Angular 17 Standalone Components 打造的电影库管理系统，围绕“可浏览、可记录、可规划、可回看”四条主线构建。当前版本在原有课程要求之上继续做了产品化升级：片库运行期扩容到 20 倍以上、所有长列表页面支持分页/跳页、观影日历改为真实日志驱动、消息面板移入布局侧栏，并新增 `Director Atlas`、`Mood Atlas`、`Marathon Planner` 三个功能页。

![CinemaFlow Dashboard Preview](docs/screenshots/dashboard.png)

## 快速导航

- [版本亮点](#版本亮点)
- [功能总览](#功能总览)
- [路由地图](#路由地图)
- [截图清单](#截图清单)
- [数据与媒体策略](#数据与媒体策略)
- [目录结构](#目录结构)
- [启动与验证](#启动与验证)
- [关键实现位置](#关键实现位置)
- [补充文档](#补充文档)

## 版本亮点

- Angular 17 Standalone + Angular Material + SCSS 深色电影风格界面
- 17 个顶级页面支持统一页面导航器，支持前后页切换与直接跳页
- `MovieService` 启动后自动合并多源片库，本次验证环境中片库扩展到 `3295` 部且保持去重
- Movies / Explore / Favorites / Reviews / Watch Plans / Watch Logs 全部支持分页与页码跳转
- 观影日历基于真实 `WatchLog` 时间轴构建，年份上限自动覆盖当前年
- 消息面板从遮挡式右下角浮层改为布局内侧边栏，文案同步去除“系统提示”口吻
- 新增三页：`Director Atlas`、`Mood Atlas`、`Marathon Planner`
- 支持全局命令面板、最近浏览、数据备份/恢复、真实海报校验与背景图兜底

## 功能总览

| 模块 | 说明 |
| ------ | ------ |
| `Dashboard` | 聚合统计、最近浏览、最近添加与快速入口，作为全局仪表盘 |
| `Movies` | 标准片库视图，支持 URL 查询参数、筛选、排序、分页、布局切换 |
| `Movie Detail` | 详情父路由下拆分 `Info` / `Cast` 子页，支持相邻电影切换与删除 |
| `Add Movie` | 独立新增页面，复用真实海报校验、预览和保存流程 |
| `Explore` | 沉浸式探索页，含 Hero Banner、筛选、排序、收藏过滤与分页 |
| `Favorites` | 收藏中心与已观看影片回看，支持分页浏览 |
| `Timeline` | 按年代查看片库分布 |
| `Recommendations` | 按导演与类型输出推荐片单 |
| `Random` | 随机选片与抽选历史 |
| `Compare` | 两部电影并列对比评分、时长、语言、票房等关键指标 |
| `Calendar` | 基于真实观影日志生成月视图、热度分布与当日记录面板 |
| `Reviews` | 影评墙、筛选、排序、录入与分页 |
| `Watch Plans` | 待看片单、优先级、状态与排期管理 |
| `Watch Logs` | 记录观影时间、情绪标签、陪同对象与会话评分 |
| `Smart Picks` | 依据预设条件做智能推荐，并一键回写待看片单 |
| `Director Atlas` | 按导演聚合作品数量、均分、收藏与已看进度 |
| `Mood Atlas` | 将观影日志中的情绪标签整理成偏好地图 |
| `Marathon Planner` | 按时长预算自动生成连看片单，并避免覆盖现有 active 计划 |
| `Command Palette` | `Ctrl / Cmd + K` 搜索页面与电影并快速跳转 |
| `Message Panel` | 布局侧栏中的最近动态面板，显示导入、收藏、推荐与计划更新 |
| `Data Management` | 导出和导入本地 JSON 备份 |

## 路由地图

| 路径 | 页面 |
| ------ | ------ |
| `/` | 重定向到 `/dashboard` |
| `/dashboard` | 仪表盘 |
| `/movies` | 标准电影列表页 |
| `/movies/:id/info` | 电影基本信息 |
| `/movies/:id/cast` | 电影演员表 |
| `/add` | 添加电影 |
| `/about` | 项目说明与数据管理 |
| `/explore` | 探索影库 |
| `/favorites` | 收藏中心 |
| `/timeline` | 时间线 |
| `/recommendations` | 分类推荐 |
| `/random` | 随机选片 |
| `/compare` | 电影对比 |
| `/calendar` | 观影日历 |
| `/reviews` | 影评墙 |
| `/watch-plans` | 待看片单 |
| `/watch-logs` | 观影日志 |
| `/smart-picks` | 智能选片 |
| `/director-atlas` | 导演图谱 |
| `/mood-atlas` | 情绪图谱 |
| `/marathon` | 马拉松规划器 |
| `**` | 重定向到 `/dashboard` |

## 截图清单

完整截图位于 `docs/screenshots/`：

| 文件名 | 对应页面 / 区域 |
| ------ | ------ |
| `dashboard.png` | `/dashboard` |
| `movies.png` | `/movies` |
| `movies-search-inception.png` | `/movies?search=inception` |
| `movie-detail-info.png` | `/movies/3/info` |
| `movie-detail-cast.png` | `/movies/3/cast` |
| `add.png` | `/add` |
| `about.png` | `/about` |
| `explore.png` | `/explore` |
| `favorites.png` | `/favorites` |
| `timeline.png` | `/timeline` |
| `recommendations.png` | `/recommendations` |
| `random.png` | `/random` |
| `compare.png` | `/compare` |
| `calendar.png` | `/calendar` |
| `reviews.png` | `/reviews` |
| `watch-plans.png` | `/watch-plans` |
| `watch-logs.png` | `/watch-logs` |
| `smart-picks.png` | `/smart-picks` |
| `director-atlas.png` | `/director-atlas` |
| `mood-atlas.png` | `/mood-atlas` |
| `marathon.png` | `/marathon` |
| `command-palette.png` | 全局命令面板 |
| `recent-history.png` | 最近浏览区域 |
| `data-management.png` | 数据管理区域 |

### 预览节选

#### `/dashboard`

![Dashboard](docs/screenshots/dashboard.png)

#### `/movies`

![Movies](docs/screenshots/movies.png)

#### `/mood-atlas`

![Mood Atlas](docs/screenshots/mood-atlas.png)

#### `/marathon`

![Marathon Planner](docs/screenshots/marathon.png)

## 数据与媒体策略

### 片库数据

- 内置 `44` 部电影种子数据作为离线基础片库
- `MovieService` 使用 `BehaviorSubject` 维护主状态，并在需要时异步扩充远程目录
- 扩库阶段会合并多源数据、按规范化标题去重，并保留本地编辑/收藏/已观看状态
- 当前验证环境下，应用运行后片库扩展到 `3295` 条可浏览电影记录

### 海报与背景图

- 新增 / 编辑电影时会根据片名、导演、上映日期匹配真实海报资源
- 未通过真实海报校验的条目不会保存
- 背景图优先使用真实 `backdrop`
- 若背景图缺失，则自动回退到海报或生成运行期占位视觉
- 生成的 SVG 占位资源不会写入持久化存储，避免 `localStorage` 膨胀

### 本地持久化与导出

- 电影主库
- 最近浏览记录
- 影评墙数据
- 待看片单
- 观影日志
- 智能选片预设
- 导出包中的完整片库状态

## 目录结构

```text
src/app/
├── app.component.*                 # 全局壳层、顶部导航、页面导航器与侧栏布局
├── app.routes.ts                   # 顶级路由与详情子路由定义
├── components/
│   ├── breadcrumb/                 # 面包屑
│   ├── command-palette/            # 全局快速跳转
│   ├── confirm-dialog/             # 删除 / 导入确认弹窗
│   ├── data-management/            # 导出 / 导入 JSON
│   ├── director-atlas/             # 导演图谱
│   ├── list-pager/                 # 共享分页器
│   ├── marathon-planner/           # 马拉松规划器
│   ├── message-panel/              # 侧栏最近动态面板
│   ├── mood-atlas/                 # 情绪图谱
│   ├── movie-calendar/             # 真实观影日历
│   ├── movie-compare/              # 电影对比
│   ├── movie-detail-cast/          # 详情演员表子页
│   ├── movie-detail-info/          # 详情基本信息子页
│   ├── movie-favorites/            # 收藏中心
│   ├── movie-form/                 # 新增 / 编辑表单
│   ├── movie-list/                 # Explore 页面
│   ├── movie-random/               # 随机选片
│   ├── movie-recommendations/      # 推荐页
│   ├── movie-review-wall/          # 影评墙
│   ├── movie-stats/                # 统计组件
│   ├── movie-timeline/             # 时间线
│   ├── page-jump-bar/              # 全局页面跳转器
│   ├── recent-history/             # 最近浏览
│   ├── smart-picks/                # 智能选片
│   ├── watch-logs/                 # 观影日志
│   └── watch-plans/                # 待看片单
├── config/
│   └── navigation.ts               # 导航、页面跳转与面包屑元数据
├── data/
│   ├── expanded-movie-catalog.ts   # 远程扩库映射器
│   └── mock-movies.ts              # 种子电影数据
├── models/
│   ├── movie.ts                    # 电影类型
│   ├── review.ts                   # 影评类型
│   ├── viewing-preset.ts           # 智能选片预设模型
│   ├── watch-log.ts                # 观影日志模型
│   └── watch-plan.ts               # 待看片单模型
├── pages/
│   ├── about-page/                 # About 页面
│   ├── dashboard-page/             # Dashboard 页面
│   ├── movie-add-page/             # Add 页面
│   ├── movie-detail-page/          # 详情父页
│   └── movie-list-page/            # Movies 页面
├── services/
│   ├── data-port.service.ts        # 备份 / 恢复
│   ├── logger.service.ts           # 结构化日志输出
│   ├── movie-artwork.service.ts    # 海报匹配
│   ├── movie-state.service.ts      # Movies / About view-model façade
│   ├── movie.service.ts            # 电影状态、扩库、去重与持久化
│   ├── recent-history.service.ts   # 最近浏览
│   ├── review-store.service.ts     # 影评状态管理
│   ├── smart-picks.service.ts      # 智能选片服务
│   ├── watch-log.service.ts        # 观影日志服务
│   └── watch-plan.service.ts       # 待看片单服务
└── utils/
    ├── movie-media.ts              # 海报 / 背景图工具
    ├── movie-query.ts              # Movies 页面查询参数工具
    └── pagination.ts               # 通用分页计算工具
```

## 启动与验证

### 本地启动

```bash
npm install
npm start
```

默认访问：`http://localhost:4200`

### 常用命令

```bash
npm run build
CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe" npm run test -- --watch=false --browsers=ChromeHeadless
```

### 本次实际验证结果

- `npm run build`：通过（存在 Angular bundle budget warning，但不影响产物生成）
- `CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe" npm run test -- --watch=false --browsers=ChromeHeadless`：通过，`12 / 12` 个测试成功
- `lint`：`package.json` 中没有 `lint` 脚本

## 关键实现位置

- [src/app/app.routes.ts](src/app/app.routes.ts)
  - 定义全部顶级页面、详情子页与 404 重定向
- [src/app/config/navigation.ts](src/app/config/navigation.ts)
  - 统一维护顶部导航、增强页导航、面包屑和页面跳转元数据
- [src/app/app.component.html](src/app/app.component.html)
  - 挂载页面导航器、`router-outlet` 与侧栏消息面板
- [src/app/components/page-jump-bar/page-jump-bar.component.ts](src/app/components/page-jump-bar/page-jump-bar.component.ts)
  - 实现全局页面选择、前后页跳转与当前页同步
- [src/app/components/list-pager/list-pager.component.ts](src/app/components/list-pager/list-pager.component.ts)
  - 提供分页、切页和跳页输入的共享交互
- [src/app/services/movie.service.ts](src/app/services/movie.service.ts)
  - 负责片库状态、远程扩库、去重合并与持久化策略
- [src/app/data/expanded-movie-catalog.ts](src/app/data/expanded-movie-catalog.ts)
  - 对多源远程电影数据做清洗与内部结构映射
- [src/app/components/movie-calendar/movie-calendar.component.ts](src/app/components/movie-calendar/movie-calendar.component.ts)
  - 基于 `WatchLogService` 生成真实观影日历视图
- [src/app/components/director-atlas/director-atlas.component.ts](src/app/components/director-atlas/director-atlas.component.ts)
  - 实现导演维度统计与 spotlight 展示
- [src/app/components/mood-atlas/mood-atlas.component.ts](src/app/components/mood-atlas/mood-atlas.component.ts)
  - 实现情绪聚类、唯一会话统计与搜索空态
- [src/app/components/marathon-planner/marathon-planner.component.ts](src/app/components/marathon-planner/marathon-planner.component.ts)
  - 实现时长预算选片与写回待看片单逻辑

## 补充文档

- 交付说明见 [docs/SUBMISSION.md](docs/SUBMISSION.md)
