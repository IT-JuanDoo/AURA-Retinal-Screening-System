import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import imageService, { ImageUploadResponse } from '../../services/imageService';
import analysisService from '../../services/analysisService';
import toast from 'react-hot-toast';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: 'uploading' | 'uploaded' | 'error';
  progress: number;
  uploadResponse?: ImageUploadResponse;
  errorMessage?: string;
}

const ImageUploadPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const createPreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newImages: UploadedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      const validExtensions = ['.jpg', '.jpeg', '.png', '.dicom', '.dcm'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(fileExtension)) {
        toast.error(`File ${file.name} không được hỗ trợ`);
        continue;
      }

      // Validate file size (50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`File ${file.name} vượt quá 50MB`);
        continue;
      }

      const preview = await createPreview(file);
      const tempId = `temp-${Date.now()}-${i}`;

      newImages.push({
        id: tempId,
        file,
        preview,
        status: 'uploading',
        progress: 0,
      });
    }

    setUploadedImages((prev) => [...prev, ...newImages]);

    // Upload images
    for (const image of newImages) {
      uploadImage(image);
    }
  }, []);

  const uploadImage = async (image: UploadedImage) => {
    try {
      setUploadedImages((prev) =>
        prev.map((img) =>
          img.id === image.id ? { ...img, status: 'uploading', progress: 0 } : img
        )
      );

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadedImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? { ...img, progress: Math.min(img.progress + 10, 90) }
              : img
          )
        );
      }, 200);

      const response = await imageService.uploadImage(image.file);

      clearInterval(progressInterval);

      setUploadedImages((prev) =>
        prev.map((img) =>
          img.id === image.id
            ? {
                ...img,
                status: 'uploaded',
                progress: 100,
                uploadResponse: response,
              }
            : img
        )
      );
    } catch (error: any) {
      setUploadedImages((prev) =>
        prev.map((img) =>
          img.id === image.id
            ? {
                ...img,
                status: 'error',
                errorMessage: error.message || 'Lỗi khi tải lên',
              }
            : img
        )
      );
      toast.error(`Lỗi khi tải lên ${image.file.name}: ${error.message}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    // Only process if files exist
    if (files && files.length > 0) {
      // Process files first (await to ensure it completes)
      await handleFileSelect(files);
      // Reset input value after processing to allow selecting the same file again
      if (e.target) {
        e.target.value = '';
      }
    }
  }, [handleFileSelect]);

  const handleRemoveImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleClearAll = () => {
    setUploadedImages([]);
  };

  const handleStartAnalysis = async () => {
    const readyImages = uploadedImages.filter(
      (img) => img.status === 'uploaded' && img.uploadResponse
    );

    if (readyImages.length === 0) {
      toast.error('Vui lòng tải lên ít nhất một ảnh');
      return;
    }

    setIsAnalyzing(true);

    try {
      const imageIds = readyImages
        .map((img) => img.uploadResponse?.id)
        .filter((id): id is string => !!id);

      const response = await analysisService.startAnalysis({ imageIds });

      toast.success('Phân tích đã được bắt đầu');

      // Navigate to results page or show results
      if (Array.isArray(response) && response.length > 0) {
        navigate(`/analysis/${response[0].analysisId}`);
      } else if (!Array.isArray(response)) {
        navigate(`/analysis/${response.analysisId}`);
      }
    } catch (error: any) {
      toast.error(`Lỗi khi bắt đầu phân tích: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const readyCount = uploadedImages.filter((img) => img.status === 'uploaded').length;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-text-main-light dark:text-text-main-dark overflow-x-hidden transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark px-4 md:px-10 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-8 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">ophthalmology</span>
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">AURA Health</h2>
        </div>
        <div className="flex flex-1 justify-end gap-4 md:gap-8 items-center">
          <div className="hidden md:flex items-center gap-6 md:gap-9">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm font-medium leading-normal hover:text-primary transition-colors"
            >
              Cổng Bệnh nhân
            </button>
            <button className="text-sm font-medium leading-normal hover:text-primary transition-colors">
              Trợ giúp
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full hover:bg-border-light dark:hover:bg-border-dark text-text-main-light dark:text-text-main-dark transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-surface-light dark:border-surface-dark"></span>
            </button>
            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user?.firstName?.[0] || user?.email?.[0] || 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center py-8 md:py-12 px-4 md:px-8 w-full">
        <div className="w-full max-w-[800px] flex flex-col gap-8">
          {/* Title Section */}
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
              Tải ảnh võng mạc
            </h1>
            <p className="text-text-sub-light dark:text-text-sub-dark text-base md:text-lg font-normal leading-normal max-w-[640px]">
              Vui lòng tải lên ảnh chụp đáy mắt (Fundus) hoặc ảnh cắt lớp quang học (OCT). AI của
              chúng tôi sẽ phân tích các dấu hiệu sức khỏe mạch máu để phát hiện sớm các nguy cơ
              tiềm ẩn.
            </p>
          </div>

          {/* Upload Zone */}
          <div
            className={`w-full rounded-xl border-2 border-dashed transition-all duration-300 group relative overflow-hidden ${
              isDragging
                ? 'border-primary bg-primary/[0.05] dark:bg-primary/[0.1]'
                : 'border-primary/30 dark:border-primary/30 bg-primary/[0.02] hover:bg-primary/[0.05] dark:bg-surface-dark hover:border-primary'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.dicom,.dcm"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
            <div className="flex flex-col items-center justify-center gap-6 py-16 px-6 text-center">
              <div className="size-20 rounded-full bg-white dark:bg-surface-dark shadow-md flex items-center justify-center text-primary group-hover:scale-110 group-hover:text-primary transition-all duration-300">
                <span className="material-symbols-outlined text-5xl">cloud_upload</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-lg font-bold leading-tight text-text-main-light dark:text-text-main-dark">
                  Kéo thả ảnh vào đây hoặc nhấn để chọn
                </p>
                <p className="text-text-sub-light dark:text-text-sub-dark text-sm max-w-md">
                  Hỗ trợ định dạng: JPG, PNG, DICOM (Fundus hoặc OCT).
                  <br />
                  Kích thước tối đa: 50MB/ảnh.
                </p>
              </div>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (fileInputRef.current && !fileInputRef.current.disabled) {
                    fileInputRef.current.click();
                  }
                }}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all mt-2 flex items-center gap-2 relative z-20"
              >
                <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                Chọn ảnh từ thiết bị
              </button>
            </div>
          </div>

          {/* Selected Images List */}
          {uploadedImages.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-border-light dark:border-border-dark">
                <h3 className="font-bold text-lg text-text-main-light dark:text-text-main-dark">
                  Ảnh đã chọn ({uploadedImages.length})
                </h3>
                <button
                  onClick={handleClearAll}
                  className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">delete_sweep</span>
                  Xóa tất cả
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {uploadedImages.map((image) => (
                  <div
                    key={image.id}
                    className="flex flex-col md:flex-row gap-4 p-4 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    {/* Image Thumbnail */}
                    <div className="w-full md:w-24 h-48 md:h-24 shrink-0 rounded-lg overflow-hidden bg-black relative shadow-inner">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-90"
                        style={{ backgroundImage: `url(${image.preview})` }}
                      />
                      {image.status === 'uploading' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                          <span className="material-symbols-outlined text-white animate-spin text-3xl">
                            progress_activity
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Image Info */}
                    <div className="flex flex-1 flex-col justify-center gap-2">
                      <div className="flex justify-between items-center">
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="font-bold text-base truncate text-text-main-light dark:text-text-main-dark">
                            {image.file.name}
                          </p>
                          <p className="text-xs text-text-sub-light dark:text-text-sub-dark mt-0.5">
                            {formatFileSize(image.file.size)} •{' '}
                            {image.status === 'uploading'
                              ? 'Đang tải lên...'
                              : image.status === 'uploaded'
                              ? 'Đã tải lên'
                              : 'Lỗi'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveImage(image.id)}
                          className="text-text-sub-light dark:text-text-sub-dark hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <span className="material-symbols-outlined">
                            {image.status === 'uploading' ? 'close' : 'delete'}
                          </span>
                        </button>
                      </div>

                      {/* Upload Progress */}
                      {image.status === 'uploading' && (
                        <div className="w-full flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-primary">{image.progress}%</span>
                            <span className="text-text-sub-light dark:text-text-sub-dark">
                              Đang tải lên...
                            </span>
                          </div>
                          <div className="h-2 w-full bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-300 relative overflow-hidden"
                              style={{ width: `${image.progress}%` }}
                            >
                              <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Ready Status */}
                      {image.status === 'uploaded' && (
                        <div className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-500 text-sm font-medium bg-green-50 dark:bg-green-900/20 w-fit px-2 py-1 rounded-md">
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                          Sẵn sàng phân tích
                        </div>
                      )}

                      {/* Error Status */}
                      {image.status === 'error' && (
                        <div className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/20 w-fit px-2 py-1 rounded-md">
                          <span className="material-symbols-outlined text-lg">error</span>
                          {image.errorMessage || 'Lỗi khi tải lên'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-background-light dark:bg-background-dark pt-4 pb-8 border-t border-transparent z-10 flex flex-col gap-6 mt-4">
            <div className="flex flex-col-reverse sm:flex-row gap-4 w-full">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 px-6 py-3.5 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-main-light dark:text-text-main-dark font-bold hover:bg-gray-50 dark:hover:bg-surface-dark/80 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleStartAnalysis}
                disabled={readyCount === 0 || isAnalyzing}
                className="flex-[2] px-6 py-3.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined group-hover:animate-pulse">analytics</span>
                {isAnalyzing ? 'Đang xử lý...' : 'Bắt đầu phân tích'}
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 text-text-sub-light dark:text-text-sub-dark text-xs opacity-90 bg-surface-light dark:bg-surface-dark py-2 px-4 rounded-full w-fit mx-auto border border-border-light dark:border-border-dark shadow-sm">
              <span className="material-symbols-outlined text-sm text-green-600 dark:text-green-500">
                lock
              </span>
              <span>Dữ liệu của bạn được mã hóa an toàn & tuân thủ chuẩn HIPAA.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ImageUploadPage;

