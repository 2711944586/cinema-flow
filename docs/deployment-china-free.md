# CinemaFlow 腾讯云 CloudBase 免费部署操作手册

本文只写部署，不写系统汇报内容。目标是把当前项目部署到腾讯云开发 CloudBase：前端用静态网站托管，后端用 Python HTTP 云函数，数据库用 CloudBase MySQL。按低频课程演示或个人展示访问量计算，CloudBase 免费体验环境的资源点通常足够维持一个月以上。

## 1. 最终方案

| 部分 | 使用服务 | 本项目对应内容 |
| --- | --- | --- |
| 前端 | CloudBase 静态网站托管 | `dist/cinema-flow/browser` |
| 后端 | CloudBase Python HTTP 云函数 | `cinemaflow-api/` |
| 数据库 | CloudBase MySQL | `docs/database/cloudbase-mysql-schema.sql` |
| API 配置 | 前端运行时配置 | `src/assets/runtime-config.js` |
| 部署脚本 | PowerShell 脚本 | `scripts/build-cloudbase-frontend.ps1`、`scripts/prepare-cloudbase-function.ps1` |

CloudBase CLI 当前官方包是 `@cloudbase/cli`，可执行命令是 `tcb` 或 `cloudbase`。下面统一使用 `tcb`。

## 2. 需要提前准备

### 2.1 腾讯云准备

1. 注册腾讯云账号。
2. 完成实名认证。
3. 打开腾讯云开发 CloudBase 控制台。
4. 创建一个免费体验环境。
5. 记录环境 ID，例如：

```text
cinemaflow-xxxxxx
```

下面命令统一用 `<ENV_ID>` 表示这个环境 ID。实际执行时要替换成自己的环境 ID。

### 2.2 本地工具准备

在 Windows PowerShell 里执行：

```powershell
node -v
npm -v
python --version
git --version
```

如果某个命令不存在，先安装：

| 工具 | 建议版本 | 用途 |
| --- | --- | --- |
| Node.js | 20 LTS 或更高 | 安装依赖、构建 Angular、运行 CloudBase CLI |
| Python | 3.10 或 3.11 | 打包 Flask 依赖 |
| Git | 最新稳定版 | 拉取和管理项目 |

安装 CloudBase CLI：

```powershell
npm install -g @cloudbase/cli
tcb --version
```

登录腾讯云：

```powershell
tcb login
```

登录后浏览器会打开授权页面，按提示确认即可。

## 3. 拉取并检查项目

如果是从远程仓库重新部署，执行：

```powershell
git clone https://github.com/2711944586/cinema-flow.git
cd cinema-flow
```

如果已经在项目目录，直接进入项目根目录：

```powershell
cd D:\DATA\experiment\cinema-flow
```

安装前端依赖并跑一次构建：

```powershell
npm install
npm run build
```

安装后端依赖并本地检查：

```powershell
cd cinemaflow-api
python -m pip install -r requirements.txt
$env:PORT="9000"
python app.py
```

另开一个 PowerShell，访问健康检查：

```powershell
curl http://127.0.0.1:9000/api/health
```

看到类似结果就说明后端入口正常：

```json
{"service":"CinemaFlow API","status":"ok"}
```

回到项目根目录：

```powershell
cd ..
```

## 4. 创建 CloudBase MySQL 数据库

进入 CloudBase 控制台：

1. 选择刚创建的环境。
2. 打开数据库或 MySQL 数据库功能。
3. 创建 MySQL 实例。
4. 创建数据库，名称建议：

```text
cinemaflow
```

5. 找到 SQL 执行入口。
6. 打开项目里的 SQL 文件：

```text
docs/database/cloudbase-mysql-schema.sql
```

7. 将全文复制到 SQL 执行窗口并执行。

执行成功后至少应看到这些表：

```text
users
directors
movies
genres
movie_genres
people
movie_people
media_assets
user_movie_states
reviews
watch_plans
watch_logs
watch_log_moods
recent_history
smart_pick_presets
audit_logs
```

当前 Flask 演示后端仍使用 JSON 文件作为轻量数据源，MySQL 主要用于课程要求里的数据库部署和后续持久化扩展。如果要把写接口完全切到 MySQL，需要继续增加 SQLAlchemy repository 层。

## 5. 打包后端 HTTP 云函数

项目已经准备好 CloudBase 所需入口：

| 文件 | 作用 |
| --- | --- |
| `cinemaflow-api/app.py` | Flask 应用入口，监听 `PORT`，默认 9000 |
| `cinemaflow-api/scf_bootstrap` | CloudBase HTTP 函数启动脚本 |
| `cinemaflow-api/requirements.txt` | Python 依赖 |
| `scripts/prepare-cloudbase-function.ps1` | 安装依赖到 `third_party` 并打 ZIP 包 |

在项目根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\prepare-cloudbase-function.ps1
```

成功后会生成：

```text
output/deploy/cinemaflow-api-cloudbase.zip
```

如果遇到 Python 依赖安装慢，重新执行即可。

默认脚本会按 CloudBase Linux + Python 3.10 运行时下载 `manylinux2014_x86_64` 依赖包。如果控制台只能选择 Python 3.11，可这样打包：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\prepare-cloudbase-function.ps1 `
  -TargetPythonVersion 3.11 `
  -TargetAbi cp311
```

## 6. 部署后端 HTTP 云函数

### 6.1 推荐：控制台上传 ZIP

进入 CloudBase 控制台：

1. 选择环境 `<ENV_ID>`。
2. 打开云函数。
3. 新建函数。
4. 函数名称填写：

```text
cinemaflow-api
```

5. 类型选择 HTTP 云函数。
6. 运行环境选择 Python 3.10 或 Python 3.11。
7. 上传 `output/deploy/cinemaflow-api-cloudbase.zip`。
8. 启动文件使用项目内的 `scf_bootstrap`。
9. 端口保持 9000。
10. 内存选择 256 MB 或 512 MB。
11. 超时时间选择 10 秒。

环境变量建议先填：

```text
PORT=9000
CORS_ORIGINS=*
CINEMAFLOW_DATA_FILE=/tmp/cinemaflow-data.json
```

说明：

- 第一次联调可以先用 `CORS_ORIGINS=*`，确保前端能调用。
- 正式展示时建议改成前端静态托管域名，例如 `https://你的前端域名`。
- `/tmp/cinemaflow-data.json` 适合演示读写，但云函数本地文件不适合当长期数据库。长期持久化应使用 MySQL。

### 6.2 可选：CLI 部署

CloudBase CLI 支持部署 HTTP 云函数。先确认命令可用：

```powershell
tcb fn deploy --help
```

从项目根目录执行：

```powershell
tcb fn deploy cinemaflow-api `
  --env-id <ENV_ID> `
  --dir cinemaflow-api `
  --httpFn `
  --path /api `
  --runtime Python3.10 `
  --force
```

如果 CLI 提示 Python 运行时名称不支持，进入控制台看当前环境支持的运行时，改成 `Python3.9`、`Python3.10` 或控制台提供的对应名称。

## 7. 配置 API 访问地址

函数部署完成后，在控制台找到 HTTP 访问地址，通常形如：

```text
https://xxxxxxxx.service.tcloudbase.com/api
```

检查健康接口：

```powershell
curl https://你的后端域名/api/health
```

期望返回：

```json
{"service":"CinemaFlow API","status":"ok"}
```

如果返回 404，优先检查：

- HTTP 函数是否启用。
- 路由是否是 `/api`。
- 是否开启路径透传。
- Flask 代码中健康检查路径是否是 `/api/health`。

如果需要用 CLI 增加 HTTP 路由，可先查看帮助：

```powershell
tcb routes add --help
```

路由需要绑定具体域名。域名可以在 CloudBase HTTP 服务或静态托管控制台里查看。

## 8. 构建前端并写入后端地址

把后端 API 根地址保存成变量：

```powershell
$API_BASE_URL="https://你的后端域名/api"
```

构建前端：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-cloudbase-frontend.ps1 -ApiBaseUrl $API_BASE_URL
```

脚本会完成两件事：

1. 执行 `npm install` 和 `npm run build`。
2. 把 API 地址写入：

```text
dist/cinema-flow/browser/assets/runtime-config.js
```

检查配置是否正确：

```powershell
Get-Content dist\cinema-flow\browser\assets\runtime-config.js
```

应看到：

```js
window.__CINEMAFLOW_CONFIG__ = {
  apiBaseUrl: 'https://你的后端域名/api'
};
```

## 9. 上传前端静态资源

确认静态托管服务已开启后，在项目根目录执行：

```powershell
tcb hosting deploy dist\cinema-flow\browser -e <ENV_ID>
```

上传完成后，打开 CloudBase 静态网站托管默认域名。

如果直接访问 `/movies`、`/directors`、`/about` 刷新后出现 404，需要在控制台配置 SPA 回退：

```text
所有未命中的路径回退到 /index.html
```

不同控制台版本入口名称可能叫“路由配置”“错误页配置”“单页应用回退”或“重写规则”。核心目的只有一个：Angular 路由由浏览器接管，服务端找不到真实文件时返回 `index.html`。

## 10. 重新收紧跨域配置

前端域名能打开后，复制前端域名，例如：

```text
https://cinemaflow-xxxx.tcloudbaseapp.com
```

回到云函数环境变量，把：

```text
CORS_ORIGINS=*
```

改成：

```text
CORS_ORIGINS=https://cinemaflow-xxxx.tcloudbaseapp.com
```

保存并重新部署或重启函数。

## 11. 最终验证清单

逐项检查：

| 检查项 | 操作 | 通过标准 |
| --- | --- | --- |
| 后端健康检查 | 打开 `/api/health` | 返回 `status=ok` |
| 前端首页 | 打开静态托管域名 | 仪表盘正常显示 |
| 电影库 | 打开 `/movies` | 电影列表、搜索、筛选正常 |
| 导演库 | 打开 `/directors` | 导演头像和作品信息正常 |
| 电影详情 | 打开任一电影详情 | 海报、背景、评分、演员表正常 |
| 导演详情 | 打开任一导演详情 | 导演资料和作品列表正常 |
| 刷新路由 | 在 `/movies` 页面刷新 | 不出现 404 |
| 跨域 | 打开浏览器控制台 | 没有 CORS 报错 |
| 静态资源 | 查看 Network | `runtime-config.js` 加载成功 |
| 免费额度 | 查看 CloudBase 用量 | 资源点没有异常增长 |

## 12. 常见问题处理

### 12.1 云函数启动失败

检查 `scf_bootstrap` 是否存在于 ZIP 根目录。ZIP 内应该直接看到：

```text
app.py
models.py
requirements.txt
scf_bootstrap
routes/
third_party/
```

不要把整个 `cinemaflow-api` 文件夹套在 ZIP 最外层。

### 12.2 提示找不到 Flask

重新打包：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\prepare-cloudbase-function.ps1
```

确认 ZIP 中存在 `third_party/flask` 或相应 Flask 包目录。

### 12.3 前端能打开但没有后端数据

检查 `runtime-config.js`：

```powershell
Get-Content dist\cinema-flow\browser\assets\runtime-config.js
```

确认 `apiBaseUrl` 是后端地址，并且末尾包含 `/api`。

### 12.4 浏览器报 CORS

先临时设置：

```text
CORS_ORIGINS=*
```

确认能通后，再改成真实前端域名。

### 12.5 刷新子路由 404

配置静态托管 SPA 回退到：

```text
/index.html
```

然后重新打开：

```text
/movies
/directors
/about
```

### 12.6 免费额度不够

降低资源消耗：

- 不上传大图到云存储。
- 继续使用 TMDB、Wikimedia 等远程图片 URL。
- 不做压力测试。
- 云函数内存先用 256 MB。
- 保持演示访问频率。
- 到期前进入 CloudBase 控制台续期免费体验环境。

## 13. 一条线部署命令汇总

把 `<ENV_ID>` 和 `<API_BASE_URL>` 换成自己的真实值：

```powershell
npm install -g @cloudbase/cli
tcb login

npm install
npm run build

powershell -ExecutionPolicy Bypass -File scripts\prepare-cloudbase-function.ps1

tcb fn deploy cinemaflow-api `
  --env-id <ENV_ID> `
  --dir cinemaflow-api `
  --httpFn `
  --path /api `
  --runtime Python3.10 `
  --force

powershell -ExecutionPolicy Bypass -File scripts\build-cloudbase-frontend.ps1 -ApiBaseUrl <API_BASE_URL>

tcb hosting deploy dist\cinema-flow\browser -e <ENV_ID>
```

最后进入 CloudBase 控制台补齐三件事：

1. MySQL 执行 `docs/database/cloudbase-mysql-schema.sql`。
2. 静态托管开启 SPA 回退到 `/index.html`。
3. 云函数 `CORS_ORIGINS` 改成真实前端域名。

## 14. 官方资料

- CloudBase CLI：`https://www.npmjs.com/package/@cloudbase/cli`
- CloudBase CLI 函数部署：`https://docs.cloudbase.net/cli-v1/functions/deploy`
- CloudBase CLI 静态托管：`https://docs.cloudbase.net/cli-v1/hosting`
- CloudBase Flask 示例：`https://docs.cloudbase.net/cloud-function/frameworks-examples/flask`
- CloudBase Python HTTP 云函数：`https://docs.cloudbase.net/cloud-function/quickstart/httpfunc/python`
- CloudBase 静态网站托管：`https://docs.cloudbase.net/hosting/quick-start`
- CloudBase MySQL 数据库：`https://docs.cloudbase.net/database/configuration/db/tdsql/initialization`
- CloudBase 价格与免费体验：`https://cloud.tencent.com/document/product/876/75213`
