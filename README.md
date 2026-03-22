# CinemaFlow 电影库管理系统

基于 **Angular 17** Standalone Components 构建的电影管理平台，覆盖电影浏览、收藏、分析、对比、时间线、随机选片、观影日历与影评墙等场景。

## 核心能力

| 模块 | 描述 |
|------|------|
| **探索影库** | Hero Banner + 电影网格，支持搜索、分类、排序、收藏筛选 |
| **新增 / 编辑电影** | 表单录入影片信息，自动校验真实电影海报后才允许保存 |
| **电影详情** | 展示剧情、演员、评分、预告片、笔记与相关推荐 |
| **收藏中心** | 管理个人收藏与已观看状态 |
| **数据看板** | 统计影片总数、评分分布、年代分布、导演排行 |
| **分类推荐** | 按类型与导演查看推荐电影 |
| **电影时间轴** | 以时间线形式浏览影片上映年代 |
| **随机选片** | 一键抽片，保留近期抽片历史 |
| **电影对比** | 对比两部电影的评分、时长、类型和其他信息 |
| **观影日历** | 以日历形式浏览片单与观影节奏 |
| **影评墙** | 查看与录入观影短评 |

## 真实海报规则

- 片库内置 **48 部真实电影**，海报不再使用伪造占位数据。
- 已失效的海报地址已替换为真实可访问资源。
- 新增或编辑电影时，会根据 **片名 + 导演 + 上映日期** 自动匹配真实海报。
- 若未匹配到真实海报，条目不能保存，避免继续写入假电影或假海报。
- 海报资源目前来自 **TMDB** 与 **Wikimedia / Wikipedia** 的真实电影物料。

## 技术栈

- Angular 17.3
- Angular Material 17.3 + CDK
- RxJS
- TypeScript 5.4
- SCSS

## 路由

| 路径 | 页面 |
|------|------|
| `/explore` | 探索影库 |
| `/dashboard` | 数据看板 |
| `/favorites` | 收藏中心 |
| `/timeline` | 电影时间轴 |
| `/recommendations` | 分类推荐 |
| `/random` | 随机选片 |
| `/compare` | 电影对比 |
| `/calendar` | 观影日历 |
| `/reviews` | 影评墙 |

## 项目结构

```text
src/app/
├── components/
│   ├── movie-calendar/        # 观影日历
│   ├── movie-compare/         # 电影对比
│   ├── movie-dashboard/       # 数据看板入口
│   ├── movie-detail/          # 电影详情
│   ├── movie-favorites/       # 收藏中心
│   ├── movie-form/            # 新增 / 编辑表单
│   ├── movie-list/            # 主探索页
│   ├── movie-random/          # 随机选片
│   ├── movie-recommendations/ # 分类推荐
│   ├── movie-review-wall/     # 影评墙
│   ├── movie-stats/           # 统计组件
│   └── movie-timeline/        # 时间轴页
├── data/
│   └── mock-movies.ts         # 48 部电影种子数据
├── models/
│   └── movie.ts               # Movie 接口定义
├── pipes/
│   └── rating-level.pipe.ts   # 评分等级管道
├── services/
│   ├── logger.service.ts      # 日志服务
│   ├── movie-artwork.service.ts # 真实海报匹配服务
│   └── movie.service.ts       # 电影数据状态管理
└── utils/
    └── movie-media.ts         # 海报 / 背景图辅助逻辑
```

## 启动方式

```bash
npm install
npm start
```

本地访问 `http://localhost:4200`

## 常用命令

```bash
npm run build
npm run test
```

## 架构说明

- **状态管理**: `MovieService` 使用 `BehaviorSubject` 管理全局电影数据。
- **响应式更新**: 各组件通过 Observable 或服务方法消费统一数据源。
- **独立组件**: 全项目采用 Standalone Components，无需 NgModule。
- **媒体校验**: `MovieArtworkService` 负责真实电影海报匹配与兜底校验。
- **展示兜底**: 图片加载失败时统一走前端降级逻辑，避免空白卡片。
