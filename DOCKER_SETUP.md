# Hướng dẫn chạy AURA với Docker

## 📋 Yêu cầu
- Docker Desktop đã được cài đặt và chạy
- Docker Compose (thường đi kèm với Docker Desktop)

## 🚀 Các bước chạy Docker

### **Option 1: Development Mode (Khuyến nghị cho development)**

Chỉ chạy database trong Docker, backend và frontend chạy local với hot-reload:

```bash
# 1. Khởi động database
make dev
# hoặc
docker-compose -f docker-compose.dev.yml up -d

# 2. Chạy backend local (terminal 1)
cd backend/src/Aura.API
dotnet run

# 3. Chạy frontend local (terminal 2)
cd frontend
npm install  # Nếu chưa cài
npm run dev
```

**Lưu ý**: Sau khi thêm code mới (như Analytics Dashboard), chỉ cần restart backend/frontend local, không cần rebuild Docker.

---

### **Option 2: Production Mode (Full Docker)**

Chạy toàn bộ hệ thống trong Docker:

```bash
# 1. Build và khởi động tất cả services
make prod
# hoặc
docker-compose build
docker-compose up -d

# 2. Kiểm tra logs
make logs
# hoặc xem logs từng service:
make logs-b  # Backend logs
make logs-f  # Frontend logs
make logs-db # Database logs
```

**⚠️ QUAN TRỌNG**: Sau khi thêm code mới (như Analytics Dashboard), bạn CẦN rebuild containers:

```bash
# Rebuild và restart backend (sau khi thêm Analytics Repository, Controller)
make rebuild-backend

# Rebuild và restart frontend (sau khi thêm AdminAnalyticsPage)
make rebuild-frontend

# Hoặc rebuild tất cả
docker-compose build --no-cache
docker-compose up -d
```

---

## 🔧 Các lệnh Docker thường dùng

### Khởi động/Dừng

```bash
# Khởi động
make up
# hoặc
docker-compose up -d

# Dừng
make down
# hoặc
docker-compose down

# Khởi động lại
make restart
# hoặc
docker-compose restart
```

### Xem logs

```bash
# Tất cả logs
make logs

# Backend logs
make logs-b

# Frontend logs  
make logs-f

# Database logs
make logs-db
```

### Truy cập container

```bash
# Shell vào backend container
make shell-b
# hoặc
docker-compose exec backend sh

# Shell vào frontend container
make shell-f
# hoặc
docker-compose exec frontend sh

# Truy cập database (psql)
make shell-db
# hoặc
docker-compose exec postgres psql -U aura_user -d aura_db
```

### Clean up

```bash
# Dừng và xóa containers, networks
make down

# Dừng và xóa TẤT CẢ (containers, volumes, images)
make clean

# Clean development environment
make dev-clean
```

---

## 📍 Truy cập các services

Sau khi khởi động thành công:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | - |
| **Backend API** | http://localhost:5000 | - |
| **Swagger Docs** | http://localhost:5000/swagger | - |
| **pgAdmin** | http://localhost:5050 | Email: `admin@aura.com`<br>Password: `admin123` |
| **PostgreSQL** | localhost:5432 | User: `aura_user`<br>Password: `aura_password_2024`<br>Database: `aura_db` |

---

## 🔐 Cấu hình Environment Variables (Tùy chọn)

Nếu muốn thay đổi cấu hình mặc định:

1. Copy file mẫu:
```bash
cp docker.env.example .env.docker
```

2. Chỉnh sửa `.env.docker` với các giá trị của bạn

3. Sử dụng file .env khi chạy:
```bash
docker-compose --env-file .env.docker up -d
```

---

## ⚠️ Xử lý lỗi thường gặp

### Lỗi: Port đã được sử dụng

Nếu port 3000, 5000, 5432, hoặc 5050 đã được sử dụng:

1. Thay đổi port trong `docker-compose.yml`:
```yaml
ports:
  - "3001:5000"  # Thay 3000 thành 3001
```

2. Hoặc dừng service đang sử dụng port đó

### Lỗi: Container không start được

```bash
# Xem logs để biết lỗi
docker-compose logs backend
docker-compose logs frontend

# Rebuild lại
docker-compose build --no-cache
docker-compose up -d
```

### Database không kết nối được

```bash
# Kiểm tra database đã sẵn sàng chưa
docker-compose exec postgres pg_isready -U aura_user -d aura_db

# Xem database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Code mới không được cập nhật (Production mode)

**QUAN TRỌNG**: Khi thêm code mới như Analytics Dashboard, bạn PHẢI rebuild:

```bash
# Rebuild backend (sau khi thêm AnalyticsRepository, Controller)
docker-compose build --no-cache backend
docker-compose up -d backend

# Rebuild frontend (sau khi thêm AdminAnalyticsPage)
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

---

## 📝 Sau khi thêm Analytics Dashboard

Vì bạn vừa thêm Analytics Dashboard, nếu chạy **Production mode**, bạn cần:

```bash
# 1. Rebuild backend (có AnalyticsRepository và Controller mới)
make rebuild-backend
# hoặc
docker-compose build --no-cache backend
docker-compose up -d backend

# 2. Rebuild frontend (có AdminAnalyticsPage mới)
make rebuild-frontend
# hoặc
docker-compose build --no-cache frontend
docker-compose up -d frontend

# 3. Kiểm tra logs
make logs-b
make logs-f
```

Nếu chạy **Development mode**, chỉ cần restart backend/frontend local, không cần rebuild Docker.

---

## 🎯 Quick Start

**Development mode (khuyến nghị)**:
```bash
make dev                    # Khởi động database
# Terminal 1:
cd backend/src/Aura.API && dotnet run
# Terminal 2:
cd frontend && npm run dev
```

**Production mode**:
```bash
make prod                   # Build và khởi động tất cả
# Sau khi thêm code mới:
make rebuild-backend        # Rebuild backend
make rebuild-frontend       # Rebuild frontend
```

