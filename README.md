# 🩺 AURA - Hệ thống Sàng lọc Sức khỏe Mạch máu Võng mạc

Hệ thống sàng lọc và phân tích sức khỏe mạch máu võng mạc sử dụng AI, được xây dựng với kiến trúc Microservices.

---

## 🚀 Quick Start

### Yêu cầu hệ thống

- **Docker** & **Docker Compose** (phiên bản mới nhất)
- **Git**
- **Windows/Linux/Mac** (đã test trên Windows)

### Cài đặt và chạy (Docker)

**Cách 1 – Core (chỉ các service cần thiết: app + đăng nhập phòng khám):**

```bash
# Có Make: chạy core services (postgres, redis, rabbitmq, aicore, backend, frontend)
make docker

# Hoặc không có Make – chạy thủ công:
docker-compose build backend frontend
docker-compose up -d postgres redis rabbitmq aicore backend frontend
```

**Cách 2 – Full stack (tất cả services, gồm Kong, microservices):**

```bash
make prod
# hoặc: docker-compose build && docker-compose up -d
```

Sau khi chạy:

- **App:** http://localhost:3000  
- **Đăng nhập phòng khám:** http://localhost:3000/clinic/login  
- **Đăng ký phòng khám:** http://localhost:3000/clinic/register  
- **Backend API:** http://localhost:5000  

Đợi vài phút cho backend healthy, rồi mở app. Xem log: `docker-compose logs -f backend` hoặc `make logs-b`.

**Lỗi "relation clinic_admins does not exist" khi đăng ký phòng khám:**  
DB được tạo trước khi có bảng `clinics`/`clinic_admins`. Chạy migration:

```bash
make migrate-clinic
```

Hoặc thủ công (PowerShell, tại thư mục gốc repo):

```powershell
Get-Content migrations/001_add_clinic_tables.sql | docker-compose exec -T postgres psql -U aura_user -d aura_db
```

---

## 🌐 Danh sách trang và tài khoản đăng nhập

### 1. Ứng dụng chính (Frontend + Backend)

- **Frontend Web App**  
  - URL: `http://localhost:3000`  
  - Tài khoản mẫu (có thể thay đổi trong DB):
    - **Patient** (người dùng):  
      - Email: `test@aura.com`  
      - Password: `Test123!@#`
    - **Admin/SuperAdmin**: xem thêm trong seed data hoặc tạo qua API/Admin UI.

- **Backend API (Gateway)**  
  - URL: `http://localhost:5000`  
  - Health check: `http://localhost:5000/health`

- **Swagger API Docs**  
  - URL: `http://localhost:5000/swagger`  
  - Đăng nhập:
    1. Gọi `POST /api/auth/login` với body:
       ```json
       {
         "email": "test@aura.com",
         "password": "Test123!@#"
       }
       ```
    2. Copy `accessToken` trong response.
    3. Bấm nút **Authorize** → nhập: `Bearer <accessToken>`.

- **Hangfire Dashboard** (background jobs)  
  - URL: `http://localhost:5000/hangfire`  
  - Yêu cầu JWT token với role **Admin/SuperAdmin** (đăng nhập như trên rồi truy cập).

### 2. Cơ sở dữ liệu

- **PostgreSQL**  
  - Host (trong Docker network): `postgres:5432`  
  - Host (từ máy ngoài): `localhost:5432`  
  - Database: `aura_db`  
  - User: `aura_user`  
  - Password: `aura_password_2024`

- **pgAdmin (UI quản lý DB)**  
  - URL: `http://localhost:5050`  
  - Email: `admin@aura.com`  
  - Password: `admin123`  
  - Khi add server trong pgAdmin:
    - Host: `postgres`
    - Port: `5432`
    - Username: `aura_user`
    - Password: `aura_password_2024`

### 3. Hàng đợi & Cache

- **RabbitMQ Management**  
  - URL: `http://localhost:15672`  
  - Username: `aura_user`  
  - Password: `aura_rabbitmq_2024`  
  - Các exchange/queue chính (do code khai báo hoặc bạn tạo tay):
    - `analysis.exchange` (topic) → `analysis.queue` (routing key `analysis.start`)
    - `notifications.exchange` (fanout) → `notifications.queue`, `email.queue`

- **Redis** (cache)  
  - Host (trong Docker network): `redis:6379`  
  - Host (từ máy ngoài): `localhost:6379`  
  - Không có UI web; dùng `redis-cli` hoặc tool như RedisInsight để xem dữ liệu:
    ```bash
    docker exec -it aura-redis sh
    redis-cli
    set aura:test "ok"
    get aura:test
    ```

### 4. Monitoring & Observability

- **Prometheus** (thu thập metrics)  
  - URL: `http://localhost:9090`  
  - Đã cấu hình scrape các service: `backend`, `auth-service`, `user-service`, `image-service`, `analysis-service`, `notification-service`, `admin-service`, `aicore`.

- **Grafana** (dashboard visualization)  
  - URL: `http://localhost:3000`  
  - Username: `admin`  
  - Password: `admin` (hoặc `grafana_password_2024` nếu có cấu hình)  
  - **Hai cách sử dụng Grafana:**

    **Cách 1: Visualize Prometheus Metrics (Monitoring System Health)**
    - Datasource: **Prometheus** (`http://prometheus:9090`)
    - Các ví dụ dashboard:
      - CPU, Memory, Disk usage của containers
      - Request rate, Response time của backend services
      - Database connection pool status
      - Query: `up` (xem tình trạng các service), `container_memory_usage_bytes`, `http_requests_total`
    - Setup:
      1. Vào **Home → Data sources** (hoặc **Settings → Data sources**)
      2. Click **+ Add data source** → **Prometheus**
      3. URL: `http://prometheus:9090`
      4. Click **Save & Test**
      5. Tạo dashboard mới với các metric từ Prometheus

    **Cách 2: Visualize PostgreSQL Data (Analytics Dashboard) - NỚ CHỦ YẾU**
    - Datasource: **PostgreSQL** (kết nối trực tiếp database AURA)
    - Các ví dụ dashboard:
      - Tổng số analysis, user, doctor
      - Risk score distribution
      - Disease statistics (Hypertension, Diabetes, Stroke Risk)
      - Analysis trends theo thời gian
    - Setup:
      1. Vào **Home → Data sources** → **+ Add data source** → **PostgreSQL**
      2. Cấu hình:
         - **Name**: `AURA PostgreSQL`
         - **Host**: `postgres:5432` (nội bộ Docker), hoặc `localhost:5432` (từ máy ngoài)
         - **Database**: `aura_db`
         - **User**: `aura_user`
         - **Password**: `aura_password_2024`
         - **SSL Mode**: `disable`
      3. Click **Save & Test** → Kiểm tra "Database connection ok"
      4. Tạo dashboard với SQL queries

    **Panel Examples cho PostgreSQL:**

    **Panel 1: Tổng số Analysis**
    ```sql
    SELECT COUNT(*) as total_analysis FROM analysis_results WHERE isdeleted = false;
    ```
    - Visualization: **Stat** hoặc **Gauge**

    **Panel 2: Risk Score Distribution**
    ```sql
    SELECT riskscore, COUNT(*) as count 
    FROM analysis_results 
    WHERE isdeleted = false 
    GROUP BY riskscore 
    ORDER BY riskscore;
    ```
    - Visualization: **Bar chart** hoặc **Pie chart**

    **Panel 3: Disease Statistics**
    ```sql
    SELECT 
        'Hypertension' as disease,
        COUNT(CASE WHEN hypertensionconcern = true THEN 1 END) as count
    FROM analysis_results
    WHERE isdeleted = false
    UNION ALL
    SELECT 
        'Diabetes' as disease,
        COUNT(CASE WHEN diabetes != 'None' THEN 1 END) as count
    FROM analysis_results
    WHERE isdeleted = false
    UNION ALL
    SELECT 
        'Stroke Risk' as disease,
        COUNT(CASE WHEN strokeconcern > 0 THEN 1 END) as count
    FROM analysis_results
    WHERE isdeleted = false;
    ```
    - Visualization: **Pie chart** hoặc **Table**

    **Panel 4: Analysis Trend (theo ngày)**
    ```sql
    SELECT 
        DATE(createddate) as date,
        COUNT(*) as analysis_count
    FROM analysis_results
    WHERE isdeleted = false AND createddate >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(createddate)
    ORDER BY date;
    ```
    - Visualization: **Time series** hoặc **Line chart**

    **Panel 5: Average Risk Score by User**
    ```sql
    SELECT 
        userid,
        ROUND(AVG(riskscore), 2) as avg_risk_score,
        COUNT(*) as analysis_count
    FROM analysis_results
    WHERE isdeleted = false
    GROUP BY userid
    ORDER BY avg_risk_score DESC
    LIMIT 10;
    ```
    - Visualization: **Table**

    **Hướng dẫn tạo Panel:**
    1. Vào Dashboard → **+ Add panel**
    2. Chọn **Data source**: `AURA PostgreSQL`
    3. Dán SQL query vào **SQL editor**
    4. Chọn **Visualization type** (Stat, Gauge, Bar chart, Pie chart, Time series, Table, etc.)
    5. Customize axes, colors, legend
    6. Bấm **Save**

### 5. AI Core & Các service khác

- **AI Core (Python FastAPI)**  
  - URL nội bộ: `http://aicore:8000` (trong Docker network)  
  - Từ máy ngoài (nếu expose port): `http://localhost:8000` (tuỳ cấu hình).  
  - Backend gọi AI Core qua biến môi trường `AICore__BaseUrl=http://aicore:8000`.
  - Các endpoint chính:
    - `GET /health`, `GET /api/health`: kiểm tra tình trạng AI Core, thông tin model.  
    - `POST /api/analyze`: phân tích **1 ảnh** võng mạc, trả về:
      - `predicted_class`, `confidence`, `conditions`, `risk_assessment`.  
      - `systemic_health_risks`: nguy cơ tim mạch, đái tháo đường, tăng huyết áp, đột quỵ.  
      - `vascular_metrics`: các chỉ số mạch máu (độ xoắn, biến thiên đường kính, vi phình, điểm xuất huyết).  
      - `annotations` + `heatmap_url`: vùng nghi ngờ và heatmap sinh trực tiếp từ mô hình.  
    - `POST /api/analyze-batch`: phân tích **nhiều ảnh** trong một lần gọi (hỗ trợ NFR-2 ≥ 100 ảnh/batch):
      - Nhận `items` là danh sách các `AnalyzeRequest`.  
      - Trả về `summary` (tổng, thành công, lỗi, thời gian xử lý) + danh sách `results`/`errors`.  

- **Kong API Gateway** (tuỳ chọn)  
  - Kong proxy: `http://localhost:8000`  
  - Kong Admin (nếu mở): `http://localhost:8001`  
  - Trong môi trường dev hiện tại, backend/FE có thể gọi thẳng mà không cần Kong.

### 6. NiFi (nếu bạn bật trong docker-compose)

- **Apache NiFi**  
  - URL: `https://localhost:8443/nifi`  
  - Username: `admin`  
  - Password: `aura_nifi_2024`  
  - Khi trình duyệt báo lỗi SSL tự ký, chọn **“Advanced” → “Proceed to localhost (unsafe)”**.

---

## 📋 Cấu trúc dự án

```
AURA-Retinal-Screening-System/
├── backend/                 # Backend services (ASP.NET Core)
│   ├── src/
│   │   ├── Aura.API/       # API Gateway (Main API)
│   │   ├── Aura.Application/
│   │   ├── Aura.Core/
│   │   └── Aura.Infrastructure/
│   ├── AuthService/        # Authentication Microservice
│   ├── UserService/        # User Management Microservice
│   ├── ImageService/       # Image Processing Microservice
│   ├── AnalysisService/    # Analysis Microservice
│   ├── NotificationService/# Notification Microservice
│   └── AdminService/       # Admin Microservice
├── frontend/               # Frontend (React + Vite)
├── aicore/                 # AI Core Service (Python)
├── docker-compose.yml      # Docker Compose configuration
└── README.md
```

---

## 🛠️ Cấu hình

### Default Configuration (Không cần cấu hình thêm)

Dự án đã được cấu hình sẵn với các giá trị mặc định để chạy ngay:

- **Database**: PostgreSQL với user `aura_user`, password `aura_password_2024`
- **JWT Secret**: `AURA-Super-Secret-Key-Min-32-Characters-Long-2024!`
- **Cloudinary**: Đã có API keys (development) trong `appsettings.json`
- **RabbitMQ**: User `aura_user`, password `aura_rabbitmq_2024`
- **Redis**: Không cần password (development)

### Tùy chỉnh (Optional)

Nếu muốn thay đổi cấu hình, tạo file `.env.docker` (copy từ `docker.env.example`):

```bash
# Copy file example
cp docker.env.example .env.docker

# Chỉnh sửa các giá trị cần thiết
# Docker Compose sẽ tự động đọc file này
```

**Lưu ý**: File `.env.docker` đã được thêm vào `.gitignore`, không commit lên Git.

---

## 🧪 Testing

### Test qua Swagger UI

1. Truy cập: http://localhost:5000/swagger
2. Đăng nhập qua endpoint `POST /api/auth/login`:
   ```json
   {
     "email": "test@aura.com",
     "password": "Test123!@#"
   }
   ```
3. Copy `AccessToken` từ response
4. Click "Authorize" ở đầu trang và nhập: `Bearer <your-token>`
5. Test các endpoints trực tiếp trong Swagger

### Test Infrastructure

- **RabbitMQ Management**: http://localhost:15672
  - Username: `aura_user`
  - Password: `aura_rabbitmq_2024`
  - Xem queues và messages

- **Hangfire Dashboard**: http://localhost:5000/hangfire
  - Xem background jobs và recurring jobs
  - Monitor job execution

- **Redis**: Có thể test qua API endpoints (cache sẽ tự động hoạt động)

---

## 📚 API Documentation

### Swagger UI

Truy cập: http://localhost:5000/swagger

### Các Controllers chính:

- **AuthController**: Đăng ký, đăng nhập, OAuth (Google/Facebook)
- **UserController**: Quản lý user profile
- **AnalysisController**: Phân tích ảnh, export reports (PDF/CSV/JSON)
- **DoctorController**: Quản lý doctor profile, statistics
- **PaymentController**: Quản lý packages, payments
- **MedicalNotesController**: Quản lý medical notes
- **PatientAssignmentController**: Quản lý patient-doctor assignments
- **AdminController**: Admin operations

---

## 🏗️ Kiến trúc

### Microservices Architecture

```
┌─────────────┐
│   Frontend  │ (React + Vite)
└──────┬──────┘
       │
┌──────▼─────────────────────────────────────┐
│         API Gateway (Aura.API)             │
│  - Authentication & Authorization          │
│  - Request Routing                         │
│  - Rate Limiting                           │
└──┬──────┬──────┬──────┬──────┬──────┬─────┘
   │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│Auth │ │User │ │Image│ │Analy│ │Notif│ │Admin│
│Serv │ │Serv │ │Serv │ │Serv │ │Serv │ │Serv │
└─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘
   │      │      │      │      │      │
   └──────┴──────┴──────┴──────┴──────┘
              │
         ┌────▼─────┐
         │PostgreSQL│
         └──────────┘
```

### Infrastructure Services

- **Redis**: Caching (user profiles, analysis results)
- **RabbitMQ**: Message Queue (async processing, notifications)
- **Hangfire**: Background Jobs (cleanup, email queue)
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboard
- **Kong**: API Gateway (optional)

---

## 🔧 Development

### Chạy Backend Development

```bash
cd backend/src/Aura.API
dotnet run
```

### Chạy Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Database Migrations

```bash
# Tạo migration
dotnet ef migrations add <MigrationName> --project backend/src/Aura.Core

# Apply migration
dotnet ef database update --project backend/src/Aura.Core
```

---

## 📦 Docker Commands

### Khởi động services

```bash
docker-compose up -d
```

### Dừng services

```bash
docker-compose down
```

### Xem logs

```bash
# Tất cả services
docker-compose logs -f

# Chỉ backend
docker-compose logs -f backend

# Chỉ database
docker-compose logs -f postgres
```

### Rebuild services

```bash
# Rebuild backend
docker-compose build --no-cache backend
docker-compose up -d backend

# Rebuild tất cả
docker-compose build --no-cache
docker-compose up -d
```

### Xóa tất cả (bao gồm volumes)

```bash
docker-compose down -v
```

---

## 🔐 Authentication & Authorization

### User Roles

- **Patient**: Người dùng thông thường
- **Doctor**: Bác sĩ
- **Admin**: Quản trị viên
- **SuperAdmin**: Siêu quản trị viên

### OAuth Providers

- **Google OAuth**: Đã cấu hình (cần Client Secret nếu muốn dùng)
- **Facebook OAuth**: Đã cấu hình (cần App Secret nếu muốn dùng)

### JWT Token

- **Access Token**: Expires sau 60 phút
- **Refresh Token**: Expires sau 7 ngày

---

## 📊 Features

### ✅ Đã hoàn thành

- [x] Authentication & Authorization (JWT, OAuth)
- [x] User Management
- [x] Image Upload & Processing
- [x] AI Analysis Integration (AI Core Python FastAPI, Batch API, giải thích kết quả tiếng Việt + heatmap từ mô hình)
- [x] Export Reports (PDF/CSV/JSON)
- [x] Doctor Management
- [x] Payment & Packages
- [x] Medical Notes
- [x] Patient-Doctor Assignments
- [x] Redis Caching
- [x] RabbitMQ Message Queue
- [x] Hangfire Background Jobs
- [x] Monitoring (Prometheus + Grafana)

### 🚧 Đang phát triển

- [ ] Frontend UI hoàn chỉnh
- [ ] Real-time notifications (SignalR)
- [ ] Firebase Cloud Messaging (Push notifications)
- [ ] Advanced analytics dashboard

---

## 🐛 Troubleshooting

### Backend không khởi động

```bash
# Kiểm tra logs
docker-compose logs backend

# Kiểm tra database connection
docker-compose exec postgres psql -U aura_user -d aura_db -c "SELECT 1;"
```

### Port đã được sử dụng

Thay đổi ports trong `docker-compose.yml` hoặc `.env.docker`:

```yaml
ports:
  - "5001:5000"  # Thay 5000 thành 5001
```

### Database connection error

```bash
# Kiểm tra postgres đã chạy
docker-compose ps postgres

# Restart postgres
docker-compose restart postgres
```

### Frontend không kết nối được Backend

Kiểm tra `App__FrontendUrl` trong `docker-compose.yml` và CORS settings trong `Program.cs`.

---

## 📝 Notes

- **Development Mode**: Tất cả default passwords và keys đều là development values
- **Production**: **PHẢI thay đổi** tất cả passwords và secrets trước khi deploy
- **Cloudinary**: API keys trong `appsettings.json` là development keys (public)
- **Database**: Schema tự động tạo từ `aura_database_schema.sql` khi container khởi động lần đầu

---

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

---

## 📚 Documentation

- **[Infrastructure Value](./INFRASTRUCTURE_VALUE.md)** - Giải thích giá trị của Redis, RabbitMQ, Hangfire
- **[TODO](./TODO.md)** - Danh sách công việc cần hoàn thành

**Lưu ý**: Các file test scripts và hướng dẫn test chi tiết chỉ dùng local, không commit lên Git.

---

## 📄 License

This project is licensed under the MIT License.

---

## 👥 Team

Dự án được phát triển bởi team AURA.

---

## 📞 Support

Nếu có vấn đề, tạo Issue trên GitHub hoặc liên hệ team.

---

**Happy Coding! 🚀**
