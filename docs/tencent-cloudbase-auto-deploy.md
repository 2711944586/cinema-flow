# CinemaFlow 腾讯云 CloudBase 自动化部署

本文说明如何使用脚本一键部署 CinemaFlow 到腾讯云 CloudBase。脚本会自动完成前端构建、后端 HTTP 云函数部署、静态网站上传，并可在 CloudBase MySQL 已启用时执行数据库建表 SQL。

## 1. 需要获取什么

优先推荐使用浏览器授权登录，不需要保存密钥：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy-cloudbase.ps1
```

如果你想让脚本全程非交互运行，需要腾讯云 API 密钥：

| 凭证 | 获取位置 | 填写位置 |
| --- | --- | --- |
| `SecretId` | https://console.cloud.tencent.com/cam/capi | `deploy/cloudbase.env.local` 的 `TENCENT_SECRET_ID` |
| `SecretKey` | https://console.cloud.tencent.com/cam/capi | `deploy/cloudbase.env.local` 的 `TENCENT_SECRET_KEY` |
| 临时 `Token` | 只有使用 STS 临时密钥时需要 | `deploy/cloudbase.env.local` 的 `TENCENT_TOKEN` |

安全建议：不要把真实密钥发到聊天里，不要提交到 Git。仓库已忽略 `*.env.local` 和 `deploy/*.env.local`。

## 2. 填写配置

复制模板：

```powershell
Copy-Item deploy\cloudbase.env.example deploy\cloudbase.env.local
```

打开 `deploy/cloudbase.env.local`，至少确认这几项：

```text
CLOUDBASE_ENV_ID=constantine-d3gjhwmtz0336c36a
CLOUDBASE_REGION=ap-shanghai
CLOUDBASE_FUNCTION_RUNTIME=Python3.10
CLOUDBASE_FUNCTION_DEPLOY_MODE=zip
CLOUDBASE_API_BASE_URL=
```

你给出的 `constantine-d3gjhwmtz0336c36a` 已经写进模板，脚本默认会部署到这个 CloudBase 环境。

如果你在控制台看到的 HTTP 函数域名不是默认格式，把真实 API 地址填到：

```text
CLOUDBASE_API_BASE_URL=https://你的后端域名/api
```

不填时脚本默认使用：

```text
https://constantine-d3gjhwmtz0336c36a.service.tcloudbase.com/api
```

## 3. 一键部署

在项目根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy-cloudbase.ps1
```

脚本会依次执行：

1. 检查 Node、npm、Python 和 CloudBase CLI。
2. 登录腾讯云。
3. 使用 CloudBase 环境 `constantine-d3gjhwmtz0336c36a`。
4. 打包 Flask 后端依赖。
5. 以 ZIP 直传方式部署 `cinemaflow-api` 为 HTTP 云函数，并确保 `/api` 路由指向该函数。
6. 将 API 地址写入 Angular 的 `runtime-config.js`。
7. 构建 Angular 前端。
8. 上传 `dist/cinema-flow/browser` 到 CloudBase 静态网站托管。
9. 访问 `/api/health` 做部署后检查。

## 4. 新建 CloudBase 环境

如果你不是使用已有环境，而是要新建环境，把 `deploy/cloudbase.env.local` 改成：

```text
CLOUDBASE_ENV_ID=
CLOUDBASE_CREATE_ENV=true
CLOUDBASE_ENV_ALIAS=cinemaflow
CLOUDBASE_PACKAGE=baas_personal
CLOUDBASE_DURATION=1
```

然后执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy-cloudbase.ps1 -CreateEnvironment
```

说明：如果 `CLOUDBASE_ENV_ID` 已填写，脚本会优先部署到已有环境，不会重复创建新环境。

CloudBase 环境创建会产生一个新的环境 ID。若 CLI 输出里没有自动解析出 ID，把控制台里看到的新环境 ID 填回 `CLOUDBASE_ENV_ID` 后再执行部署脚本。

## 5. 数据库建表

脚本支持自动执行数据库 schema：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy-cloudbase.ps1 -DeployDatabaseSchema
```

或在 `deploy/cloudbase.env.local` 中设置：

```text
CLOUDBASE_DEPLOY_DATABASE_SCHEMA=true
```

前提：CloudBase 环境里已经启用 MySQL 实例。当前 CloudBase CLI 可列出 MySQL 实例、查看/修改实例配置、执行 SQL，但帮助信息没有暴露 MySQL 实例创建命令；如果脚本提示没有实例，请先进入 CloudBase 控制台启用 MySQL，再重跑上面的命令。

执行的 SQL 文件是：

```text
docs/database/cloudbase-mysql-schema.sql
```

## 6. 部署后要看哪里

| 项目 | 默认地址或入口 |
| --- | --- |
| CloudBase 控制台 | https://console.cloud.tencent.com/tcb |
| 后端健康检查 | `https://constantine-d3gjhwmtz0336c36a.service.tcloudbase.com/api/health` |
| 静态网站默认域名 | `https://constantine-d3gjhwmtz0336c36a.tcloudbaseapp.com` |
| API 密钥管理 | https://console.cloud.tencent.com/cam/capi |

如果静态网站刷新 `/movies`、`/directors` 等子路由时出现 404，在 CloudBase 静态网站托管里开启 SPA 回退，将未命中路径回退到 `/index.html`。

## 7. 官方资料

- CloudBase CLI 快速开始：https://docs.cloudbase.net/en/cli-v1/quick-start
- CloudBase CLI 安装与登录：https://docs.cloudbase.net/en/cli-v1/install
- HTTP 云函数部署：https://docs.cloudbase.net/en/cli-v1/functions/deploy
- 静态网站托管 CLI 部署：https://docs.cloudbase.net/en/cli-v1/hosting
- 腾讯云 API 密钥说明：https://cloud.tencent.com/document/product/598/40488
- 腾讯云 CloudBase CLI 使用指南：https://cloud.tencent.com/document/product/876/41539
