import adminApi from "./adminApi";
import api from "./api";

export interface ServicePackage {
  id: string;
  packageName: string;
  packageType: string; // Individual, Clinic, Enterprise
  description?: string;
  numberOfAnalyses: number;
  price: number;
  currency: string;
  validityDays?: number;
  isActive: boolean;
  createdDate?: string;
  createdBy?: string;
}

export interface CreateServicePackageDto {
  packageName: string;
  packageType: string;
  description?: string;
  numberOfAnalyses: number;
  price: number;
  currency?: string;
  validityDays?: number;
  isActive?: boolean;
  note?: string;
}

export interface UpdateServicePackageDto {
  packageName?: string;
  packageType?: string;
  description?: string;
  numberOfAnalyses?: number;
  price?: number;
  currency?: string;
  validityDays?: number;
  isActive?: boolean;
  note?: string;
}

const packageApi = {
  getAll: async (
    search?: string,
    packageType?: string,
    isActive?: boolean
  ): Promise<ServicePackage[]> => {
    const params: any = {};
    if (search) params.search = search;
    if (packageType) params.packageType = packageType;
    if (isActive !== undefined) params.isActive = isActive;

    const res = await adminApi.get("/admin/packages", { params });
    return res.data;
  },

  getById: async (id: string): Promise<ServicePackage> => {
    const res = await adminApi.get(`/admin/packages/${id}`);
    return res.data;
  },

  create: async (dto: CreateServicePackageDto): Promise<ServicePackage> => {
    const res = await adminApi.post("/admin/packages", dto);
    return res.data;
  },

  update: async (id: string, dto: UpdateServicePackageDto): Promise<void> => {
    await adminApi.put(`/admin/packages/${id}`, dto);
  },

  setStatus: async (id: string, isActive: boolean): Promise<void> => {
    await adminApi.patch(`/admin/packages/${id}/status`, { isActive });
  },

  delete: async (id: string): Promise<void> => {
    await adminApi.delete(`/admin/packages/${id}`);
  },
};

// User-facing API (public packages)
export const userPackageApi = {
  /**
   * Get all active packages available for users
   * Uses /api/payments/packages endpoint which requires authentication
   */
  getAvailablePackages: async (
    packageType?: string
  ): Promise<ServicePackage[]> => {
    const params: any = {};
    if (packageType) params.packageType = packageType;

    const res = await api.get("/payments/packages", { params });
    return res.data;
  },

  /**
   * Get package by ID (for viewing details)
   * Note: This might need to be implemented in backend or use admin endpoint
   */
  getPackageById: async (id: string): Promise<ServicePackage> => {
    const res = await api.get(`/payments/packages/${id}`);
    return res.data;
  },
};

// User Package (purchased packages) API
export interface UserPackage {
  id: string;
  userId?: string;
  clinicId?: string;
  packageId: string;
  packageName?: string;
  remainingAnalyses: number;
  purchasedAt: string;
  expiresAt?: string;
  isActive: boolean;
  isExpired?: boolean;
}

export const userPackageService = {
  /**
   * Get current user's purchased packages
   */
  getMyPackages: async (): Promise<UserPackage[]> => {
    const res = await api.get("/payments/my-packages");
    return res.data;
  },

  /**
   * Get active package with remaining credits
   * Note: This method may cache results. Use getMyPackages() directly for fresh data.
   */
  getActivePackage: async (): Promise<UserPackage | null> => {
    // Always get fresh data from API
    const packages = await userPackageService.getMyPackages();
    const now = new Date();
    
    // Find active package that is not expired and has remaining credits
    // Sort by most recent purchase first
    const sortedPackages = packages
      .filter((pkg) =>
        pkg.isActive &&
        pkg.remainingAnalyses > 0 &&
        (!pkg.expiresAt || new Date(pkg.expiresAt) > now)
      )
      .sort((a, b) => {
        // Prefer packages with later expiry dates
        if (a.expiresAt && b.expiresAt) {
          return new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime();
        }
        if (a.expiresAt) return -1;
        if (b.expiresAt) return 1;
        return 0;
      });
    
    return sortedPackages[0] || null;
  },

  /**
   * Check if user can perform analysis (has active package with credits)
   */
  canPerformAnalysis: async (creditsNeeded: number = 1): Promise<boolean> => {
    const activePackage = await userPackageService.getActivePackage();
    return activePackage !== null && activePackage.remainingAnalyses >= creditsNeeded;
  },
};

// Purchase Package API
export interface PurchasePackageRequest {
  packageId: string;
  paymentMethod: string; // CreditCard, DebitCard, BankTransfer, E-Wallet, Other
  paymentProvider?: string;
  clinicId?: string;
}

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

export const purchaseService = {
  /**
   * Purchase a package
   * Returns either PaymentHistory directly or nested object { payment: PaymentHistory, ... }
   */
  purchasePackage: async (request: PurchasePackageRequest): Promise<PaymentHistory | any> => {
    const res = await api.post("/payments/purchase", request);
    // Backend may return nested structure: { payment: {...}, paymentUrl: ..., gateway: ... }
    // Or direct PaymentHistory object
    return res.data;
  },

  /**
   * Confirm payment (for demo/testing - in production this would be handled by payment gateway)
   */
  confirmPayment: async (paymentId: string): Promise<PaymentHistory> => {
    const res = await api.post(`/payments/${paymentId}/confirm`, {});
    return res.data;
  },
};

// Helper to refresh package info after purchase
export const refreshPackageInfo = async (): Promise<UserPackage | null> => {
  try {
    // Wait a bit for database to be ready
    await new Promise(resolve => setTimeout(resolve, 500));
    return await userPackageService.getActivePackage();
  } catch (error) {
    // Error refreshing package info
    return null;
  }
};

export default packageApi;

