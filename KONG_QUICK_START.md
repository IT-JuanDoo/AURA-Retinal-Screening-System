# 🚀 Khởi động Kong API Gateway - Hướng dẫn đơn giản

## Bước 1: Cấu hình môi trường

```bash
# Copy file cấu hình
cp docker.env.example .env
```

Nội dung cơ bản trong `.env` (đã có sẵn):

```env
KONG_PROXY_PORT=8003
KONG_ADMIN_PORT=8002
KONG_DB_PASSWORD=kong_password_2024
```

## Bước 2: Khởi động Kong

```bash
# Khởi động Kong + database
docker-compose up -d kong-database kong-migrations kong

# Hoặc khởi động tất cả services
docker-compose up -d
```

## Bước 3: Kiểm tra Kong đã sẵn sàng

```bash
# Chờ ~30 giây cho Kong health check pass
docker-compose ps kong

# Xem logs Kong
docker-compose logs -f kong
```

## Truy cập Kong

| Dịch vụ               | URL                           | Mục đích                             |
| --------------------- | ----------------------------- | ------------------------------------ |
| **Kong Proxy (Main)** | http://localhost:8003         | API Gateway entry point              |
| **Kong Admin API**    | http://localhost:8002         | Quản lý Kong (APIs, routes, plugins) |
| **Backend API**       | http://localhost:8003/api     | Gọi backend API thông qua Kong       |
| **AI Core**           | http://localhost:8003/aicore  | Gọi AI Core thông qua Kong           |
| **Swagger**           | http://localhost:8003/swagger | API documentation                    |

## Test Kong

### PowerShell

```powershell
# Test Kong đã sẵn sàng
Invoke-RestMethod -Uri "http://localhost:8003" -Method GET

# Xem tất cả Kong services
Invoke-RestMethod -Uri "http://localhost:8002/services"

# Xem tất cả Kong routes
Invoke-RestMethod -Uri "http://localhost:8002/routes"
```

### Command Line

```bash
# Test Kong health
curl http://localhost:8003

# Xem services
curl http://localhost:8002/services

# Xem routes
curl http://localhost:8002/routes
```

## Các Routes đã cấu hình

| Path       | Service      | Backend             |
| ---------- | ------------ | ------------------- |
| `/api`     | Backend API  | http://backend:5000 |
| `/aicore`  | AI Core      | http://aicore:8000  |
| `/swagger` | Swagger Docs | http://backend:5000 |

## Cấu hình CORS & Rate Limiting

Kong đã có:

- ✅ **CORS**: Cho phép all origins (`*`)
- ✅ **Rate Limiting**: 1000 requests/phút, 10000/giờ
- ✅ **Request Transformer**: Thêm headers X-Gateway, X-Timestamp

## Thêm Route mới

1. Edit `kong-declarative.yml`
2. Thêm service & route mới:

```yaml
services:
  - name: new-service
    url: http://new-backend:3000
    routes:
      - name: new-route
        paths:
          - /new-api
        strip_path: false
    plugins:
      - name: cors
        config:
          origins: ["*"]
```

3. Restart Kong:

```bash
docker-compose restart kong
```

Chờ 5-10 giây để load config.

## Troubleshooting

**Kong không khởi động:**

```bash
# Xem logs
docker-compose logs kong

# Restart
docker-compose restart kong
```

**Routes không work:**

```bash
# Kiểm tra routes
docker-compose exec kong curl http://localhost:8001/routes

# Kiểm tra services
docker-compose exec kong curl http://localhost:8001/services
```

**CORS errors:**

- Kiểm tra `kong-declarative.yml` - CORS plugin config
- Đảm bảo `origins: ["*"]` được set

## Tài liệu thêm

- [Kong Documentation](https://docs.konghq.com/)
- [KONG_SETUP.md](KONG_SETUP.md) - Cấu hình chi tiết
