import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import doctorService from '../../services/doctorService';
import patientAssignmentService from '../../services/patientAssignmentService';
import toast from 'react-hot-toast';
import DoctorHeader from '../../components/doctor/DoctorHeader';
import PatientHistoryTimeline from '../../components/doctor/PatientHistoryTimeline';

const PatientProfilePage = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

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

  const handleAssignPatient = async () => {
    if (!patientId) {
      toast.error('Không tìm thấy ID bệnh nhân');
      return;
    }
    
    try {
      setAssigning(true);
      
      // Validate patientId
      const trimmedPatientId = patientId.trim();
      if (!trimmedPatientId || trimmedPatientId === '') {
        toast.error('ID bệnh nhân không hợp lệ');
        return;
      }
      
      // Get current doctor info to verify doctor is authenticated
      const currentDoctor = await doctorService.getCurrentDoctor();
      if (!currentDoctor || !currentDoctor.id) {
        toast.error('Không tìm thấy thông tin bác sĩ. Vui lòng đăng nhập lại.');
        return;
      }
      
      // Prepare assignment payload
      // clinicId is optional - only include if we have a valid UUID/ID
      // Do NOT use hospitalAffiliation as it's a name, not an ID
      const assignmentRequest: {
        userId: string;
        clinicId?: string;
      } = {
        userId: trimmedPatientId,
      };
      
      // Only add clinicId if patient has a valid clinicId
      // Check if it looks like a UUID (basic validation)
      if (patient?.clinicId && 
          typeof patient.clinicId === 'string' && 
          patient.clinicId.trim() !== '' &&
          patient.clinicId.length >= 10) { // Basic validation - UUIDs are typically 36 chars
        assignmentRequest.clinicId = patient.clinicId.trim();
      }
      
      console.log('Assigning patient:', {
        userId: assignmentRequest.userId,
        clinicId: assignmentRequest.clinicId || '(not included)',
        doctorId: currentDoctor.id,
        hasClinicId: !!assignmentRequest.clinicId,
      });
      
      // Call service to create assignment
      await patientAssignmentService.createAssignment(assignmentRequest);
      
      toast.success('Đã gán bệnh nhân cho bác sĩ hiện tại');
      
      // Wait a bit for backend to fully process
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Reload patient data to get updated assignment status
      await loadPatientData();
    } catch (error: any) {
      console.error('Error assigning patient:', error);
      
      // Extract error message with priority order
      let errorMessage = 'Lỗi khi gán bệnh nhân';
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // Handle specific HTTP status codes
      const status = error?.response?.status;
      if (status === 400) {
        errorMessage = errorMessage || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
      } else if (status === 401) {
        errorMessage = 'Chưa xác thực. Vui lòng đăng nhập lại.';
      } else if (status === 404) {
        errorMessage = 'Không tìm thấy bệnh nhân hoặc bác sĩ.';
      } else if (status === 409) {
        errorMessage = 'Bệnh nhân đã được gán cho bác sĩ này rồi.';
      } else if (status === 500) {
        errorMessage = 'Lỗi server khi tạo assignment. Vui lòng thử lại sau hoặc liên hệ admin.';
      }
      
      toast.error(errorMessage);
      
      // Comprehensive error logging for debugging
      console.error('=== Assignment Error Details ===');
      console.error('Status:', status);
      console.error('Status Text:', error?.response?.statusText);
      console.error('Response Data:', error?.response?.data);
      console.error('Request Config:', {
        url: error?.config?.url,
        method: error?.config?.method,
        data: error?.config?.data,
        headers: error?.config?.headers,
      });
      console.error('Full Error Object:', error);
      console.error('================================');
    } finally {
      setAssigning(false);
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
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/doctor/dashboard')}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 mb-2 flex items-center gap-2"
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
          <div className="flex flex-wrap items-center gap-3">
            {patient?.assignedAt ? (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Đã được phân công cho bác sĩ hiện tại
              </span>
            ) : (
              <button
                onClick={handleAssignPatient}
                disabled={assigning}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {assigning ? 'Đang gán...' : 'Gán bệnh nhân cho tôi'}
              </button>
            )}
          </div>
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
