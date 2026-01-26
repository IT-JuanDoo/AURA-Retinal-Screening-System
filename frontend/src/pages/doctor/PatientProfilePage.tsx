import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import doctorService from '../../services/doctorService';
import toast from 'react-hot-toast';
import DoctorHeader from '../../components/doctor/DoctorHeader';
import PatientHistoryTimeline from '../../components/doctor/PatientHistoryTimeline';

const PatientProfilePage = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const patientData = await doctorService.getPatient(patientId!);
      setPatient(patientData);
    } catch (error: any) {
      console.error('Error loading patient data:', error);
      toast.error(error?.response?.data?.message || 'Lỗi khi tải thông tin bệnh nhân');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DoctorHeader />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tải...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <DoctorHeader />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              Không tìm thấy bệnh nhân
            </p>
            <button
              onClick={() => navigate('/doctor/dashboard')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Quay lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DoctorHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/doctor/dashboard')}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 mb-4 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Hồ sơ Bệnh nhân
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Patient Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Patient Card */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="text-center mb-6">
                <div
                  className="w-24 h-24 rounded-full bg-cover bg-center mx-auto mb-4 ring-4 ring-slate-100 dark:ring-slate-800"
                  style={{
                    backgroundImage: `url("${patient.profileImageUrl || `https://ui-avatars.com/api/?name=${patient.firstName || 'Patient'}&background=2b8cee&color=fff`}")`,
                  }}
                />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {patient.firstName && patient.lastName
                    ? `${patient.firstName} ${patient.lastName}`
                    : patient.email}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{patient.email}</p>
              </div>

              <div className="space-y-4">
                {patient.phone && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Điện thoại</p>
                    <p className="text-slate-900 dark:text-white">{patient.phone}</p>
                  </div>
                )}
                {patient.dob && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Ngày sinh</p>
                    <p className="text-slate-900 dark:text-white">{formatDate(patient.dob)}</p>
                  </div>
                )}
                {patient.gender && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Giới tính</p>
                    <p className="text-slate-900 dark:text-white">
                      {patient.gender === 'Male' ? 'Nam' : patient.gender === 'Female' ? 'Nữ' : 'Khác'}
                    </p>
                  </div>
                )}
                {patient.clinicName && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Phòng khám</p>
                    <p className="text-slate-900 dark:text-white">{patient.clinicName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Ngày phân công</p>
                  <p className="text-slate-900 dark:text-white">{formatDate(patient.assignedAt)}</p>
                </div>
              </div>
            </div>

            {/* Statistics Card */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Thống kê</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Tổng phân tích</span>
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">
                    {patient.analysisCount || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Ghi chú y tế</span>
                  <span className="text-lg font-semibold text-slate-900 dark:text-white">
                    {patient.medicalNotesCount || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - History Timeline */}
          <div className="lg:col-span-2">
            <PatientHistoryTimeline patientId={patientId!} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientProfilePage;
