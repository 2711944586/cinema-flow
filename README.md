# CinemaFlow 电影库管理系统

基于 **Angular 17** Standalone Components 构建的电影管理平台，提供影库浏览、收藏管理、数据分析等功能。

## 功能概览

| 模块 | 描述 |
|------|------|
| **探索影库** | Hero Banner + 电影网格，支持搜索/分类/排序/收藏筛选 |
| **收藏中心** | 管理个人收藏电影，统计收藏数据 |
| **分类推荐** | 按类型和导演分组浏览，发现更多好片 |
| **电影时间轴** | 按年代可视化展示电影发行时间线 |
| **数据看板** | 核心指标 + 类型/评分/年代分布 + 导演排行 |
| **电影详情** | 完整信息展示 + 用户评分 + 观影笔记 + 智能推荐 |
| **随机选片** | 快速抽选日期随机电影，支持历史抽选记录 |
| **电影对比** | 选择两部电影进行多维度数据对比 |

## 技术栈

- Angular 17.3 (Standalone Components)
- Angular Material 17.3 + CDK
- SCSS + 暗色主题
- RxJS 响应式状态管理
- TypeScript 5.4

## 项目结构

```
src/app/
├── components/
│   ├── movie-list/            # 主探索页
│   ├── movie-detail/          # 详情模态框
│   ├── movie-dashboard/       # 数据看板入口
│   ├── movie-stats/           # 统计仪表板
│   ├── movie-favorites/       # 收藏中心
│   ├── movie-timeline/        # 时间轴页
│   ├── movie-recommendations/ # 分类推荐页
│   ├── movie-random/          # 随机选片
│   └── movie-compare/         # 电影对比
├── data/
│   └── mock-movies.ts         # 24部电影数据 (TMDB 海报)
├── models/
│   └── movie.ts               # Movie 接口定义
├── pipes/
│   └── rating-level.pipe.ts   # 评分等级管道
└── services/
    └── movie.service.ts       # 数据管理服务
```

## 启动方式

```bash
npm install
npm start
```

浏览器访问 `http://localhost:4200`

## 架构说明

- **Service 层**: MovieService 使用 BehaviorSubject + 不可变更新模式管理全局状态
- **响应式订阅**: 组件通过 Observable 订阅数据变更
- **Standalone Components**: 按需导入，无 NgModule
- **图片来源**: 电影海报和背景图来自 TMDB 公开数据
