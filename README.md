# CinemaFlow

CinemaFlow 是一套私人电影资料馆应用，前端使用 Angular 17 Standalone Components、Angular Material 与 SCSS，后端使用 Flask 提供电影和导演 REST API。项目覆盖片库管理、导演档案、观影计划、观影日志、推荐、数据备份和媒体完整度审计。

![CinemaFlow 仪表盘](docs/screenshots/dashboard.png)

## 一键启动

Windows 下直接运行：

```bat
start.bat
```

脚本会完成以下工作：

- 检查 Node.js、npm 与 Python
- 安装前端依赖与 Flask 依赖
- 从 `5000` 开始查找可用 API 端口
- 从 `4200` 开始查找可用前端端口
- 写入临时代理配置 `.runtime-proxy.conf.json`
- 分别启动 Flask API 与 Angular Dev Server

端口被占用时会自动向后切换，例如 `4200` 被占用则使用 `4201`。前端统一访问 `/api`，由启动脚本代理到实际后端端口。

## 手动启动

```bash
cd cinemaflow-api
python -m pip install -r requirements.txt
python app.py
```

```bash
npm install
npm run start -- --proxy-config .runtime-proxy.conf.json
```

如果不使用 `start.bat`，需要自行准备代理配置或让前端通过同源 API 访问后端。

## 功能地图

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 仪表盘 | `/dashboard` | 片库状态、最近浏览、最近添加与快速入口 |
| 电影库 | `/movies` | 搜索、筛选、排序、分页、表格/网格切换 |
| 分类浏览 | `/movies/genre/:genre` | 类型路由与列表筛选同步 |
| 电影详情 | `/movies/:id/info` | 电影详情、收藏、已看状态、相邻电影与推荐 |
| 演员表 | `/movies/:id/cast` | 演员表子页面 |
| 添加电影 | `/add` | 新增电影，带编辑模式守卫和真实海报校验 |
| 导演库 | `/directors` | 导演实体列表、搜索与作品入口 |
| 导演详情 | `/directors/:id` | 导演档案、作品列表、上一位/下一位导航 |
| 探索影库 | `/explore` | 高分优先的沉浸式浏览、筛选、排序与分页 |
| 收藏中心 | `/favorites` | 收藏与已观看影片回看 |
| 时间线 | `/timeline` | 按年代查看片库分布 |
| 推荐 | `/recommendations` | 按导演和类型输出推荐 |
| 随机选片 | `/random` | 随机选片与抽选历史 |
| 电影对比 | `/compare` | 两部电影并列对比 |
| 观影日历 | `/calendar` | 观影日志月历、年度热度与当日记录 |
| 影评墙 | `/reviews` | 影评墙、录入、筛选、排序与分页 |
| 待看片单 | `/watch-plans` | 待看片单、优先级、排期和状态管理 |
| 观影日志 | `/watch-logs` | 日期、地点、陪伴对象、评分和情绪标签 |
| 智能选片 | `/smart-picks` | 基于预设条件推荐下一部电影 |
| 导演图谱 | `/director-atlas` | 按导演聚合作品数量、均分和观看进度 |
| 情绪图谱 | `/mood-atlas` | 按情绪标签聚合观影记录 |
| 连看规划 | `/marathon` | 按时长预算组合连看片单 |
| 偏好画像 | `/taste-dna` | 已看、收藏、评分、影评与日志偏好画像 |
| 氛围策展 | `/scene-board` | 按视觉气质重组片库 |
| 片库审计 | `/archive-health` | 审计媒体 URL、简介、演员表和关键字段 |
| 关于 | `/about` | 服务状态、技术栈、日志、数据管理 |

## 新增独立功能

偏好画像汇总已看、收藏、个人评分、影评和观影日志，展示类型、导演、语言、年代与偏好盲区。

![偏好画像](docs/screenshots/taste-dna.png)

氛围策展按视觉气质组织电影，适合主题策展和快速选片。

![氛围策展](docs/screenshots/scene-board.png)

片库审计检查海报、背景图、简介、演员表、语言和关键字段，给出优先修复清单。

![片库审计](docs/screenshots/archive-health.png)

## 媒体与数据

- 电影种子数据位于 `src/app/data/`
- Flask 持久化数据位于 `cinemaflow-api/cinemaflow-data.json`
- 扩展片库只接收标题、导演、年份完整且年份不晚于当前年份的真实电影条目
- 海报和背景优先使用真实远程图片 URL
- 不稳定图片源会被过滤
- 图片加载失败时才使用前端兜底图
- 导出 JSON 包含电影、最近浏览、影评、待看片单、观影日志和智能选片预设

## 截图索引

| 截图 | 页面说明 |
| --- | --- |
| `docs/screenshots/dashboard.png` | 仪表盘全局概览 |
| `docs/screenshots/movies.png` | 电影库标准列表 |
| `docs/screenshots/movies-search-inception.png` | 搜索状态 |
| `docs/screenshots/movies-genre-sci-fi.png` | 类型路由 |
| `docs/screenshots/movie-detail-info.png` | 电影详情信息页 |
| `docs/screenshots/movie-detail-cast.png` | 演员表子页 |
| `docs/screenshots/add.png` | 添加电影页 |
| `docs/screenshots/directors.png` | 导演库 |
| `docs/screenshots/director-detail.png` | 导演详情 |
| `docs/screenshots/explore.png` | 探索页 |
| `docs/screenshots/favorites.png` | 收藏中心 |
| `docs/screenshots/timeline.png` | 时间线 |
| `docs/screenshots/recommendations.png` | 推荐页 |
| `docs/screenshots/random.png` | 随机选片 |
| `docs/screenshots/compare.png` | 电影对比 |
| `docs/screenshots/calendar.png` | 观影日历 |
| `docs/screenshots/reviews.png` | 影评墙 |
| `docs/screenshots/watch-plans.png` | 待看片单 |
| `docs/screenshots/watch-logs.png` | 观影日志 |
| `docs/screenshots/smart-picks.png` | 智能选片 |
| `docs/screenshots/director-atlas.png` | 导演图谱 |
| `docs/screenshots/mood-atlas.png` | 情绪图谱 |
| `docs/screenshots/marathon.png` | 连看片单 |
| `docs/screenshots/taste-dna.png` | 偏好画像 |
| `docs/screenshots/scene-board.png` | 氛围策展 |
| `docs/screenshots/archive-health.png` | 片库审计 |
| `docs/screenshots/about.png` | 关于与数据管理 |
| `docs/screenshots/command-palette.png` | 命令面板 |
| `docs/screenshots/recent-history.png` | 最近浏览区域 |
| `docs/screenshots/data-management.png` | 数据管理区域 |

## 项目结构

```text
cinemaflow-api/
  app.py
  models.py
  routes/
    directors.py
    movies.py

src/app/
  app.component.*
  app.routes.ts
  components/
  config/
  data/
  guards/
  models/
  pages/
  services/
  utils/
```

## 验证

本次更新执行：

```bash
npm run build
npm test -- --watch=false --browsers=ChromeHeadless
```

构建通过，单元测试通过。Angular 仍保留既有 bundle budget warning，不影响本地运行。
