# Kong Configuration Guide for AURA

## Cấu hình Kong cho AURA

Kong được dùng làm API Gateway để proxy các backend services và thêm các tính năng như rate limiting, CORS, authentication.

### Các file cấu hình:

1. **kong-declarative.yml** - Cấu hình declarative (IaC)
2. **docker-compose.yml** - Cấu hình Docker (đã cập nhật)

### Cách setup Kong:

#### 1. Khởi động Kong với Declarative Config

```bash
docker-compose up -d kong
```

Kong sẽ tự động load `kong-declarative.yml` và apply cấu hình.

#### 2. Kiểm tra Kong Admin API

```powershell
# Test Kong Admin API
Invoke-WebRequest -Uri "http://localhost:8001/services" | ConvertFrom-Json

# Hoặc dùng curl
curl http://localhost:8001/services
```

#### 3. Verify Services & Routes được tạo

```powershell
# Xem tất cả services
Invoke-WebRequest -Uri "http://localhost:8001/services" -ErrorAction SilentlyContinue | ConvertFrom-Json | Select-Object -ExpandProperty data

# Xem tất cả routes
Invoke-WebRequest -Uri "http://localhost:8001/routes" -ErrorAction SilentlyContinue | ConvertFrom-Json | Select-Object -ExpandProperty data

# Xem tất cả plugins
Invoke-WebRequest -Uri "http://localhost:8001/plugins" -ErrorAction SilentlyContinue | ConvertFrom-Json | Select-Object -ExpandProperty data
```

### Routing Rules đã cấu hình:

| Service     | Kong Path                       | Backend URL                   | Port |
| ----------- | ------------------------------- | ----------------------------- | ---- |
| Backend API | `http://localhost:8003/api`     | `http://backend:5000`         | 8003 |
| AI Core     | `http://localhost:8003/aicore`  | `http://aicore:8000`          | 8003 |
| Swagger     | `http://localhost:8003/swagger` | `http://backend:5000/swagger` | 8003 |

### Plugins được kích hoạt:

1. **CORS** - Cho phép frontend call backend từ domains khác
2. **Rate Limiting** - Giới hạn 1000 requests/phút, 10000 requests/giờ
3. **Request Transformer** - Thêm headers (X-Gateway, X-Timestamp)

### Cách sử dụng Kong:

#### Test qua Kong Gateway:

```powershell
# Test Backend API health
Invoke-WebRequest -Uri "http://localhost:8003/api/health"

# Test AI Core health
Invoke-WebRequest -Uri "http://localhost:8003/aicore/health"

# Test Swagger
Invoke-WebRequest -Uri "http://localhost:8003/swagger"

# Test backend login
$body = @{
    email = "test@aura.com"
    password = "Test123!@#"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8003/api/auth/login" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body
```

### Thay đổi cấu hình Kong:

#### Cách 1: Edit kong-declarative.yml và restart

```powershell
# Edit file kong-declarative.yml
# Restart Kong
docker-compose restart kong

# Đợi Kong reload config (khoảng 5-10 giây)
Start-Sleep -Seconds 10
```

#### Cách 2: Dùng Kong Admin API (Runtime)

```powershell
# Thêm service mới
$body = @{
    name = "new-service"
    url = "http://new-backend:3000"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8001/services" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body

# Thêm route cho service
$body = @{
    paths = @("/new-api")
    strip_path = $false
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8001/services/new-service/routes" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body
```

### Troubleshooting Kong:

#### Kong không khởi động

```powershell
# Xem logs Kong
docker-compose logs kong

# Restart Kong
docker-compose restart kong

# Xem Kong container status
docker ps | grep kong
```

#### Routes không work

```powershell
# Kiểm tra services
docker-compose exec kong curl http://localhost:8001/services

# Kiểm tra routes
docker-compose exec kong curl http://localhost:8001/routes

# Kiểm tra plugins
docker-compose exec kong curl http://localhost:8001/plugins
```

#### Lỗi "no Route matched"

- Đảm bảo service/route được tạo đúng
- Check logs: `docker-compose logs kong`
- Restart Kong: `docker-compose restart kong`
- Verify config: `docker-compose exec kong kong config parse /etc/kong/kong-declarative.yml`

### Kong Admin UI (Konga - Optional)

Nếu muốn dùng giao diện web để quản lý Kong, cài Konga:

1. Thêm vào docker-compose.yml:

```yaml
konga:
  image: pantsel/konga:latest
  ports:
    - "1337:1337"
  environment:
    NODE_ENV: production
    DB_ADAPTER: sqlite
    DB_URI: /app/kongadata.db
  depends_on:
    - kong
```

2. Khởi động:

```powershell
docker-compose up -d konga
```

3. Truy cập: `http://localhost:1337`

### Tài liệu tham khảo:

- [Kong Official Documentation](https://docs.konghq.com)
- [Kong Admin API Reference](https://docs.konghq.com/gateway/latest/admin-api)
- [Kong Plugins](https://docs.konghq.com/gateway/latest/plugins)
