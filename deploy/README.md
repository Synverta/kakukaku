# kakukaku.cn 部署说明

## 端口规划
- `6001` — nginx，前端静态文件 + `/api`、`/uploads` 反向代理
- `6002` — kakukaku-server（Express + PostgreSQL）

## 服务端目录布局
```
/var/www/kakukaku/dist/        # 前端构建产物（nginx root）
/opt/kakukaku-server/
  ├─ .env                      # 生产环境变量（含真实密钥；不进 git）
  ├─ package.json
  ├─ node_modules/
  ├─ dist/index.js             # esbuild 打包产物
  └─ sql/schema.sql            # 数据库 schema
```

## 部署步骤（在生产机器上执行）

```bash
# 1. 拉取最新代码
cd /opt/kakukaku-server && git pull origin main

# 2. 安装依赖
npm ci --omit=dev

# 3. 写入生产环境变量（首次部署）
cp .env.example .env
vim .env   # 填入 DATABASE_URL / JWT_SECRET 等真实值

# 4. 迁移数据库（仅首次或 schema 变更时）
npx tsx src/migrate.ts
# 或在装了 esbuild 的环境里：
node -e "require('dotenv/config'); const fs=require('fs'); const sql=fs.readFileSync('sql/schema.sql','utf8'); const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}); p.query(sql).then(()=>{console.log('migrated'); return p.end()}).catch(e=>{console.error(e); process.exit(1)});"

# 5. 打包后端
npx esbuild src/index.ts --bundle --platform=node --target=node20 \
  --format=esm --packages=external \
  --banner:js="import { createRequire as __crq } from 'module'; const require = __crq(import.meta.url);" \
  --outfile=dist/index.js

# 6. 构建前端（在本地或 CI 完成，再 rsync dist/ 到服务器）
npm run build
rsync -avz --delete dist/ user@kakukaku.cn:/var/www/kakukaku/dist/

# 7. 安装 systemd 服务
sudo cp deploy/server/kakukaku-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kakukaku-server

# 8. 安装 nginx 站点
sudo cp deploy/nginx/kakukaku.cn.conf /etc/nginx/conf.d/
sudo nginx -t && sudo nginx -s reload

# 9. 申请 HTTPS 证书（首次部署）
sudo certbot --nginx -d kakukaku.cn -d www.kakukaku.cn \
  --non-interactive --agree-tos -m admin@synverta.org --redirect
# certbot 会自动改写 /etc/nginx/conf.d/kakukaku.cn.conf，加入 443 server block
# 并把 :80 的请求 301 到 https。
```

## 健康检查
```bash
curl -fsS http://127.0.0.1:6002/api/health        # 直连后端
curl -fsS http://127.0.0.1:6001/api/health        # 经 nginx
curl -fsS https://kakukaku.cn/api/health          # 走 HTTPS
curl -fsS https://kakukaku.cn/                     # 站点首页（应含 ICP 备案链接）
```