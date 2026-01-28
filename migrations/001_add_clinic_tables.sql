-- =============================================================================
-- Migration: Thêm bảng clinics và clinic_admins (khi DB đã tồn tại từ trước)
-- Chạy khi gặp lỗi: relation "clinic_admins" does not exist
-- =============================================================================
-- Cách chạy (Docker):
--   docker-compose exec -T postgres psql -U aura_user -d aura_db < migrations/001_add_clinic_tables.sql
-- Hoặc:
--   docker exec -i aura-postgres psql -U aura_user -d aura_db < migrations/001_add_clinic_tables.sql
-- =============================================================================

-- Bảng clinics (cần có bảng admins trước do FK VerifiedBy)
CREATE TABLE IF NOT EXISTS clinics (
    Id VARCHAR(255) PRIMARY KEY,
    ClinicName VARCHAR(255) NOT NULL,
    RegistrationNumber VARCHAR(100) UNIQUE,
    TaxCode VARCHAR(50),
    Email VARCHAR(255) NOT NULL UNIQUE,
    Phone VARCHAR(255),
    Address VARCHAR(255) NOT NULL,
    City VARCHAR(100),
    Province VARCHAR(100),
    Country VARCHAR(100) DEFAULT 'Vietnam',
    WebsiteUrl VARCHAR(500),
    ContactPersonName VARCHAR(255),
    ContactPersonPhone VARCHAR(255),
    ClinicType VARCHAR(50) CHECK (ClinicType IN ('Hospital', 'Clinic', 'Medical Center', 'Other')),
    VerificationStatus VARCHAR(50) DEFAULT 'Pending' CHECK (VerificationStatus IN ('Pending', 'Approved', 'Rejected', 'Suspended')),
    IsActive BOOLEAN DEFAULT TRUE,
    VerifiedAt TIMESTAMP,
    VerifiedBy VARCHAR(255) REFERENCES admins(Id),
    CreatedDate DATE,
    CreatedBy VARCHAR(255),
    UpdatedDate DATE,
    UpdatedBy VARCHAR(255),
    IsDeleted BOOLEAN DEFAULT FALSE,
    Note VARCHAR(255)
);

-- Bảng clinic_admins
CREATE TABLE IF NOT EXISTS clinic_admins (
    Id VARCHAR(255) PRIMARY KEY,
    ClinicId VARCHAR(255) NOT NULL REFERENCES clinics(Id) ON DELETE CASCADE,
    Email VARCHAR(255) NOT NULL UNIQUE,
    PasswordHash VARCHAR(500) NOT NULL,
    FullName VARCHAR(255) NOT NULL,
    Phone VARCHAR(50),
    Role VARCHAR(50) DEFAULT 'ClinicAdmin' CHECK (Role IN ('ClinicAdmin', 'ClinicManager', 'ClinicStaff')),
    IsActive BOOLEAN DEFAULT TRUE,
    LastLoginAt TIMESTAMP,
    PasswordResetToken VARCHAR(500),
    PasswordResetExpires TIMESTAMP,
    RefreshToken VARCHAR(500),
    RefreshTokenExpires TIMESTAMP,
    CreatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CreatedBy VARCHAR(255),
    UpdatedDate TIMESTAMP,
    UpdatedBy VARCHAR(255),
    IsDeleted BOOLEAN DEFAULT FALSE,
    Note VARCHAR(255)
);

-- Index cho clinic_admins (bỏ qua nếu đã tồn tại)
CREATE INDEX IF NOT EXISTS idx_clinic_admins_clinic_id ON clinic_admins(ClinicId);
CREATE INDEX IF NOT EXISTS idx_clinic_admins_email ON clinic_admins(Email);
CREATE INDEX IF NOT EXISTS idx_clinic_admins_is_active ON clinic_admins(IsActive);

-- Index cho clinics (nếu chưa có)
CREATE INDEX IF NOT EXISTS idx_clinics_email ON clinics(Email);
CREATE INDEX IF NOT EXISTS idx_clinics_verification_status ON clinics(VerificationStatus);
CREATE INDEX IF NOT EXISTS idx_clinics_is_active ON clinics(IsActive);
CREATE INDEX IF NOT EXISTS idx_clinics_is_deleted ON clinics(IsDeleted);
