# Cloudflare R2 代理配置说明

## 部署后配置步骤

在通过网页将项目部署到 Cloudflare Workers 后，您需要完成以下配置步骤：

### 1. 配置 R2 绑定

这是最重要的步骤，需要将您的 R2 存储桶与 Worker 连接：

1. 登录 Cloudflare 控制面板
2. 进入 "Workers & Pages" → 选择您部署的 worker
3. 点击 "Settings" 选项卡
4. 向下滚动到 "R2 Bindings" 部分
5. 点击 "Add binding"
6. 填写以下信息：
   - **Variable name**: `R2_BUCKET` （必须与此完全相同）
   - **Bucket name**: 您的 R2 存储桶名称
7. 点击 "Save and deploy"

### 2. 验证配置

配置完成后，您可以进行以下测试：

1. 访问 `https://your-worker.your-subdomain.workers.dev/`
   - 如果显示 "R2 Proxy Worker is running. Access your R2 files via /path/to/file"，说明 Worker 工作正常
   - 如果显示 "R2 binding not configured. Please check your worker settings."，说明 R2 绑定未正确设置

2. 访问 R2 存储桶中的一个文件：
   - 例如 `https://your-worker.your-subdomain.workers.dev/path/to/your/file.jpg`
   - 如果能正常访问，说明配置成功

### 3. 关于配置文件

**重要说明**：我们的 `wrangler.toml` 文件中没有预设 bucket 名称，这是为了确保部署可以成功进行。R2 绑定将在 Cloudflare 仪表板中完成，而不是通过配置文件完成。

如果您希望在配置文件中指定 bucket 名称（可选），可以修改 `wrangler.toml` 文件：

```toml
name = "cf-r2-proxy"
main = "src/index.js"
compatibility_date = "2023-07-01"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "your-actual-bucket-name"
```

但是，如果您直接在配置文件中指定 bucket 名称，必须确保该名称在您账户中确实存在，否则部署将失败。

### 4. 故障排除

如果遇到问题，请检查：

- R2 存储桶名称是否正确
- R2 绑定变量名是否为 `R2_BUCKET`
- 存储桶中是否存在请求的文件
- Worker 是否已重新部署（在添加 R2 绑定后会自动部署）

### 5. 安全说明

- 此代理提供公开访问，不需密钥
- 通过代理访问的文件将对外公开
- 请确保只将需要公开的文件存储在关联的 R2 存储桶中
- 这种方法可以防止直接暴露 R2 存储桶 URL，从而避免潜在的流量滥用