# CinemaFlow

CinemaFlow 是一个私人电影资料馆与观影管理系统，采用 Angular 前端与 Flask REST API 后端的前后端分离架构。

## 项目结构

- `src/` Angular 前端
- `cinemaflow-api/` Flask 后端
- `docs/` 汇报文档、架构说明、数据库设计、部署文档
- `scripts/` 构建、部署和文档生成脚本
- `output/` 生成物与导出文件

## 主要入口

- 前端首页：`src/app/pages/dashboard-page`
- 电影库：`src/app/pages/movie-list-page`
- 电影详情：`src/app/pages/movie-detail-page`
- 导演库：`src/app/pages/director-list-page`
- 关于页：`src/app/pages/about-page`

## 线上环境

- 前端地址：https://constantine-d3gjhwmtz0336c36a-1448158108.tcloudbaseapp.com
- 后端 API：https://constantine-d3gjhwmtz0336c36a.service.tcloudbase.com/api
- 健康检查：https://constantine-d3gjhwmtz0336c36a.service.tcloudbase.com/api/health

## 常用命令

```powershell
npm install
npm start
npm run build
npm run deploy:cloudbase
```

## 文档

- [系统汇报](docs/CinemaFlow-系统汇报.md)
- [讲解视频稿](docs/CinemaFlow-讲解视频讲稿.md)
- [架构说明](docs/architecture.md)
- [腾讯云自动部署](docs/tencent-cloudbase-auto-deploy.md)
- [期末汇报提交说明](docs/SUBMISSION.md)
