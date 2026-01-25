import { useState, useEffect } from "react";
import PatientHeader from "../../components/patient/PatientHeader";
import { userPackageApi, ServicePackage } from "../../services/packageApi";
import PurchaseModal from "../../components/patient/PurchaseModal";
import toast from "react-hot-toast";

const PackagesPage = () => {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  useEffect(() => {
    loadPackages();
  }, [selectedType]);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const packageType = selectedType === "all" ? undefined : selectedType;
      const data = await userPackageApi.getAvailablePackages(packageType);
      setPackages(data);
    } catch (error: any) {
      console.error("Error loading packages:", error);
      toast.error("Không thể tải danh sách gói dịch vụ");
    } finally {
      setLoading(false);
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        pkg.packageName.toLowerCase().includes(query) ||
        pkg.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getPackageTypeLabel = (type: string) => {
    switch (type) {
      case "Individual":
        return "Cá nhân";
      case "Clinic":
        return "Phòng khám";
      case "Enterprise":
        return "Doanh nghiệp";
      default:
        return type;
    }
  };

  const getPackageTypeColor = (type: string) => {
    switch (type) {
      case "Individual":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "Clinic":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "Enterprise":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const handlePurchase = (pkg: ServicePackage) => {
    setSelectedPackage(pkg);
    setIsPurchaseModalOpen(true);
  };

  const handlePurchaseSuccess = async () => {
    // Wait a bit for database to be ready
    await new Promise(resolve => setTimeout(resolve, 500));
    // Reload packages to show updated info
    await loadPackages();
  };

  const stats = {
    total: packages.length,
    individual: packages.filter((p) => p.packageType === "Individual").length,
    clinic: packages.filter((p) => p.packageType === "Clinic").length,
    enterprise: packages.filter((p) => p.packageType === "Enterprise").length,
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      <PatientHeader />

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            Gói Dịch Vụ
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Chọn gói dịch vụ phù hợp với nhu cầu của bạn
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Tìm kiếm gói dịch vụ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedType("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedType === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Tất cả ({stats.total})
              </button>
              <button
                onClick={() => setSelectedType("Individual")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedType === "Individual"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Cá nhân ({stats.individual})
              </button>
              <button
                onClick={() => setSelectedType("Clinic")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedType === "Clinic"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Phòng khám ({stats.clinic})
              </button>
              <button
                onClick={() => setSelectedType("Enterprise")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedType === "Enterprise"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Doanh nghiệp ({stats.enterprise})
              </button>
            </div>
          </div>
        </div>

        {/* Packages Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Đang tải danh sách gói...
            </p>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <p className="text-slate-600 dark:text-slate-400">
              Không tìm thấy gói dịch vụ nào
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
              >
                {/* Package Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {pkg.packageName}
                    </h3>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPackageTypeColor(
                        pkg.packageType
                      )}`}
                    >
                      {getPackageTypeLabel(pkg.packageType)}
                    </span>
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                      {pkg.description}
                    </p>
                  )}
                </div>

                {/* Package Details */}
                <div className="p-6 flex-grow">
                  <div className="space-y-4">
                    {/* Price */}
                    <div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white">
                        {pkg.price.toLocaleString("vi-VN")} {pkg.currency}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        / gói
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <svg
                          className="w-5 h-5 text-green-600 dark:text-green-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-slate-700 dark:text-slate-300">
                          <strong>{pkg.numberOfAnalyses.toLocaleString("vi-VN")}</strong> lượt phân tích
                        </span>
                      </div>
                      {pkg.validityDays && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg
                            className="w-5 h-5 text-blue-600 dark:text-blue-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="text-slate-700 dark:text-slate-300">
                            Hiệu lực <strong>{pkg.validityDays} ngày</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="p-6 pt-0">
                  <button
                    onClick={() => handlePurchase(pkg)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Đăng ký ngay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Purchase Modal */}
        {selectedPackage && (
          <PurchaseModal
            isOpen={isPurchaseModalOpen}
            onClose={() => {
              setIsPurchaseModalOpen(false);
              setSelectedPackage(null);
            }}
            package={selectedPackage}
            onSuccess={handlePurchaseSuccess}
          />
        )}
      </main>
    </div>
  );
};

export default PackagesPage;
