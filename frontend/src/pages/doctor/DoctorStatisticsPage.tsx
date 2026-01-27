import { useState, useEffect } from 'react';
import DoctorHeader from '../../components/doctor/DoctorHeader';
import doctorService, { DoctorStatisticsDto } from '../../services/doctorService';

interface MonthlyStats {
  month: string;
  analyses: number;
  patients: number;
}

const DoctorStatisticsPage = () => {
  const [statistics, setStatistics] = useState<DoctorStatisticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('6months');

  // Mock monthly data - in real app, this would come from API
  const monthlyStats: MonthlyStats[] = [
    { month: 'T8', analyses: 45, patients: 12 },
    { month: 'T9', analyses: 62, patients: 18 },
    { month: 'T10', analyses: 58, patients: 15 },
    { month: 'T11', analyses: 75, patients: 22 },
    { month: 'T12', analyses: 89, patients: 28 },
    { month: 'T1', analyses: 95, patients: 32 },
  ];

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const data = await doctorService.getStatistics();
      setStatistics(data);
    } catch (error: any) {
      console.error('Error loading statistics:', error);
      // Use mock data for demo
      setStatistics({
        totalPatients: 45,
        activeAssignments: 32,
        totalAnalyses: 156,
        pendingAnalyses: 8,
        medicalNotesCount: 89,
      });
    } finally {
      setLoading(false);
    }
  };

  const maxAnalyses = Math.max(...monthlyStats.map(s => s.analyses));
  const maxPatients = Math.max(...monthlyStats.map(s => s.patients));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DoctorHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Thống kê hoạt động
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Tổng quan về hoạt động của bạn
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tải...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tổng bệnh nhân</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                      {statistics?.totalPatients || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2zM16 4a3 3 0 100 6 3 3 0 000-6zM6.343 6.343a4 4 0 115.657 5.657M6 20h4a3 3 0 003-3v-4a3 3 0 00-3-3H6a3 3 0 00-3 3v4a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Đang hoạt động</p>
                    <p className="text-3xl font-bold text-green-600">
                      {statistics?.activeAssignments || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tổng phân tích</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {statistics?.totalAnalyses || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Chờ xử lý</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {statistics?.pendingAnalyses || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Ghi chú y tế</p>
                    <p className="text-3xl font-bold text-pink-600">
                      {statistics?.medicalNotesCount || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Analyses Chart */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Số lượng phân tích</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Theo tháng</p>
                  </div>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="6months">6 tháng qua</option>
                    <option value="1year">12 tháng qua</option>
                  </select>
                </div>
                <div className="h-48 flex items-end justify-between gap-2 px-2">
                  {monthlyStats.map((item, index) => {
                    const heightPercent = (item.analyses / maxAnalyses) * 100;
                    const isLatest = index === monthlyStats.length - 1;
                    return (
                      <div key={item.month} className="flex-1 flex flex-col items-center group relative">
                        <div 
                          className={`w-full rounded-t transition-all cursor-pointer ${
                            isLatest 
                              ? 'bg-blue-500 hover:bg-blue-600' 
                              : 'bg-blue-200 dark:bg-blue-900/50 hover:bg-blue-300 dark:hover:bg-blue-800'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.analyses}
                          </div>
                        </div>
                        <span className={`mt-2 text-xs font-medium ${isLatest ? 'text-blue-600' : 'text-slate-400'}`}>
                          {item.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Patients Chart */}
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Bệnh nhân mới</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Theo tháng</p>
                  </div>
                </div>
                <div className="h-48 flex items-end justify-between gap-2 px-2">
                  {monthlyStats.map((item, index) => {
                    const heightPercent = (item.patients / maxPatients) * 100;
                    const isLatest = index === monthlyStats.length - 1;
                    return (
                      <div key={item.month} className="flex-1 flex flex-col items-center group relative">
                        <div 
                          className={`w-full rounded-t transition-all cursor-pointer ${
                            isLatest 
                              ? 'bg-green-500 hover:bg-green-600' 
                              : 'bg-green-200 dark:bg-green-900/50 hover:bg-green-300 dark:hover:bg-green-800'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.patients}
                          </div>
                        </div>
                        <span className={`mt-2 text-xs font-medium ${isLatest ? 'text-green-600' : 'text-slate-400'}`}>
                          {item.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Chỉ số hiệu suất</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Tỷ lệ xử lý</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">94%</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '94%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Thời gian phản hồi TB</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">2.5 giờ</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Độ hài lòng bệnh nhân</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">4.8/5</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: '96%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default DoctorStatisticsPage;
