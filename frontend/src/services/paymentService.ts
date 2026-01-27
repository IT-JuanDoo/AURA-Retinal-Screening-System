import api from './api';

export interface PaymentHistory {
  id: string;
  userId?: string;
  clinicId?: string;
  packageId: string;
  packageName?: string;
  paymentMethod: string;
  paymentProvider?: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  paymentDate: string;
  receiptUrl?: string;
  notes?: string;
  userPackageId?: string;
}

export interface PaymentHistoryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}

const paymentService = {
  /**
   * Get payment history for current user
   */
  async getPaymentHistory(params?: PaymentHistoryParams): Promise<PaymentHistory[]> {
    const response = await api.get<PaymentHistory[]>('/payments/history', { params });
    return response.data;
  },

  /**
   * Get single payment by ID
   */
  async getPaymentById(paymentId: string): Promise<PaymentHistory> {
    const response = await api.get<PaymentHistory>(`/payments/history/${paymentId}`);
    return response.data;
  },

  /**
   * Helper: Format payment status
   */
  formatStatus(status: string): { label: string; color: string } {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return { label: 'Hoàn thành', color: 'green' };
      case 'pending':
        return { label: 'Đang xử lý', color: 'yellow' };
      case 'failed':
        return { label: 'Thất bại', color: 'red' };
      case 'refunded':
        return { label: 'Hoàn tiền', color: 'blue' };
      case 'cancelled':
        return { label: 'Đã hủy', color: 'gray' };
      default:
        return { label: status, color: 'gray' };
    }
  },

  /**
   * Helper: Format payment method
   */
  formatPaymentMethod(method: string): string {
    switch (method.toLowerCase()) {
      case 'creditcard':
        return 'Thẻ tín dụng';
      case 'debitcard':
        return 'Thẻ ghi nợ';
      case 'banktransfer':
        return 'Chuyển khoản';
      case 'e-wallet':
      case 'ewallet':
        return 'Ví điện tử';
      case 'vnpay':
        return 'VNPay';
      case 'momo':
        return 'MoMo';
      case 'zalopay':
        return 'ZaloPay';
      default:
        return method;
    }
  },

  /**
   * Helper: Format currency
   */
  formatCurrency(amount: number, currency: string = 'VND'): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  },
};

export default paymentService;
