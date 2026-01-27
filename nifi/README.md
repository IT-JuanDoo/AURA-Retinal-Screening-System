# 🧩 NiFi – Hướng dẫn Setup cho AURA

Hướng dẫn này giúp bạn (và bạn bè) cài và cấu hình **Apache NiFi** để làm việc với hệ thống AURA theo cách **thủ công, từng bước một**.

---

## 1. Tổng quan

- **Mục đích NiFi trong AURA**
  - Đọc dữ liệu từ PostgreSQL (bảng `users`, `analysis_results`, …).
  - Xuất báo cáo định kỳ ra file (CSV, JSON,…).
  - Đồng bộ dữ liệu real-time qua webhook + RabbitMQ.
  - Tính toán analytics tổng hợp.
- **Môi trường chạy**: NiFi chạy bằng Docker, đã được khai báo trong `docker-compose.yml`.
- **Thông tin truy cập mặc định**:
  - URL: `https://localhost:8443/nifi`
  - Username: `admin`
  - Password: `aura_nifi_2024`

> ⚠️ Khi truy cập lần đầu, trình duyệt sẽ báo lỗi SSL tự ký. Chọn **“Advanced” → “Proceed to localhost (unsafe)”** để tiếp tục (chỉ dùng trong môi trường dev/local).

---

## 2. Khởi động NiFi cùng hệ thống

Từ thư mục gốc của dự án:

```bash
cd AURA-Retinal-Screening-System
docker-compose up -d
```

Đợi vài phút cho tất cả container (bao gồm `aura-nifi`) khởi động.

Kiểm tra nhanh:

```bash
docker-compose ps nifi
```

Nếu trạng thái là `Up` → NiFi đã chạy.

Sau đó mở trình duyệt tới: `https://localhost:8443/nifi` và đăng nhập bằng `admin / aura_nifi_2024`.

---

## 3. Thêm PostgreSQL JDBC Driver cho NiFi

NiFi cần JDBC driver để kết nối PostgreSQL.

1. Mở PowerShell tại thư mục dự án:

   ```powershell
   cd D:\FIle_Hoc_Tap\XDPMHDT\AURA-Retinal-Screening-System
   ```

2. Tải JDBC driver vào container NiFi:

   ```powershell
   docker-compose exec nifi wget -P /opt/nifi/nifi-current/lib https://jdbc.postgresql.org/download/postgresql-42.7.0.jar
   ```

3. Restart NiFi để nạp driver:

   ```powershell
   docker-compose restart nifi
   ```

4. Kiểm tra file đã có trong container:

   ```powershell
   docker-compose exec nifi ls -la /opt/nifi/nifi-current/lib/postgresql-42.7.0.jar
   ```

---

## 4. Tạo Process Group chính cho AURA

1. Đăng nhập NiFi UI: `https://localhost:8443/nifi`.
2. Ở canvas chính, **click chuột phải** → **Create Process Group**.
3. Đặt tên: `AURA Flows`.
4. **Double-click** vào `AURA Flows` để vào bên trong (tất cả flow sẽ được tạo trong group này).

---

## 5. Tạo Controller Service kết nối PostgreSQL

1. Trong `AURA Flows`, click chuột phải vào nền canvas → **Configure**.
2. Chọn tab **Controller Services**.
3. Click nút **+** → tìm `DBCPConnectionPool` → **Add**.
4. Double-click vào service vừa tạo.
5. Tab **SETTINGS**:
   - Name: `AURA PostgreSQL Connection Pool`.
6. Tab **PROPERTIES**:

   | Property                    | Giá trị                                            |
   | --------------------------- | -------------------------------------------------- |
   | Database Connection URL     | `jdbc:postgresql://postgres:5432/aura_db`          |
   | Database Driver Class Name  | `org.postgresql.Driver`                            |
   | Database Driver Location(s) | `/opt/nifi/nifi-current/lib/postgresql-42.7.0.jar` |
   | Database User               | `aura_user`                                        |
   | Password                    | `aura_password_2024`                               |
   | Max Wait Time               | `30 seconds`                                       |
   | Max Total Connections       | `10`                                               |
   | Validation Query            | `SELECT 1`                                         |

7. Bấm **Apply**.
8. Trong danh sách Controller Services, bấm biểu tượng **play** màu xanh để **Enable** service.

Khi trạng thái là **Enabled** → NiFi đã kết nối được PostgreSQL.

---

## 6. Flow mẫu 1: Đọc dữ liệu từ bảng `users` và lưu ra file

Flow này dùng để test nhanh kết nối DB + file hệ thống của NiFi.

### 6.1. Tạo Process Group

1. Trong `AURA Flows`, click chuột phải → **Create Process Group**.
2. Đặt tên: `Read Database Flow`.
3. Double-click để vào bên trong.

### 6.2. Processor `QueryDatabaseTable`

1. Bấm icon **Add Processor** trên toolbar.
2. Tìm `QueryDatabaseTable` → **Add**.
3. Double-click vào processor.
4. Tab **PROPERTIES**:
   - **Database Connection Pooling Service**: chọn `AURA PostgreSQL Connection Pool`.
   - **Table Name**: `users`.
   - **Columns to Return**: để trống (lấy tất cả).
5. Tab **SCHEDULING**:
   - **Run Schedule**: `5 min` (hoặc `30 sec` để test).
6. Bấm **Apply**.

### 6.3. Processor `PutFile`

1. Thêm processor mới: `PutFile` → **Add**.
2. Double-click `PutFile`.
3. Tab **PROPERTIES**:
   - **Directory**: `/tmp/nifi-output/users`.
   - **Conflict Resolution Strategy**: `replace`.
   - **Create Missing Directories**: `true` (nếu version có tùy chọn này).
4. Tab **Relationships**:
   - Đảm bảo `success` được **terminate** (nếu không nối sang processor khác).
5. Bấm **Apply**.

### 6.4. Kết nối và chạy thử

1. Kéo chuột từ `QueryDatabaseTable` → `PutFile` → chọn relationship **success**.
2. Click chuột phải từng processor → **Start** (bắt đầu từ `QueryDatabaseTable`, rồi tới `PutFile`).
3. Sau 30 giây–5 phút (tuỳ Run Schedule), NiFi sẽ tạo file trong thư mục `/tmp/nifi-output/users` bên trong container NiFi.

Để xem file trong container:

```powershell
docker-compose exec nifi ls -la /tmp/nifi-output/users
```

Nếu thấy file `.json`/`.csv` được tạo → NiFi đã kết nối DB và ghi file thành công.

---

## 7. Gợi ý các flow nâng cao cho AURA

Sau khi làm xong Flow mẫu 1, bạn có thể tự xây dựng các flow nâng cao theo nhu cầu dự án:

- **Flow Export Báo cáo Định kỳ**
  - `QueryDatabaseTable` đọc từ `analysis_results` với điều kiện thời gian (`CreatedDate >= CURRENT_DATE - INTERVAL '1 day'`).
  - `UpdateAttribute` đặt tên file (ví dụ `analysis_report_YYYY-MM-DD.csv`).
  - `PutFile` ghi ra thư mục `/tmp/nifi-output/reports`.

- **Flow Đồng bộ Real-time qua Webhook + RabbitMQ**
  - `ListenHTTP` nhận JSON từ backend (base path `/webhook/analysis`).
  - `EvaluateJSONPath` tách các trường `type`, `data`.
  - `RouteOnAttribute` route theo `event.type` (`analysis.completed`, `image.uploaded`, …).
  - `PutRabbitMQ` gửi message sang RabbitMQ (exchange `analysis.exchange`, routing key `analysis.start`).

---

## 9. Flow Webhook + RabbitMQ Chi tiết - Hướng dẫn cấu hình

### 9.1. Cấu hình RabbitMQ (Tạo Exchanges & Queues)

Trước tiên, bạn cần tạo các exchanges và queues trong RabbitMQ.

1. Mở RabbitMQ Management UI: `http://localhost:15672`
   - Username: `aura_user`
   - Password: `aura_password_2024`

2. **Tạo Exchanges** - Click tab **Exchanges** → **Add a new exchange**:

   | Tên Exchange             | Type     | Durable | Auto-delete |
   | ------------------------ | -------- | ------- | ----------- |
   | `analysis.exchange`      | `topic`  | ✓       | ✗           |
   | `image.exchange`         | `topic`  | ✓       | ✗           |
   | `notifications.exchange` | `direct` | ✓       | ✗           |

3. **Tạo Queues** - Click tab **Queues and Streams** → **Add a new queue**:

   | Queue Name                 | Durable | Auto-delete |
   | -------------------------- | ------- | ----------- |
   | `analysis.completed.queue` | ✓       | ✗           |
   | `analysis.failed.queue`    | ✓       | ✗           |
   | `image.uploaded.queue`     | ✓       | ✗           |
   | `notifications.queue`      | ✓       | ✗           |

4. **Binding Queues to Exchanges** - Trong tab **Exchanges**, click vào từng exchange rồi **Add binding**:

   **Cho `analysis.exchange`:**
   - To queue: `analysis.completed.queue` | Routing key: `analysis.completed`
   - To queue: `analysis.failed.queue` | Routing key: `analysis.failed`

   **Cho `image.exchange`:**
   - To queue: `image.uploaded.queue` | Routing key: `image.uploaded`

   **Cho `notifications.exchange`:**
   - To queue: `notifications.queue` | Routing key: `*`

### 9.2. Cấu hình NiFi Controller Service cho RabbitMQ

1. Trong `AURA Flows`, click chuột phải vào nền canvas → **Configure**.
2. Chọn tab **Controller Services**.
3. Click nút **+** → tìm `StandardAmqpConnectionFactory` → **Add**.
4. Double-click vào service vừa tạo.
5. Tab **SETTINGS**:
   - Name: `AURA RabbitMQ Connection`.
6. Tab **PROPERTIES**:

   | Property   | Giá trị                                             |
   | ---------- | --------------------------------------------------- |
   | Broker URI | `amqp://aura_user:aura_password_2024@rabbitmq:5672` |
   | Use SSL    | `false` (cho development)                           |

7. Bấm **Apply** → Enable service (biểu tượng play).

### 9.3. Tạo Process Group cho Webhook Flow

1. Trong `AURA Flows`, click chuột phải → **Create Process Group**.
2. Đặt tên: `Real-time Webhook Flow`.
3. Double-click để vào bên trong.

### 9.4. Processor `ListenHTTP` (Nhận webhook từ backend)

1. Bấm icon **Add Processor**.
2. Tìm `ListenHTTP` → **Add**.
3. Double-click vào processor.
4. Tab **PROPERTIES**:
   - **Listening Port**: `8080`
   - **Base Path**: `/webhook`
   - **HTTP Methods**: `POST`
   - **Max Data to Buffer (bytes)**: `1048576`

5. Tab **SCHEDULING**:
   - **Concurrent tasks**: `5`

6. Bấm **Apply**.

### 9.5. Processor `ConvertJSONToSQL` hoặc `EvaluateJSONPath`

1. Thêm processor: `EvaluateJSONPath` → **Add**.
2. Double-click vào processor.
3. Tab **PROPERTIES**:
   - Click nút **+** để thêm các JSON path properties:

   | Property Name | JSON Path            |
   | ------------- | -------------------- |
   | `event_type`  | `$.event_type`       |
   | `user_id`     | `$.data.user_id`     |
   | `analysis_id` | `$.data.analysis_id` |
   | `risk_score`  | `$.data.risk_score`  |
   | `timestamp`   | `$.timestamp`        |
   - **Destination**: `flowfile-attribute`

4. Bấm **Apply**.

### 9.6. Processor `RouteOnAttribute` (Route theo event type)

1. Thêm processor: `RouteOnAttribute` → **Add**.
2. Double-click vào processor.
3. Tab **PROPERTIES**:
   - Click nút **+** để thêm routing rules:

   | Property Name        | Giá trị                                      |
   | -------------------- | -------------------------------------------- |
   | `analysis_completed` | `${event_type:equals('analysis.completed')}` |
   | `analysis_failed`    | `${event_type:equals('analysis.failed')}`    |
   | `image_uploaded`     | `${event_type:equals('image.uploaded')}`     |
   - Bỏ trống **Routing Configuration** (để mặc định)

4. Bấm **Apply**.

### 9.7. Processor `PutRabbitMQ` (Gửi message lên RabbitMQ)

Bạn cần tạo 3 processor `PutRabbitMQ` (một cho mỗi route).

**Cho route `analysis.completed`:**

1. Thêm processor: `PutRabbitMQ` → **Add**.
2. Double-click vào processor.
3. Tab **PROPERTIES**:
   - **AMQP Connection Factory**: chọn `AURA RabbitMQ Connection`.
   - **Exchange Name**: `analysis.exchange`
   - **Routing Key**: `analysis.completed`
   - **Message TTL**: `3600000` (1 giờ)
   - **Delivery Mode**: `2` (Persistent)

4. Tab **RELATIONSHIPS**: Terminate `success` và `failure`.
5. Bấm **Apply**.

**Tương tự** cho `analysis_failed` (Routing Key: `analysis.failed`) và `image_uploaded` (Exchange: `image.exchange`, Routing Key: `image.uploaded`).

### 9.8. Kết nối các Processor

1. Kéo từ `ListenHTTP` → `EvaluateJSONPath` → chọn `success`.
2. Kéo từ `EvaluateJSONPath` → `RouteOnAttribute` → chọn `success`.
3. Kéo từ `RouteOnAttribute` → `PutRabbitMQ` (analysis_completed) → chọn `analysis_completed`.
4. Kéo từ `RouteOnAttribute` → `PutRabbitMQ` (analysis_failed) → chọn `analysis_failed`.
5. Kéo từ `RouteOnAttribute` → `PutRabbitMQ` (image_uploaded) → chọn `image_uploaded`.
6. Terminate các unmatched relationship từ `RouteOnAttribute`.

### 9.9. Test Flow

1. Start tất cả processors.
2. Gửi test webhook từ PowerShell:

   ```powershell
   $headers = @{"Content-Type" = "application/json"}
   $body = @{
       event_type = "analysis.completed"
       data = @{
           user_id = "user123"
           analysis_id = "analysis456"
           risk_score = 0.85
       }
       timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
   } | ConvertTo-Json

   Invoke-WebRequest -Uri "http://localhost:8080/webhook" `
       -Method POST `
       -Headers $headers `
       -Body $body
   ```

3. **Kiểm tra RabbitMQ**:
   - Vào `http://localhost:15672` → **Queues** → Kiểm tra số message trong queue.
   - Click vào queue → **Get messages** để xem nội dung.

### 9.10. Troubleshooting

| Vấn đề                             | Giải pháp                                                       |
| ---------------------------------- | --------------------------------------------------------------- |
| **ListenHTTP không nhận request**  | Kiểm tra firewall/port 8080, base path đúng chưa.               |
| **PutRabbitMQ báo lỗi connection** | Kiểm tra RabbitMQ đã chạy: `docker-compose ps rabbitmq`.        |
| **Message không vào queue**        | Kiểm tra exchange & routing key đúng chưa (xem RabbitMQ UI).    |
| **EvaluateJSONPath báo lỗi**       | Kiểm tra JSON structure từ webhook có khớp với JSON path không. |

- **Flow Analytics**
  - `ExecuteSQL` chạy các query tổng hợp (COUNT, AVG…) trên `analysis_results`.
  - `PutFile` hoặc `PutDatabaseRecord` lưu kết quả tổng hợp.

---

## 8. Flow Analytics Chi tiết - Hướng dẫn cấu hình

### 8.1. Tạo Process Group mới

1. Trong `AURA Flows`, click chuột phải → **Create Process Group**.
2. Đặt tên: `Analytics Flow`.
3. Double-click để vào bên trong.

### 8.2. Processor `ExecuteSQL` (Chạy query tổng hợp)

1. Bấm icon **Add Processor** trên toolbar.
2. Tìm `ExecuteSQL` → **Add**.
3. Double-click vào processor.
4. Tab **PROPERTIES**:
   - **Database Connection Pooling Service**: chọn `AURA PostgreSQL Connection Pool`.
   - **SQL select query**: Nhập một trong các query dưới đây:

   **Ví dụ 1: Thống kê tổng quan Analysis**

   ```sql
   SELECT
       COUNT(*) as total_analysis,
       COUNT(DISTINCT userid) as total_users,
       ROUND(AVG(riskscore), 2) as avg_risk_score,
       MAX(riskscore) as max_risk_score,
       MIN(riskscore) as min_risk_score,
       MAX(createddate) as last_analysis_date
   FROM analysis_results
   WHERE isdeleted = false;
   ```

   **Ví dụ 2: Thống kê theo loại bệnh**

   ```sql
   SELECT
       'Hypertension' as condition,
       COUNT(CASE WHEN hypertensionconcern = true THEN 1 END) as concern_count,
       COUNT(*) as total_count,
       ROUND(100.0 * COUNT(CASE WHEN hypertensionconcern = true THEN 1 END) / COUNT(*), 2) as percentage
   FROM analysis_results
   WHERE isdeleted = false
   UNION ALL
   SELECT
       'Diabetes' as condition,
       COUNT(CASE WHEN diabetes != 'None' THEN 1 END) as concern_count,
       COUNT(*) as total_count,
       ROUND(100.0 * COUNT(CASE WHEN diabetes != 'None' THEN 1 END) / COUNT(*), 2) as percentage
   FROM analysis_results
   WHERE isdeleted = false
   UNION ALL
   SELECT
       'Stroke Risk' as condition,
       COUNT(CASE WHEN strokeconcern > 0 THEN 1 END) as concern_count,
       COUNT(*) as total_count,
       ROUND(100.0 * COUNT(CASE WHEN strokeconcern > 0 THEN 1 END) / COUNT(*), 2) as percentage
   FROM analysis_results
   WHERE isdeleted = false;
   ```

   **Ví dụ 3: Độ chính xác và Risk Score trung bình**

   ```sql
   SELECT
       COUNT(*) as total_records,
       ROUND(AVG(riskscore), 4) as avg_risk_score,
       ROUND(STDDEV(riskscore), 4) as stddev_risk_score,
       MAX(riskscore) as max_risk_score,
       MIN(riskscore) as min_risk_score
   FROM analysis_results
   WHERE isdeleted = false;
   ```

5. Tab **SCHEDULING**:
   - **Run Schedule**: `1 day` (hoặc `30 sec` để test).

6. Bấm **Apply**.

### 8.3. Processor `UpdateAttribute` (Đặt tên file)

1. Thêm processor mới: `UpdateAttribute` → **Add**.
2. Double-click vào processor.
3. Tab **PROPERTIES**:
   - Click nút **+** để thêm property.
   - **Tên property**: `analytics_filename`
   - **Giá trị**: `analytics_report_${now():format('yyyy-MM-dd_HHmmss')}.json`

4. Bấm **Apply**.

### 8.4. Processor `PutFile` (Lưu kết quả ra file)

1. Thêm processor mới: `PutFile` → **Add**.
2. Double-click vào processor.
3. Tab **PROPERTIES**:
   - **Directory**: `/tmp/nifi-output/analytics`.
   - **Filename**: `${analytics_filename}`.
   - **Conflict Resolution Strategy**: `replace`.
   - **Create Missing Directories**: `true`.

4. Bấm **Apply**.

### 8.5. Kết nối các Processor

1. Kéo chuột từ `ExecuteSQL` → `UpdateAttribute` → chọn relationship **success**.
2. Kéo chuột từ `UpdateAttribute` → `PutFile` → chọn relationship **success**.
3. Click chuột phải vào `PutFile` → **Configure** → Tab **Relationships** → Terminate `success`.

### 8.6. Chạy và Test Flow

1. Click chuột phải vào `ExecuteSQL` → **Start**.
2. Click chuột phải vào `UpdateAttribute` → **Start**.
3. Click chuột phải vào `PutFile` → **Start**.

4. Chạy ngay bằng cách double-click vào `ExecuteSQL` → bấm nút **EXECUTE**.

5. **Kiểm tra kết quả**:
   ```powershell
   docker-compose exec nifi ls -la /tmp/nifi-output/analytics
   docker-compose exec nifi cat /tmp/nifi-output/analytics/analytics_report_*.json
   ```

> Nếu bạn muốn chia sẻ chi tiết hơn cho bạn bè, có thể tạo thêm các file như `FLOW_EXPORT_REPORT.md`, `FLOW_REALTIME_SYNC.md`,… trong cùng thư mục `nifi/` và mô tả từng processor giống phong cách hướng dẫn ở trên.

---

## 8. Tips & Troubleshooting nhanh

- Processor có **dấu chấm than vàng** (`Invalid`):
  - Mở cấu hình → xem tab **Settings/Properties/Relationships** để xem message cụ thể.
  - Quan hệ (`relationship`) nào không nối đi đâu thì cần **terminate**.
- Không thấy dữ liệu từ DB:
  - Kiểm tra lại Table Name, cột trong `Where Clause` có tồn tại không (ví dụ dùng `CreatedDate` thay vì `created_at`).
  - Dùng pgAdmin chạy thử chính câu SQL xem có kết quả không.
- `PutFile` báo lỗi thư mục:
  - Đảm bảo đường dẫn trong container tồn tại (hoặc bật `Create Missing Directories` nếu có).
  - Test bằng câu lệnh:
    ```powershell
    docker-compose exec nifi mkdir -p /tmp/nifi-output/test
    ```

---

## 9. Dành cho người mới clone dự án

1. Làm theo `README.md` ở thư mục gốc để chạy toàn bộ hệ thống bằng Docker Compose.
2. Đảm bảo truy cập được:
   - `http://localhost:5000/swagger`
   - `http://localhost:5050` (pgAdmin)
   - `https://localhost:8443/nifi` (NiFi)
3. Mở file này (`nifi/README.md`) và thực hiện lần lượt:
   - Thêm JDBC driver.
   - Tạo Controller Service PostgreSQL.
   - Tạo Flow `Read Database Flow` để test.
4. Sau khi test OK, tuỳ chỉnh và tạo thêm các flow phù hợp nhu cầu (export báo cáo, realtime sync, analytics, …).
