/**
 * Cloudinary Image Upload Service
 * Sử dụng Cloudinary để upload và quản lý hình ảnh
 */

const cloudinaryCloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME || '';
const cloudinaryUploadPreset = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
}

export interface CloudinaryUploadOptions {
  folder?: string; // Folder name trong Cloudinary
  // Note: transformation parameters should be configured in Upload Preset
  // on Cloudinary Dashboard when using unsigned upload
}

/**
 * Upload hình ảnh lên Cloudinary
 * @param file File ảnh cần upload
 * @param options Tùy chọn upload (folder, transformation, etc.)
 * @returns Promise với URL của ảnh đã upload
 */
export const uploadImageToCloudinary = async (
  file: File,
  options?: CloudinaryUploadOptions
): Promise<string> => {
  if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
    throw new Error('Cloudinary configuration is missing. Please check your .env file.');
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 10MB');
  }

  // Tạo FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryUploadPreset);
  
  if (options?.folder) {
    formData.append('folder', options.folder);
  }

  // Note: Transformation parameters should be configured in the Upload Preset
  // on Cloudinary Dashboard, not sent in the request when using unsigned upload

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Upload failed' } }));
      throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary');
    }

    const data: CloudinaryUploadResponse = await response.json();
    return data.secure_url; // Sử dụng secure_url (HTTPS)
  } catch (error: any) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Upload avatar image (optimized for profile pictures)
 * @param file File ảnh avatar
 * @returns Promise với URL của ảnh đã upload
 * 
 * Note: Transformations (width, height, crop, quality) should be configured
 * in the Upload Preset on Cloudinary Dashboard for unsigned uploads
 */
export const uploadAvatar = async (file: File): Promise<string> => {
  return uploadImageToCloudinary(file, {
    folder: 'aura/avatars',
    // Transformation should be configured in Upload Preset on Cloudinary
  });
};

/**
 * Upload retinal/fundus image (optimized for medical images)
 * @param file File ảnh đáy mắt
 * @returns Promise với URL của ảnh đã upload
 * 
 * Note: Transformations should be configured in the Upload Preset
 * on Cloudinary Dashboard for unsigned uploads
 */
export const uploadRetinalImage = async (file: File): Promise<string> => {
  return uploadImageToCloudinary(file, {
    folder: 'aura/retinal-images',
    // Transformation should be configured in Upload Preset on Cloudinary
  });
};

/**
 * Delete image from Cloudinary (requires authentication - backend implementation recommended)
 * @param publicId Public ID của ảnh cần xóa
 */
export const deleteImageFromCloudinary = async (_publicId: string): Promise<void> => {
  // Note: Deleting images typically requires backend implementation
  // as it needs the API secret which should not be exposed in frontend
  throw new Error('Delete image should be handled by backend API');
};

