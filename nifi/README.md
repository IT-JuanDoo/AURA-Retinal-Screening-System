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

   | Property                        | Giá trị                                                                 |
   |---------------------------------|-------------------------------------------------------------------------|
   | Database Connection URL         | `jdbc:postgresql://postgres:5432/aura_db`                              |
   | Database Driver Class Name      | `org.postgresql.Driver`                                                |
   | Database Driver Location(s)     | `/opt/nifi/nifi-current/lib/postgresql-42.7.0.jar`                     |
   | Database User                   | `aura_user`                                                            |
   | Password                        | `aura_password_2024`                                                   |
   | Max Wait Time                   | `30 seconds`                                                           |
   | Max Total Connections           | `10`                                                                   |
   | Validation Query                | `SELECT 1`                                                             |

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

- **Flow Analytics**  
  - `ExecuteSQL` chạy các query tổng hợp (COUNT, AVG…) trên `analysis_results`.  
  - `PutFile` hoặc `PutDatabaseRecord` lưu kết quả tổng hợp.

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

