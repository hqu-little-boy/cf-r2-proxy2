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