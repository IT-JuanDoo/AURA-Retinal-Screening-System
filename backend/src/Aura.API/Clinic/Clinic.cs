namespace Aura.API.Clinic;

public class Clinic
{
    // 1. Khóa chính
    public string Id { get; set; } = string.Empty;

    // 2. Thông tin cơ bản (Bắt buộc trong DB)
    public string ClinicName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;

    // 3. Thông tin bổ sung (Có thể Null trong DB -> dùng string?)
    public string? RegistrationNumber { get; set; }
    public string? TaxCode { get; set; }
    public string? Phone { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? Country { get; set; } = "Vietnam"; // Default DB là Vietnam
    public string? WebsiteUrl { get; set; }
    
    // 4. Người liên hệ
    public string? ContactPersonName { get; set; }
    public string? ContactPersonPhone { get; set; }

    // 5. Phân loại & Trạng thái
    public string? ClinicType { get; set; } // Hospital, Clinic, ...
    public string VerificationStatus { get; set; } = "Pending"; // Default DB
    public bool IsActive { get; set; } = true; // Default DB
    public DateTime? VerifiedAt { get; set; }
    public string? VerifiedBy { get; set; } // Liên kết với bảng Admins

    // 6. Audit logs (Theo dõi tạo/sửa)
    public DateTime CreatedDate { get; set; } = DateTime.Now;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; } = false;
    public string? Note { get; set; }
}