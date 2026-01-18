using System.ComponentModel.DataAnnotations;

namespace Aura.Application.DTOs.Payments;

/// <summary>
/// DTO cho purchase package request
/// </summary>
public class PurchasePackageDto
{
    [Required(ErrorMessage = "PackageId là bắt buộc")]
    public string PackageId { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "PaymentMethod là bắt buộc")]
    public string PaymentMethod { get; set; } = string.Empty; // CreditCard, DebitCard, BankTransfer, E-Wallet, Other
    
    [StringLength(100, ErrorMessage = "PaymentProvider không được vượt quá 100 ký tự")]
    public string? PaymentProvider { get; set; }
    
    public string? ClinicId { get; set; } // For clinic packages
}
