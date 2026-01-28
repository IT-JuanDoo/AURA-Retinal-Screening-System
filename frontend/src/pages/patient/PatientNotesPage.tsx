import { useMemo, useState, useEffect } from 'react';
import medicalNotesService, { MedicalNote } from '../../services/medicalNotesService';
import toast from 'react-hot-toast';
import PatientHeader from '../../components/patient/PatientHeader';

const PatientNotesPage = () => {
  const [notes, setNotes] = useState<MedicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<MedicalNote | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  // Close note detail on Escape for better UX
  useEffect(() => {
    if (!selectedNote) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNote(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNote]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await medicalNotesService.getMyNotes();
      setNotes(data);
      setLastUpdatedAt(new Date());
    } catch (error: any) {
      console.error('Error loading notes:', error);
      const status = error?.response?.status;
      if (status !== 404) toast.error('Không thể tải ghi chú y tế');
      setLoadError(
        status === 404
          ? 'Chưa có dữ liệu ghi chú y tế hoặc dịch vụ chưa sẵn sàng.'
          : 'Không thể tải ghi chú y tế. Vui lòng thử lại.'
      );
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
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

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      if (typeFilter !== 'all' && note.noteType.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      if (!query) return true;
      return (
        note.noteContent.toLowerCase().includes(query) ||
        note.doctorName?.toLowerCase().includes(query) ||
        note.diagnosis?.toLowerCase().includes(query)
      );
    });
  }, [notes, searchQuery, typeFilter]);

  const noteTypes = medicalNotesService.getNoteTypeOptions();

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased min-h-screen flex flex-col transition-colors duration-200">
      <PatientHeader />

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Ghi chú y tế
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-2">
              <span>Các ghi chú và chẩn đoán từ bác sĩ của bạn</span>
              {lastUpdatedAt && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>
                    Cập nhật:{' '}
                    {lastUpdatedAt.toLocaleTimeString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadNotes}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/30 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8 8 0 104.582 9m0 0H9m11 11v-5h-.581m0 0a8 8 0 01-15.356-2m15.356 2H15" />
              </svg>
              Làm mới
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tổng ghi chú</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{notes.length}</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Chẩn đoán</p>
              <p className="text-2xl font-black text-blue-600 mt-1">
                {notes.filter((n) => n.noteType.toLowerCase() === 'diagnosis').length}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Lịch tái khám</p>
              <p className="text-2xl font-black text-purple-600 mt-1">{notes.filter((n) => n.followUpDate).length}</p>
            </div>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cần lưu ý</p>
              <p className="text-2xl font-black text-red-600 mt-1">
                {notes.filter((n) => n.severity?.toLowerCase() === 'high' || n.severity?.toLowerCase() === 'critical').length}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Tìm kiếm ghi chú (nội dung, bác sĩ, chẩn đoán)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500/50 outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg py-2.5 px-3 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Tất cả loại</option>
                {noteTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notes List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Đang tải ghi chú y tế...</p>
            </div>
          ) : loadError ? (
            <div className="p-10 text-center">
              <div className="max-w-md mx-auto">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-slate-900 dark:text-white">Không thể tải ghi chú</p>
                <p className="text-slate-500 dark:text-slate-400 mt-2">{loadError}</p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    onClick={loadNotes}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
                  >
                    Thử lại
                  </button>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('all');
                    }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/30 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors active:scale-95"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p className="text-lg font-medium text-slate-900 dark:text-white mb-2">Chưa có ghi chú nào</p>
              <p className="text-slate-600 dark:text-slate-400">
                Bác sĩ sẽ ghi chú sau khi khám hoặc khi phân tích kết quả của bạn.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <a
                  href="/upload"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
                >
                  Tải ảnh để phân tích
                </a>
                <a
                  href="/chat"
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/30 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors active:scale-95"
                >
                  Chat tư vấn
                </a>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-5 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
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
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">
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
                            <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Tái khám: {formatDate(note.followUpDate)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button className="text-slate-300 group-hover:text-blue-500 transition-colors">
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
        <div
          className="fixed inset-0 z-50 p-4 bg-black/50 backdrop-blur-[2px] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedNote(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chi tiết ghi chú</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                    BS. {selectedNote.doctorName || 'Bác sĩ'} • {formatDate(selectedNote.createdAt || '')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedNote(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label="Đóng"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5 md:p-6 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getNoteTypeColor(selectedNote.noteType)}`}>
                  {medicalNotesService.formatNoteType(selectedNote.noteType)}
                </span>
                {getSeverityBadge(selectedNote.severity)}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Nội dung ghi chú
                </h4>
                <div className="text-slate-900 dark:text-white whitespace-pre-wrap bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200/60 dark:border-slate-700">
                  {selectedNote.noteContent}
                </div>
              </div>

              {selectedNote.diagnosis && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200/40 dark:border-blue-800/40">
                  <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1">
                    Chẩn đoán
                  </h4>
                  <p className="text-blue-900 dark:text-blue-100 font-semibold">{selectedNote.diagnosis}</p>
                </div>
              )}

              {selectedNote.treatmentPlan && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Kế hoạch điều trị
                  </h4>
                  <div className="text-slate-900 dark:text-white whitespace-pre-wrap bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200/40 dark:border-green-800/40">
                    {selectedNote.treatmentPlan}
                  </div>
                </div>
              )}

              {selectedNote.clinicalObservations && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Quan sát lâm sàng
                  </h4>
                  <div className="text-slate-900 dark:text-white whitespace-pre-wrap bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200/60 dark:border-slate-700">
                    {selectedNote.clinicalObservations}
                  </div>
                </div>
              )}

              {selectedNote.followUpDate && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200/40 dark:border-purple-800/40">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h4 className="text-xs font-semibold uppercase tracking-wider">Lịch tái khám</h4>
                  </div>
                  <p className="text-purple-900 dark:text-purple-100 font-semibold mt-2">
                    {formatDate(selectedNote.followUpDate)}
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 md:p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedNote(null)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
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
