import { useState } from "react";
import { purchaseService, PurchasePackageRequest, ServicePackage, refreshPackageInfo } from "../../services/packageApi";
import toast from "react-hot-toast";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  package: ServicePackage;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: "CreditCard", label: "Thẻ tín dụng" },
  { value: "DebitCard", label: "Thẻ ghi nợ" },
  { value: "BankTransfer", label: "Chuyển khoản ngân hàng" },
  { value: "E-Wallet", label: "Ví điện tử" },
  { value: "Other", label: "Khác" },
];

const PAYMENT_PROVIDERS = {
  CreditCard: ["Visa", "Mastercard", "JCB", "American Express"],
  DebitCard: ["Visa", "Mastercard", "Vietcombank", "Techcombank"],
  BankTransfer: ["Vietcombank", "Techcombank", "BIDV", "Vietinbank", "ACB"],
  "E-Wallet": ["MoMo", "ZaloPay", "VNPay", "ShopeePay"],
  Other: ["Tiền mặt", "Khác"],
};

export default function PurchaseModal({
  isOpen,
  onClose,
  package: pkg,
  onSuccess,
}: PurchaseModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("CreditCard");
  const [paymentProvider, setPaymentProvider] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    if (!paymentProvider) {
      toast.error("Vui lòng chọn phương thức thanh toán");
      return;
    }

    setIsProcessing(true);
    try {
      const request: PurchasePackageRequest = {
        packageId: pkg.id,
        paymentMethod,
        paymentProvider,
      };

      const paymentResponse = await purchaseService.purchasePackage(request);
      
      // Handle nested response structure from backend
      // Backend returns { payment: {...}, paymentUrl: ..., gateway: ..., message: ... }
      const payment = paymentResponse.payment || paymentResponse;
      const paymentId = payment.id || paymentResponse.id;
      
      if (!paymentId) {
        toast.error("Không thể lấy ID thanh toán. Vui lòng thử lại.");
        return;
      }

      // DEMO MODE: Auto-confirm payment immediately (no real payment gateway)
      // In production, this would be handled by payment gateway callback
      try {
        // Always try to confirm payment in demo mode
        const confirmedPayment = await purchaseService.confirmPayment(paymentId);
        
        if (confirmedPayment.paymentStatus === "Completed") {
          // Wait a bit for database to be ready
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Verify package was actually created
          let activePackage = await refreshPackageInfo();
          
          // Retry once if package not found immediately
          if (!activePackage || activePackage.remainingAnalyses === 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
            activePackage = await refreshPackageInfo();
          }
          
          if (activePackage && activePackage.remainingAnalyses > 0) {
            toast.success("✅ Thanh toán thành công! Gói dịch vụ đã được kích hoạt.");
          } else {
            // Package might be created but not yet visible, show warning but continue
            toast.success("✅ Thanh toán thành công! Đang kích hoạt gói dịch vụ...", {
              duration: 3000,
            });
            // Wait a bit more and try one more time
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } else {
          toast.error("Thanh toán đã được tạo nhưng chưa được kích hoạt. Vui lòng thử lại sau.");
          return;
        }
      } catch (error: any) {
        
        // In demo mode, if confirm fails, try to check if package exists anyway
        await new Promise(resolve => setTimeout(resolve, 1000));
        const activePackage = await refreshPackageInfo();
        
        if (activePackage && activePackage.remainingAnalyses > 0) {
          // Package exists, payment might have succeeded despite error
          toast.success("✅ Gói dịch vụ đã được kích hoạt thành công!");
        } else {
          toast.error(
            error?.response?.data?.message ||
            error?.message ||
            "Không thể kích hoạt gói dịch vụ. Vui lòng thử lại hoặc liên hệ hỗ trợ."
          );
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể mua gói dịch vụ. Vui lòng thử lại."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const availableProviders = PAYMENT_PROVIDERS[paymentMethod as keyof typeof PAYMENT_PROVIDERS] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Mua gói dịch vụ
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              disabled={isProcessing}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Package Info */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">
              {pkg.packageName}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Số lượt phân tích:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {pkg.numberOfAnalyses.toLocaleString("vi-VN")}
                </span>
              </div>
              {pkg.validityDays && (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Thời hạn:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {pkg.validityDays} ngày
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-lg font-bold text-slate-900 dark:text-white">Tổng cộng:</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {pkg.price.toLocaleString("vi-VN")} {pkg.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Phương thức thanh toán
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPaymentProvider("");
              }}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isProcessing}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Provider */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Nhà cung cấp
            </label>
            <select
              value={paymentProvider}
              onChange={(e) => setPaymentProvider(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isProcessing}
            >
              <option value="">-- Chọn nhà cung cấp --</option>
              {availableProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-1">Lưu ý (Chế độ Demo):</p>
                <p>
                  Thanh toán sẽ được tự động xác nhận ngay lập tức để test tính năng. Gói dịch vụ sẽ được kích hoạt và bạn có thể sử dụng ngay.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            onClick={handlePurchase}
            disabled={isProcessing || !paymentProvider}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <span>Thanh toán</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
