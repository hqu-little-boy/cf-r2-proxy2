# Cloudflare R2 Proxy

Cloudflare Worker to proxy R2 storage access and prevent direct link abuse.

## Features

- Authentication via secret key for protected files
- Rate limiting to prevent abuse
- MIME type detection (now supporting .sqlite, .db, .exe, .dll, .lib and more)
- Security headers
- Content disposition control
- Input validation to prevent directory traversal

## 部署方式

### 方法一：通过 GitHub 在 Cloudflare 网页中部署（推荐）

1. 将此项目代码上传到您的 GitHub 仓库
2. 登录 Cloudflare 控制面板
3. 选择 "Workers & Pages" -> "Create application" -> "Workers" -> "Connect to Git"
4. 连接您的 GitHub 账户并选择仓库
5. 在设置中配置环境变量和 R2/KV 绑定
6. 点击 "Save and Deploy"

**配置说明：**
- 构建命令使用：`npm install`（避免部署命令中的配置错误）
- 需要在 Cloudflare 控制台中配置的环境变量包括：
  - `R2_BUCKET_NAME`: 您的 R2 存储桶名称
  - `PROXY_SECRET`: 访问密钥（非常重要，请使用强密码）
  - `RATE_LIMIT_WINDOW`: 速率限制窗口（可选，默认为 900）
  - `MAX_REQUESTS_PER_WINDOW`: 最大请求数（可选，默认为 100）

**服务绑定（在 Cloudflare 控制台中配置）：**
- R2 绑定: 变量名 `R2_BUCKET`，绑定到您的 R2 存储桶
- KV 绑定: 变量名 `RATE_LIMIT_KV`，绑定到您的 KV 命名空间

**优势：**
- 避免了账户 ID 和 Worker 名称不匹配的错误
- 配置信息在 Cloudflare 控制台中管理，更安全
- 无需在代码中存储敏感信息

### 方法二：命令行部署

运行 `wrangler deploy` 命令进行部署

## 使用方法

### 公开文件访问:
```
https://your-worker.your-subdomain.workers.dev/path/to/file
```

### 受保护文件访问:
```
https://your-worker.your-subdomain.workers.dev/protected/path/to/file?secret=your-secret-key
```

## Supported File Types

- Images: jpg, jpeg, png, gif, svg, webp, ico
- Documents: pdf, doc, docx, txt, html, css, js
- Video: mp4, webm, ogg
- Audio: mp3, wav, flac, aac
- Archives: zip, csv
- Databases: sqlite, db
- Executables: exe, dll, lib