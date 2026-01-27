"""
Image Processing Module for AURA AI Core
Handles image download, preprocessing, validation, and analysis
"""

import httpx
import cv2
import numpy as np
from PIL import Image
import io
import logging
from typing import Tuple, Optional, Dict, Any
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class ImageProcessor:
    """Handles image processing operations"""
    
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'tiff', 'tif']
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def download_image(self, image_url: str) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Download image from URL and return as numpy array
        
        Returns:
            Tuple of (image_array, metadata)
        """
        try:
            logger.info(f"Downloading image from: {image_url}")
            
            response = await self.client.get(image_url)
            response.raise_for_status()
            
            # Check content size
            content_length = response.headers.get('content-length')
            if content_length and int(content_length) > self.MAX_IMAGE_SIZE:
                raise ValueError(f"Image too large: {content_length} bytes")
            
            # Read image data
            image_data = response.content
            
            if len(image_data) > self.MAX_IMAGE_SIZE:
                raise ValueError(f"Image too large: {len(image_data)} bytes")
            
            # Load image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array (OpenCV format)
            image_array = np.array(image)
            
            # Get metadata
            metadata = {
                'width': image.width,
                'height': image.height,
                'format': image.format,
                'mode': image.mode,
                'size_bytes': len(image_data)
            }
            
            logger.info(f"Image downloaded: {metadata['width']}x{metadata['height']}, {metadata['format']}")
            
            return image_array, metadata
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error downloading image: {str(e)}")
            # Thông báo tiếng Việt rõ ràng cho người dùng
            raise ValueError(f"Không thể tải ảnh từ URL: {str(e)}")
        except Exception as e:
            logger.error(f"Error downloading image: {str(e)}")
            raise ValueError(f"Không thể xử lý ảnh đầu vào: {str(e)}")
    
    def assess_image_quality(self, image: np.ndarray) -> float:
        """
        Comprehensive image quality assessment with multiple metrics
        Based on clinical retinal analysis standards
        
        Returns:
            Quality score between 0 and 1
        """
        try:
            # Ensure image is uint8 for OpenCV operations
            if image.dtype != np.uint8:
                if image.max() <= 1.0:
                    image = (image * 255).astype(np.uint8)
                else:
                    image = image.astype(np.uint8)
            
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            else:
                gray = image
            
            if gray.dtype != np.uint8:
                gray = gray.astype(np.uint8)
            
            # Multiple quality metrics
            metrics = {}
            
            # 1. Sharpness (Laplacian variance)
            metrics['sharpness'] = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # 2. Contrast (RMS contrast)
            metrics['contrast'] = gray.std()
            
            # 3. Brightness distribution
            metrics['brightness'] = np.mean(gray)
            
            # 4. Dynamic range
            metrics['dynamic_range'] = np.ptp(gray)
            
            # Normalize and combine metrics (weighted combination)
            quality_score = min(1.0, (
                min(metrics['sharpness'] / 500, 1.0) * 0.3 +
                min(metrics['contrast'] / 50, 1.0) * 0.3 +
                min(abs(metrics['brightness'] - 128) / 128, 1.0) * 0.2 +
                min(metrics['dynamic_range'] / 255, 1.0) * 0.2
            ))
            
            return float(quality_score)
        except Exception as e:
            logger.error(f"Error assessing image quality: {str(e)}")
            return 0.0
    
    def validate_image(self, image_array: np.ndarray, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate image quality and characteristics
        Enhanced with comprehensive quality assessment
        
        Returns:
            Dict with validation results and image characteristics
        """
        validation_result = {
            'is_valid': True,
            'issues': [],
            'quality_score': 1.0,
            'characteristics': {}
        }
        
        # Ensure image is uint8 for OpenCV operations
        if image_array.dtype != np.uint8:
            if image_array.max() <= 1.0:
                image_array = (image_array * 255).astype(np.uint8)
            else:
                image_array = image_array.astype(np.uint8)
        
        height, width = image_array.shape[:2]
        
        # Check dimensions
        if width < 256 or height < 256:
            validation_result['is_valid'] = False
            validation_result['issues'].append("Image too small")
        
        if width > 4096 or height > 4096:
            validation_result['issues'].append("Image very large, may take longer to process")
        
        # Analyze image characteristics
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY) if len(image_array.shape) == 3 else image_array
        if gray.dtype != np.uint8:
            gray = gray.astype(np.uint8)
        
        # Comprehensive quality assessment
        quality_score = self.assess_image_quality(image_array)
        validation_result['quality_score'] = quality_score
        
        # Reject low-quality images
        if quality_score < 0.5:
            validation_result['is_valid'] = False
            validation_result['issues'].append(f"Image quality insufficient for analysis (score: {quality_score:.2f})")
        
        # Brightness analysis
        mean_brightness = np.mean(gray)
        std_brightness = np.std(gray)
        
        validation_result['characteristics']['brightness'] = {
            'mean': float(mean_brightness),
            'std': float(std_brightness),
            'level': 'normal'
        }
        
        if mean_brightness < 50:
            validation_result['characteristics']['brightness']['level'] = 'dark'
            validation_result['issues'].append("Image is too dark")
        elif mean_brightness > 200:
            validation_result['characteristics']['brightness']['level'] = 'bright'
            validation_result['issues'].append("Image is too bright")
        
        # Contrast analysis
        contrast = std_brightness
        validation_result['characteristics']['contrast'] = {
            'value': float(contrast),
            'level': 'normal'
        }
        
        if contrast < 20:
            validation_result['characteristics']['contrast']['level'] = 'low'
            validation_result['issues'].append("Low contrast detected")
        elif contrast > 80:
            validation_result['characteristics']['contrast']['level'] = 'high'
        
        # Blur detection (Laplacian variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        validation_result['characteristics']['sharpness'] = {
            'laplacian_variance': float(laplacian_var),
            'level': 'sharp' if laplacian_var > 100 else 'blurry'
        }
        
        if laplacian_var < 100:
            validation_result['issues'].append("Image may be blurry")
        
        # Color distribution
        if len(image_array.shape) == 3:
            r_mean = np.mean(image_array[:, :, 0])
            g_mean = np.mean(image_array[:, :, 1])
            b_mean = np.mean(image_array[:, :, 2])
            
            validation_result['characteristics']['color_distribution'] = {
                'r': float(r_mean),
                'g': float(g_mean),
                'b': float(b_mean)
            }
        
        validation_result['quality_score'] = max(0.0, min(1.0, validation_result['quality_score']))
        
        return validation_result
    
    def enhance_retinal_features(self, image: np.ndarray) -> np.ndarray:
        """
        Enhance retinal-specific features using advanced image processing
        Based on clinical retinal analysis techniques
        
        Args:
            image: Input image array (RGB)
            
        Returns:
            Enhanced image array
        """
        try:
            if len(image.shape) != 3:
                return image
            
            # Convert to LAB color space for better luminance control
            lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
            l_channel = lab[:, :, 0]
            
            # Apply bilateral filter to reduce noise while preserving edges
            filtered = cv2.bilateralFilter(l_channel, 9, 75, 75)
            
            # Enhance vessels using top-hat transform
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
            tophat = cv2.morphologyEx(filtered, cv2.MORPH_TOPHAT, kernel)
            enhanced = cv2.add(filtered, tophat)
            
            # Update L channel
            lab[:, :, 0] = enhanced
            
            # Convert back to RGB
            enhanced_image = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
            
            return enhanced_image
        except Exception as e:
            logger.error(f"Error enhancing retinal features: {str(e)}")
            return image
    
    def preprocess_image(self, image_array: np.ndarray) -> np.ndarray:
        """
        Enhanced preprocessing pipeline for retinal image analysis
        Includes green channel enhancement and retinal feature enhancement
        
        Returns:
            Preprocessed image array
        """
        # Resize to standard size (512x512) for consistent analysis
        # Using LANCZOS4 for better quality
        processed = cv2.resize(
            image_array,
            (512, 512),
            interpolation=cv2.INTER_LANCZOS4
        )
        logger.info(f"Resized image to 512x512")
        
        # Enhanced preprocessing for RGB images
        if len(processed.shape) == 3:
            # Green channel enhancement (best contrast for retinal features)
            green_channel = processed[:, :, 1]
            
            # Apply CLAHE with clinical parameters
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(16, 16))
            enhanced_green = clahe.apply(green_channel)
            
            # Reconstruct RGB with enhanced green channel
            processed[:, :, 1] = enhanced_green
            
            # Retinal feature enhancement
            processed = self.enhance_retinal_features(processed)
        
        # Normalize with clinical standards
        processed = processed.astype(np.float32)
        
        # Use machine epsilon to prevent division by zero
        std_val = np.std(processed)
        epsilon = np.finfo(processed.dtype).eps
        processed = (processed - np.mean(processed)) / (std_val + epsilon)
        
        # Clip outliers
        processed = np.clip(processed, -3, 3)
        
        # Normalize to [0, 1]
        processed = (processed + 3) / 6
        
        return processed
    
    def analyze_image_features(self, image_array: np.ndarray) -> Dict[str, Any]:
        """
        Analyze image features for risk assessment
        
        Returns:
            Dict with extracted features, including vascular-related metrics
        """
        # Ensure image is uint8 for OpenCV operations
        if image_array.dtype != np.uint8:
            if image_array.max() <= 1.0:
                image_array = (image_array * 255).astype(np.uint8)
            else:
                image_array = image_array.astype(np.uint8)
        
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY) if len(image_array.shape) == 3 else image_array
        
        # Ensure gray is uint8 for Canny edge detection
        if gray.dtype != np.uint8:
            gray = gray.astype(np.uint8)
        
        features: Dict[str, Any] = {}
        
        # Vessel detection (simplified - using edge detection as proxy)
        try:
            edges = cv2.Canny(gray, 50, 150)
            vessel_density = np.sum(edges > 0) / (gray.shape[0] * gray.shape[1])
            features['vessel_density'] = float(vessel_density)
        except Exception as e:
            logger.warning(f"Canny edge detection failed: {str(e)}")
            features['vessel_density'] = 0.0
        
        # Detect potential abnormalities (using simple blob detection)
        try:
            params = cv2.SimpleBlobDetector_Params()
            params.filterByArea = True
            params.minArea = 10
            params.maxArea = 5000
            params.filterByCircularity = False
            params.filterByConvexity = False
            params.filterByInertia = False
            
            detector = cv2.SimpleBlobDetector_create(params)
            keypoints = detector.detect(gray)
            potential_abnormalities_count = len(keypoints)
            features['potential_abnormalities_count'] = potential_abnormalities_count
        except Exception as e:
            logger.warning(f"Blob detection failed: {str(e)}")
            features['potential_abnormalities_count'] = 0
        
        # Texture analysis (using GLCM-like features)
        # Simplified: calculate local variance as proxy for structural complexity
        try:
            kernel = np.ones((5, 5), np.float32) / 25
            local_mean = cv2.filter2D(gray.astype(np.float32), -1, kernel)
            local_variance = np.var(gray.astype(np.float32) - local_mean)
            texture_variance = float(local_variance)
            features['texture_variance'] = texture_variance
        except Exception as e:
            logger.warning(f"Texture analysis failed: {str(e)}")
            features['texture_variance'] = 0.0
            texture_variance = 0.0
        
        # ---------------------------------------------------------------------
        # Derive vascular-focused metrics in normalized [0,1] range
        # Các chỉ số này phục vụ trực tiếp cho màn "Bất thường Mạch máu" ở frontend
        # ---------------------------------------------------------------------
        try:
            # Chuẩn hóa vessel_density và texture_variance về [0,1] với ngưỡng kinh nghiệm
            vd_norm = float(max(0.0, min(1.0, vessel_density * 5.0)))  # ~0–0.2 → 0–1
            tv_norm = float(max(0.0, min(1.0, texture_variance / 500.0)))
            
            # Độ xoắn mạch (tortuosity) ~ mức độ phức tạp + mật độ bờ mạch
            tortuosity_index = max(0.0, min(1.0, 0.6 * tv_norm + 0.4 * vd_norm))
            
            # Biến thiên bề rộng mạch (caliber variation) ~ chênh lệch cục bộ
            width_variation = max(0.0, min(1.0, 0.7 * tv_norm + 0.3 * (1.0 - vd_norm)))
            
            # Số lượng vi phình mạch ~ số blob nhỏ phát hiện được
            microaneurysm_count = int(potential_abnormalities_count)
            
            # Điểm xuất huyết (hemorrhage score) – xấp xỉ bằng số blob + mật độ bờ mạch
            hemorrhage_score = max(
                0.0,
                min(1.0, 0.5 * (microaneurysm_count / 50.0) + 0.5 * vd_norm)
            )
            
            features['vascular_metrics'] = {
                'tortuosity_index': float(tortuosity_index),
                'width_variation_index': float(width_variation),
                'microaneurysm_count': microaneurysm_count,
                'hemorrhage_score': float(hemorrhage_score)
            }
        except Exception as e:
            logger.warning(f"Vascular metrics derivation failed: {str(e)}")
            features.setdefault('vascular_metrics', {
                'tortuosity_index': 0.0,
                'width_variation_index': 0.0,
                'microaneurysm_count': 0,
                'hemorrhage_score': 0.0
            })
        
        return features
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
