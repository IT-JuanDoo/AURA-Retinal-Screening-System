using Aura.Application.DTOs.Export;

namespace Aura.Application.Services.Export;

/// <summary>
/// Service xử lý export báo cáo phân tích (FR-7)
/// Hỗ trợ export PDF, CSV, JSON với đa ngôn ngữ (vi/en)
/// </summary>
public interface IExportService
{
    #region Single Export
    
    /// <summary>
    /// Export kết quả phân tích sang PDF
    /// </summary>
    /// <param name="analysisResultId">ID của kết quả phân tích</param>
    /// <param name="userId">ID của người dùng</param>
    /// <param name="requestedByType">Loại người yêu cầu: User, Doctor, Admin, Clinic</param>
    /// <param name="includeImages">Có bao gồm hình ảnh không</param>
    /// <param name="includePatientInfo">Có bao gồm thông tin bệnh nhân không</param>
    /// <param name="language">Ngôn ngữ: vi hoặc en</param>
    /// <returns>Thông tin báo cáo đã export</returns>
    Task<ExportResponseDto> ExportToPdfAsync(
        string analysisResultId, 
        string userId, 
        string requestedByType, 
        bool includeImages = true,
        bool includePatientInfo = true,
        string language = "vi");

    /// <summary>
    /// Export kết quả phân tích sang CSV
    /// </summary>
    /// <param name="analysisResultId">ID của kết quả phân tích</param>
    /// <param name="userId">ID của người dùng</param>
    /// <param name="requestedByType">Loại người yêu cầu</param>
    /// <param name="language">Ngôn ngữ: vi hoặc en</param>
    /// <returns>Thông tin báo cáo đã export</returns>
    Task<ExportResponseDto> ExportToCsvAsync(
        string analysisResultId, 
        string userId, 
        string requestedByType,
        string language = "vi");

    /// <summary>
    /// Export kết quả phân tích sang JSON
    /// </summary>
    /// <param name="analysisResultId">ID của kết quả phân tích</param>
    /// <param name="userId">ID của người dùng</param>
    /// <param name="requestedByType">Loại người yêu cầu</param>
    /// <returns>Thông tin báo cáo đã export</returns>
    Task<ExportResponseDto> ExportToJsonAsync(
        string analysisResultId, 
        string userId, 
        string requestedByType);
    
    #endregion

    #region Batch Export
    
    /// <summary>
    /// Export nhiều kết quả phân tích cùng lúc sang CSV
    /// </summary>
    /// <param name="analysisResultIds">Danh sách ID kết quả phân tích</param>
    /// <param name="userId">ID của người dùng</param>
    /// <param name="requestedByType">Loại người yêu cầu</param>
    /// <param name="language">Ngôn ngữ: vi hoặc en</param>
    /// <returns>Thông tin các báo cáo đã export</returns>
    Task<BatchExportResponseDto> ExportBatchToCsvAsync(
        List<string> analysisResultIds,
        string userId,
        string requestedByType,
        string language = "vi");
    
    #endregion

    #region Export History
    
    /// <summary>
    /// Lấy lịch sử export của người dùng
    /// </summary>
    /// <param name="userId">ID của người dùng</param>
    /// <param name="limit">Số lượng tối đa</param>
    /// <param name="offset">Vị trí bắt đầu</param>
    /// <returns>Danh sách báo cáo đã export</returns>
    Task<List<ExportResponseDto>> GetExportHistoryAsync(string userId, int limit = 50, int offset = 0);

    /// <summary>
    /// Lấy thông tin chi tiết của một báo cáo đã export
    /// </summary>
    /// <param name="exportId">ID của báo cáo</param>
    /// <param name="userId">ID của người dùng</param>
    /// <returns>Thông tin báo cáo</returns>
    Task<ExportResponseDto?> GetExportByIdAsync(string exportId, string userId);
    
    /// <summary>
    /// Tăng số lượt download của báo cáo
    /// </summary>
    /// <param name="exportId">ID của báo cáo</param>
    /// <param name="userId">ID của người dùng</param>
    /// <returns>True nếu thành công</returns>
    Task<bool> IncrementDownloadCountAsync(string exportId, string userId);

    /// <summary>
    /// Xóa báo cáo đã export (soft delete)
    /// </summary>
    /// <param name="exportId">ID của báo cáo</param>
    /// <param name="userId">ID của người dùng</param>
    /// <returns>True nếu xóa thành công</returns>
    Task<bool> DeleteExportAsync(string exportId, string userId);
    
    /// <summary>
    /// Xóa các báo cáo đã hết hạn
    /// </summary>
    /// <returns>Số báo cáo đã xóa</returns>
    Task<int> CleanupExpiredExportsAsync();
    
    /// <summary>
    /// Download file export từ Cloudinary (proxy để tránh authentication issues)
    /// </summary>
    /// <param name="exportId">ID của báo cáo</param>
    /// <param name="userId">ID của người dùng</param>
    /// <returns>File bytes hoặc null nếu không tìm thấy</returns>
    Task<byte[]?> DownloadExportFileAsync(string exportId, string userId);
    
    #endregion
}
