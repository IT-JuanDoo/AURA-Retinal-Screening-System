import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import medicalNotesService, { MedicalNote } from '../../services/medicalNotesService';
import toast from 'react-hot-toast';

const PatientNotesPage = () => {
  const { user } = useAuthStore();
  const [notes, setNotes] = useState<MedicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<MedicalNote | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await medicalNotesService.getMyNotes();
      setNotes(data);
    } catch (error: any) {
      // Error loading notes
      if (error?.response?.status !== 404) {
        toast.error('Không thể tải ghi chú y tế');
      }
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSeverityBadge = (severity?: string) => {
    const { label, color } = medicalNotesService.formatSeverity(severity);
    const colorClasses: Record<string, string> = {
      red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      gray: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses[color]}`}>
        {label}
      </span>
    );
  };

  const getNoteTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'diagnosis':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'followup':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      case 'treatment':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'observation':
        return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'prescription':
        return 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const filteredNotes = notes.filter(note => {
    if (typeFilter !== 'all' && note.noteType.toLowerCase() !== typeFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        note.noteContent.toLowerCase().includes(query) ||
        note.doctorName?.toLowerCase().includes(query) ||
        note.diagnosis?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const noteTypes = medicalNotesService.getNoteTypeOptions();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">AURA</span>
              </Link>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/dashboard" className="text-sm text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400">
                Trang chủ
              </Link>
              <Link to="/reports" className="text-sm text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400">
                Kết quả
              </Link>
              <Link to="/notes" className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Ghi chú y tế
              </Link>
              <Link to="/chat" className="text-sm text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400">
                Tư vấn
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {user?.firstName} {user?.lastName}
              </span>
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {user?.firstName?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Ghi chú y tế
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Các ghi chú và chẩn đoán từ bác sĩ của bạn
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Tổng ghi chú</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{notes.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Chẩn đoán</p>
            <p className="text-2xl font-bold text-blue-600">
              {notes.filter(n => n.noteType.toLowerCase() === 'diagnosis').length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Lịch tái khám</p>
            <p className="text-2xl font-bold text-purple-600">
              {notes.filter(n => n.followUpDate).length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Cần lưu ý</p>
            <p className="text-2xl font-bold text-red-600">
              {notes.filter(n => n.severity?.toLowerCase() === 'high' || n.severity?.toLowerCase() === 'critical').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Tìm kiếm ghi chú..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="all">Tất cả loại</option>
                {noteTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notes List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tải...</p>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">Chưa có ghi chú nào</p>
              <p className="text-slate-600 dark:text-slate-400">
                Bác sĩ sẽ ghi chú sau khi khám hoặc phân tích kết quả của bạn
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedNote(note)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getNoteTypeColor(note.noteType)}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          BS. {note.doctorName || 'Bác sĩ'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getNoteTypeColor(note.noteType)}`}>
                          {medicalNotesService.formatNoteType(note.noteType)}
                        </span>
                        {getSeverityBadge(note.severity)}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                        {note.noteContent}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>{formatDate(note.createdAt || '')}</span>
                        {note.followUpDate && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              📅 Tái khám: {formatDate(note.followUpDate)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button className="text-slate-400 hover:text-blue-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Note Detail Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chi tiết ghi chú</h2>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getNoteTypeColor(selectedNote.noteType)}`}>
                  {medicalNotesService.formatNoteType(selectedNote.noteType)}
                </span>
                {getSeverityBadge(selectedNote.severity)}
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Bác sĩ</h4>
                <p className="text-blue-900 dark:text-blue-100 font-medium">BS. {selectedNote.doctorName || 'N/A'}</p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Nội dung ghi chú</h4>
                <p className="text-slate-900 dark:text-white whitespace-pre-wrap bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  {selectedNote.noteContent}
                </p>
              </div>

              {selectedNote.diagnosis && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Chẩn đoán</h4>
                  <p className="text-slate-900 dark:text-white font-medium">{selectedNote.diagnosis}</p>
                </div>
              )}

              {selectedNote.treatmentPlan && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Kế hoạch điều trị</h4>
                  <p className="text-slate-900 dark:text-white whitespace-pre-wrap bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    {selectedNote.treatmentPlan}
                  </p>
                </div>
              )}

              {selectedNote.clinicalObservations && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Quan sát lâm sàng</h4>
                  <p className="text-slate-900 dark:text-white whitespace-pre-wrap">{selectedNote.clinicalObservations}</p>
                </div>
              )}

              {selectedNote.followUpDate && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">📅 Lịch tái khám</h4>
                  <p className="text-purple-900 dark:text-purple-100 font-medium">
                    {formatDate(selectedNote.followUpDate)}
                  </p>
                </div>
              )}

              <div className="text-sm text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-800">
                Ngày tạo: {formatDate(selectedNote.createdAt || '')}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedNote(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientNotesPage;
