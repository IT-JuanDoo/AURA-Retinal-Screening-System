import api from './api';

export interface ImageUploadMetadata {
  imageType?: 'Fundus' | 'OCT';
  eyeSide?: 'Left' | 'Right' | 'Both';
  captureDevice?: string;
  captureDate?: string;
}

export interface ImageUploadResponse {
  id: string;
  originalFilename: string;
  cloudinaryUrl: string;
  fileSize: number;
  imageType: string;
  uploadStatus: string;
  uploadedAt: string;
}

export interface MultipleImageUploadResponse {
  successfullyUploaded: ImageUploadResponse[];
  failed: Array<{
    filename: string;
    errorMessage: string;
  }>;
}

const imageService = {
  /**
   * Upload a single retinal image
   */
  async uploadImage(
    file: File,
    metadata?: ImageUploadMetadata
  ): Promise<ImageUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata) {
      if (metadata.imageType) {
        formData.append('imageType', metadata.imageType);
      }
      if (metadata.eyeSide) {
        formData.append('eyeSide', metadata.eyeSide);
      }
      if (metadata.captureDevice) {
        formData.append('captureDevice', metadata.captureDevice);
      }
      if (metadata.captureDate) {
        formData.append('captureDate', metadata.captureDate);
      }
    }

    const response = await api.post<ImageUploadResponse>(
      '/images/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  /**
   * Upload multiple retinal images
   */
  async uploadMultipleImages(
    files: File[]
  ): Promise<MultipleImageUploadResponse> {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await api.post<MultipleImageUploadResponse>(
      '/images/upload-multiple',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  /**
   * Get user's uploaded images
   */
  async getUserImages(): Promise<ImageUploadResponse[]> {
    const response = await api.get<ImageUploadResponse[]>('/images');
    return response.data;
  },
};

export default imageService;

