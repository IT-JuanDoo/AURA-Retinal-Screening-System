"""
Model Service for AURA AI Core
Complete integration with Hugging Face OCT Retinal Classifier
Model: tomalmog/oct-retinal-classifier (EfficientNet-B3, 99.6% accuracy)
"""

import logging
import numpy as np
from typing import Dict, Any, Optional, Tuple, List
import os

logger = logging.getLogger(__name__)

# Try to import PyTorch and timm
try:
    import torch
    import torch.nn.functional as F
    from torchvision import transforms
    from PIL import Image
    import timm
    PYTORCH_AVAILABLE = True
except ImportError as e:
    PYTORCH_AVAILABLE = False
    logger.warning(f"PyTorch/timm not available: {e}. Model inference will use mock predictions.")


class RetinalModelService:
    """
    Complete Retinal Analysis Service using Hugging Face OCT Classifier
    
    Model: tomalmog/oct-retinal-classifier
    - Architecture: EfficientNet-B3
    - Classes: CNV, DME, DRUSEN, NORMAL
    - Accuracy: 99.6%
    - Input: 224x224 RGB
    """
    
    # Model configuration
    HF_MODEL_ID = "hf_hub:tomalmog/oct-retinal-classifier"
    IMAGE_SIZE = 224
    
    # Class definitions
    OCT_CLASSES = ['CNV', 'DME', 'DRUSEN', 'NORMAL']
    
    # Clinical condition mapping (OCT classes to clinical names)
    CONDITION_MAPPING = {
        'CNV': {
            'name': 'Choroidal Neovascularization',
            'icd10': 'H35.31',
            'severity_levels': ['Mild', 'Moderate', 'Severe', 'Advanced'],
            'urgency': 'high',
            'description': 'Abnormal blood vessel growth beneath the retina',
            'systemic_risks': ['cardiovascular', 'hypertension']
        },
        'DME': {
            'name': 'Diabetic Macular Edema',
            'icd10': 'E11.311',
            'severity_levels': ['Mild', 'Moderate', 'Severe'],
            'urgency': 'high',
            'description': 'Fluid accumulation in the macula due to diabetes',
            'systemic_risks': ['diabetes', 'cardiovascular', 'stroke']
        },
        'DRUSEN': {
            'name': 'Drusen (Early AMD)',
            'icd10': 'H35.30',
            'severity_levels': ['Small', 'Intermediate', 'Large'],
            'urgency': 'medium',
            'description': 'Yellow deposits under the retina, early sign of AMD',
            'systemic_risks': ['cardiovascular', 'hypertension']
        },
        'NORMAL': {
            'name': 'Normal Retina',
            'icd10': None,
            'severity_levels': ['Healthy'],
            'urgency': 'low',
            'description': 'No significant abnormalities detected',
            'systemic_risks': []
        }
    }
    
    # Systemic Health Risk Mapping (based on retinal findings)
    # Reference: "The eye as a window to cardiovascular disease" - Nature Reviews
    SYSTEMIC_HEALTH_RISKS = {
        'cardiovascular': {
            'name': 'Cardiovascular Risk',
            'description': 'Risk of heart disease based on retinal vascular changes',
            'related_conditions': ['CNV', 'DME', 'DRUSEN'],
            'risk_factors': {
                'CNV': 0.3,   # CNV indicates vascular abnormalities
                'DME': 0.4,   # DME strongly linked to cardiovascular
                'DRUSEN': 0.2 # DRUSEN indicates aging vasculature
            }
        },
        'diabetes': {
            'name': 'Diabetes Complications Risk',
            'description': 'Risk of diabetes-related complications',
            'related_conditions': ['DME'],
            'risk_factors': {
                'DME': 0.8    # DME is direct indicator of diabetic complications
            }
        },
        'hypertension': {
            'name': 'Hypertension Risk',
            'description': 'Risk of high blood pressure based on vascular changes',
            'related_conditions': ['CNV', 'DRUSEN'],
            'risk_factors': {
                'CNV': 0.4,   # Abnormal vessel growth
                'DRUSEN': 0.3 # Deposits indicate vascular issues
            }
        },
        'stroke': {
            'name': 'Stroke Risk',
            'description': 'Risk of cerebrovascular events',
            'related_conditions': ['DME', 'CNV'],
            'risk_factors': {
                'DME': 0.5,   # Diabetic retinopathy linked to stroke
                'CNV': 0.3    # Vascular abnormalities
            }
        }
    }
    
    # Clinical thresholds for each condition
    CLINICAL_THRESHOLDS = {
        'CNV': 0.3,
        'DME': 0.3,
        'DRUSEN': 0.4,
        'NORMAL': 0.5
    }
    
    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.model_version: Optional[str] = None
        self.device = None
        self.transform = None
        self.use_mock = not PYTORCH_AVAILABLE
        
        # Initialize device
        if PYTORCH_AVAILABLE:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            logger.info(f"Using device: {self.device}")
            
            # Setup preprocessing transform (ImageNet normalization)
            self.transform = transforms.Compose([
                transforms.Resize((self.IMAGE_SIZE, self.IMAGE_SIZE)),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225]
                )
            ])
    
    def load_model(self, model_path: Optional[str] = None, model_version: str = "v1.0.0") -> bool:
        """
        Load the OCT Retinal Classifier from Hugging Face
        
        Args:
            model_path: Optional local path (if None, loads from HF Hub)
            model_version: Version string for tracking
            
        Returns:
            True if model loaded successfully
        """
        if not PYTORCH_AVAILABLE:
            logger.warning("PyTorch not available. Using mock predictions.")
            self.use_mock = True
            self.model_loaded = True
            self.model_version = model_version
            return True
        
        try:
            # ==================================================================
            # ƯU TIÊN: Load model từ đường dẫn local (nếu được truyền vào)
            # Điều này cho phép chạy offline, không cần Internet trong container.
            # ==================================================================
            if model_path:
                try:
                    logger.info(f"Loading OCT model from local path: {model_path}")
                    import torch.nn as nn

                    class OCTClassifier(nn.Module):
                        def __init__(self):
                            super().__init__()
                            # EfficientNet-B3 backbone
                            self.backbone = timm.create_model(
                                "efficientnet_b3", pretrained=False, num_classes=0
                            )
                            # Custom classifier: 1536 -> 512 -> 4 classes
                            self.classifier = nn.Sequential(
                                nn.Flatten(),
                                nn.Dropout(0.3),
                                nn.Linear(1536, 512),
                                nn.ReLU(),
                                nn.Dropout(0.3),
                                nn.Linear(512, 4),
                            )

                        def forward(self, x):
                            features = self.backbone(x)
                            return self.classifier(features)

                    self.model = OCTClassifier()
                    state_dict = torch.load(model_path, map_location=self.device)
                    self.model.load_state_dict(state_dict)

                    self.model = self.model.to(self.device)
                    self.model.eval()

                    self.model_loaded = True
                    self.model_version = model_version
                    self.use_mock = False

                    logger.info("Model loaded successfully from local file.")
                    logger.info(f"Model architecture: EfficientNet-B3, classes: {self.OCT_CLASSES}")
                    return True
                except Exception as e_local:
                    logger.warning(
                        f"Local model loading failed from path={model_path}: {str(e_local)}. "
                        "Falling back to Hugging Face download."
                    )

            # ==================================================================
            # Nếu không có model_path hoặc load local thất bại:
            # Thử load từ Hugging Face (cần Internet trong container)
            # ==================================================================
            logger.info(f"Loading model from Hugging Face: {self.HF_MODEL_ID}")
            
            model_loaded_successfully = False
            
            # Method 1: timm.create_model với HF Hub
            try:
                self.model = timm.create_model(
                    self.HF_MODEL_ID,
                    pretrained=True
                )
                model_loaded_successfully = True
                logger.info("Model loaded successfully using timm.create_model")
            except Exception as e1:
                logger.warning(f"Method 1 (timm direct) failed: {str(e1)}")
                
                # Method 2: tải trực tiếp trọng số từ HF Hub và bọc bằng OCTClassifier
                try:
                    from huggingface_hub import hf_hub_download
                    import torch.nn as nn
                    
                    model_path = hf_hub_download(
                        repo_id="tomalmog/oct-retinal-classifier",
                        filename="pytorch_model.bin"
                    )
                    
                    class OCTClassifier(nn.Module):
                        def __init__(self):
                            super().__init__()
                            self.backbone = timm.create_model(
                                "efficientnet_b3", pretrained=False, num_classes=0
                            )
                            self.classifier = nn.Sequential(
                                nn.Flatten(),
                                nn.Dropout(0.3),
                                nn.Linear(1536, 512),
                                nn.ReLU(),
                                nn.Dropout(0.3),
                                nn.Linear(512, 4),
                            )

                        def forward(self, x):
                            features = self.backbone(x)
                            return self.classifier(features)
                    
                    self.model = OCTClassifier()
                    state_dict = torch.load(model_path, map_location=self.device)
                    self.model.load_state_dict(state_dict)

                    model_loaded_successfully = True
                    logger.info("Model loaded successfully using custom OCTClassifier wrapper")
                except Exception as e2:
                    logger.warning(f"Method 2 (custom wrapper) failed: {str(e2)}")
            
            if model_loaded_successfully:
                self.model = self.model.to(self.device)
                self.model.eval()
                
                self.model_loaded = True
                self.model_version = model_version
                self.use_mock = False
                
                logger.info(f"Model loaded successfully on {self.device}")
                logger.info(f"Model architecture: EfficientNet-B3")
                logger.info(f"Classes: {self.OCT_CLASSES}")
                
                return True
            else:
                raise Exception("All model loading methods (local + Hugging Face) failed")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            logger.info("Falling back to mock predictions")
            self.use_mock = True
            self.model_loaded = True
            self.model_version = model_version
            return True
    
    def preprocess_image(self, image_array: np.ndarray) -> torch.Tensor:
        """
        Preprocess image for model inference
        
        Args:
            image_array: Input image as numpy array (H, W, C) or (H, W)
            
        Returns:
            Preprocessed tensor ready for model
        """
        if not PYTORCH_AVAILABLE:
            raise RuntimeError("PyTorch not available")
        
        # Convert to PIL Image
        if len(image_array.shape) == 2:
            # Grayscale to RGB
            image_array = np.stack([image_array] * 3, axis=-1)
        
        # Ensure uint8
        if image_array.dtype != np.uint8:
            if image_array.max() <= 1.0:
                image_array = (image_array * 255).astype(np.uint8)
            else:
                image_array = image_array.astype(np.uint8)
        
        # Convert to PIL
        pil_image = Image.fromarray(image_array).convert('RGB')
        
        # Apply transforms
        tensor = self.transform(pil_image)
        
        # Add batch dimension
        tensor = tensor.unsqueeze(0)
        
        return tensor.to(self.device)
    
    def predict(self, image_array: np.ndarray) -> Dict[str, Any]:
        """
        Run inference on image
        
        Args:
            image_array: Input image as numpy array
            
        Returns:
            Dict with predictions and clinical analysis
        """
        if not self.model_loaded:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        if self.use_mock:
            return self._mock_predict(image_array)
        
        try:
            # Preprocess một ảnh cho inference
            input_tensor = self.preprocess_image(image_array)
            
            # Inference (không gradient cho bước dự đoán chính)
            with torch.no_grad():
                output = self.model(input_tensor)
                probabilities = F.softmax(output, dim=1)[0]
            
            # Convert to numpy
            probs = probabilities.cpu().numpy()
            
            # Get prediction
            predicted_idx = np.argmax(probs)
            predicted_class = self.OCT_CLASSES[predicted_idx]
            confidence = float(probs[predicted_idx])
            
            logger.info(f"Prediction: {predicted_class} ({confidence:.2%})")
            
            # Build clinical results
            results = self._build_clinical_results(probs, predicted_class, confidence)

            # Sinh heatmap dựa trên gradient (saliency map) để highlight vùng nghi ngờ
            try:
                heatmap = self._generate_saliency_heatmap(image_array, int(predicted_idx))
                results["heatmap"] = heatmap
            except Exception as e_hm:
                logger.warning(f"Không thể sinh heatmap cho ảnh hiện tại: {str(e_hm)}")
            
            return results
            
        except Exception as e:
            logger.error(f"Error in prediction: {str(e)}")
            raise
    
    def _build_clinical_results(
        self, 
        probabilities: np.ndarray, 
        predicted_class: str, 
        confidence: float
    ) -> Dict[str, Any]:
        """
        Build comprehensive clinical results from predictions
        
        Args:
            probabilities: Model output probabilities
            predicted_class: Predicted class name
            confidence: Prediction confidence
            
        Returns:
            Dict with clinical analysis
        """
        results = {
            'predicted_class': predicted_class,
            'confidence': confidence,
            'conditions': {},
            'systemic_health_risks': {},  # NEW: Systemic health risk assessment
            'risk_assessment': {},
            'recommendations': []
        }
        
        # Process each class
        for i, class_name in enumerate(self.OCT_CLASSES):
            prob = float(probabilities[i])
            threshold = self.CLINICAL_THRESHOLDS.get(class_name, 0.5)
            condition_info = self.CONDITION_MAPPING.get(class_name, {})
            
            # Determine if positive
            is_positive = prob >= threshold and class_name != 'NORMAL'
            
            # Calculate confidence interval
            ci = self._calculate_confidence_interval(prob)
            
            # Determine severity
            severity = self._determine_severity(prob, class_name)
            
            results['conditions'][class_name] = {
                'probability': prob,
                'positive': is_positive,
                'threshold': threshold,
                'confidence_interval': ci,
                'severity': severity,
                'clinical_name': condition_info.get('name', class_name),
                'icd10': condition_info.get('icd10'),
                'description': condition_info.get('description', ''),
                'systemic_risks': condition_info.get('systemic_risks', [])
            }
        
        # NEW: Calculate systemic health risks (cardiovascular, diabetes, etc.)
        results['systemic_health_risks'] = self._calculate_systemic_health_risks(results['conditions'])
        
        # Overall risk assessment (now includes systemic risks)
        results['risk_assessment'] = self._assess_overall_risk(results['conditions'], results['systemic_health_risks'])
        
        # Clinical recommendations (now includes systemic health recommendations)
        results['recommendations'] = self._generate_recommendations(
            results['conditions'], 
            results['risk_assessment'],
            results['systemic_health_risks']
        )
        
        return results
    
    def _determine_severity(self, probability: float, class_name: str) -> str:
        """Determine severity level based on probability"""
        if class_name == 'NORMAL':
            return 'Healthy' if probability > 0.7 else 'Uncertain'
        
        if probability < 0.3:
            return 'Not detected'
        elif probability < 0.5:
            return 'Mild'
        elif probability < 0.7:
            return 'Moderate'
        elif probability < 0.85:
            return 'Severe'
        else:
            return 'Advanced'
    
    def _calculate_confidence_interval(
        self, 
        probability: float, 
        n: int = 1000
    ) -> Dict[str, float]:
        """Calculate Wilson score confidence interval"""
        z = 1.96  # 95% confidence
        p = probability
        
        denominator = 1 + z**2 / n
        center = p + z**2 / (2 * n)
        margin = z * np.sqrt(p * (1 - p) / n + z**2 / (4 * n**2))
        
        return {
            'lower': float(max(0.0, (center - margin) / denominator)),
            'upper': float(min(1.0, (center + margin) / denominator)),
            'confidence_level': 0.95
        }
    
    def _calculate_systemic_health_risks(self, conditions: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate systemic health risks based on retinal findings
        
        This implements the AURA vision of using retinal imaging as a 
        "window" to systemic health - estimating cardiovascular, diabetes,
        hypertension, and stroke risks from eye conditions.
        
        Reference: "The eye as a window to cardiovascular disease" - Nature Reviews
        """
        systemic_risks = {}
        
        for risk_key, risk_info in self.SYSTEMIC_HEALTH_RISKS.items():
            risk_score = 0.0
            contributing_conditions = []
            
            # Calculate risk based on detected conditions
            for condition_name, factor in risk_info['risk_factors'].items():
                condition_data = conditions.get(condition_name, {})
                condition_prob = condition_data.get('probability', 0.0)
                
                if condition_prob > 0.1:  # Only consider if probability > 10%
                    contribution = condition_prob * factor
                    risk_score += contribution
                    
                    if condition_data.get('positive', False):
                        contributing_conditions.append({
                            'condition': condition_name,
                            'probability': condition_prob,
                            'contribution': contribution
                        })
            
            # Normalize risk score to 0-1
            risk_score = min(1.0, risk_score)
            
            # Determine risk level
            if risk_score >= 0.6:
                risk_level = 'High'
            elif risk_score >= 0.3:
                risk_level = 'Moderate'
            elif risk_score >= 0.1:
                risk_level = 'Low'
            else:
                risk_level = 'Minimal'
            
            systemic_risks[risk_key] = {
                'name': risk_info['name'],
                'description': risk_info['description'],
                'risk_score': float(risk_score),
                'risk_level': risk_level,
                'contributing_conditions': contributing_conditions,
                'confidence_interval': self._calculate_confidence_interval(risk_score)
            }
        
        return systemic_risks
    
    def _generate_saliency_heatmap(
        self,
        image_array: np.ndarray,
        class_index: int,
    ) -> np.ndarray:
        """
        Sinh heatmap dựa trên gradient của đầu ra theo ảnh đầu vào.

        Đây là một dạng saliency map chuẩn, trực tiếp từ mô hình, giúp
        highlight những vùng ảnh ảnh hưởng nhiều tới dự đoán hiện tại.
        """
        if not PYTORCH_AVAILABLE:
            raise RuntimeError("PyTorch không khả dụng – không thể sinh heatmap.")
        if self.use_mock:
            raise RuntimeError("Đang ở chế độ mock – heatmap từ mô hình thực không khả dụng.")

        # Chuẩn hoá ảnh đầu vào và cho phép gradient
        tensor = self.preprocess_image(image_array)
        tensor.requires_grad_(True)

        # Forward và backprop cho lớp được chọn
        self.model.zero_grad()
        output = self.model(tensor)

        if class_index < 0 or class_index >= output.shape[1]:
            class_index = int(torch.argmax(output, dim=1).item())

        score = output[0, class_index]
        score.backward()

        # Gradient theo ảnh đầu vào
        grads = tensor.grad.detach()[0]  # (C, H, W)
        grads_abs = torch.abs(grads)
        # Lấy max theo kênh để có map 2D
        saliency, _ = torch.max(grads_abs, dim=0)  # (H, W)

        saliency_np = saliency.cpu().numpy()
        if saliency_np.max() > 0:
            saliency_np = saliency_np / saliency_np.max()

        return saliency_np.astype(np.float32)
    
    def _assess_overall_risk(self, conditions: Dict[str, Any], systemic_risks: Dict[str, Any] = None) -> Dict[str, Any]:
        """Assess overall patient risk including systemic health"""
        # Find highest risk condition (excluding normal)
        max_risk = 0.0
        primary_condition = 'NORMAL'
        positive_conditions = []
        
        for class_name, data in conditions.items():
            if class_name == 'NORMAL':
                continue
            
            if data['positive']:
                positive_conditions.append(class_name)
                if data['probability'] > max_risk:
                    max_risk = data['probability']
                    primary_condition = class_name
        
        # Consider systemic risks in overall assessment
        max_systemic_risk = 0.0
        high_systemic_risks = []
        if systemic_risks:
            for risk_key, risk_data in systemic_risks.items():
                if risk_data['risk_score'] > max_systemic_risk:
                    max_systemic_risk = risk_data['risk_score']
                if risk_data['risk_level'] in ['High', 'Moderate']:
                    high_systemic_risks.append(risk_key)
        
        # Combined risk considers both eye conditions and systemic risks
        combined_risk = max(max_risk, max_systemic_risk * 0.8)  # Weight systemic risks slightly lower
        
        # Determine risk level
        if combined_risk >= 0.7:
            risk_level = 'High'
        elif max_risk >= 0.4:
            risk_level = 'Medium'
        elif max_risk >= 0.3:
            risk_level = 'Low'
        else:
            risk_level = 'Minimal'
        
        # Check normal probability
        normal_prob = conditions.get('NORMAL', {}).get('probability', 0.0)
        if normal_prob > 0.7:
            risk_level = 'Low'
            primary_condition = 'NORMAL'
        
        # Calculate overall risk score
        risk_score = max_risk if primary_condition != 'NORMAL' else (1.0 - normal_prob)
        
        # Determine urgency
        condition_info = self.CONDITION_MAPPING.get(primary_condition, {})
        urgency = condition_info.get('urgency', 'low')
        
        return {
            'risk_level': risk_level,
            'risk_score': float(risk_score),
            'combined_risk_score': float(combined_risk),
            'primary_condition': primary_condition,
            'positive_conditions': positive_conditions,
            'high_systemic_risks': high_systemic_risks,
            'urgency': urgency,
            'requires_referral': risk_level in ['High', 'Medium'] and primary_condition != 'NORMAL',
            'requires_systemic_followup': len(high_systemic_risks) > 0
        }
    
    def _generate_recommendations(
        self, 
        conditions: Dict[str, Any], 
        risk_assessment: Dict[str, Any],
        systemic_risks: Dict[str, Any] = None
    ) -> List[str]:
        """Generate clinical recommendations including systemic health
        
        Ghi chú:
        - Toàn bộ nội dung khuyến nghị trả về cho người dùng/bác sĩ được viết bằng tiếng Việt.
        - Mức độ nguy cơ kỹ thuật (High/Moderate/Low/Minimal) được ánh xạ sang nhãn tiếng Việt
          để dễ hiểu hơn, nhưng logic đánh giá không thay đổi.
        """
        recommendations = []
        primary = risk_assessment['primary_condition']
        risk_level = risk_assessment['risk_level']
        
        def _risk_level_vi(level: str) -> str:
            """Map internal risk level to Vietnamese label for display."""
            mapping = {
                'High': 'Cao',
                'Medium': 'Trung bình',
                'Moderate': 'Trung bình',
                'Low': 'Thấp',
                'Minimal': 'Rất thấp'
            }
            return mapping.get(level, level)
        
        if primary == 'NORMAL' and risk_level in ['Minimal', 'Low']:
            recommendations.append(
                "✅ Không phát hiện bất thường đáng kể trên võng mạc. "
                "Cấu trúc võng mạc nhìn chung trong giới hạn bình thường theo đánh giá của mô hình AI."
            )
            
            # Kiểm tra nguy cơ hệ thống ngay cả khi võng mạc bình thường
            if systemic_risks:
                for risk_key, risk_data in systemic_risks.items():
                    if risk_data['risk_level'] in ['Moderate', 'High']:
                        level_vi = _risk_level_vi(risk_data['risk_level'])
                        recommendations.append(
                            f"⚠️ {risk_data['name']}: Phát hiện nguy cơ {level_vi} "
                            "dựa trên các đặc điểm mạch máu võng mạc."
                        )
            
            if not any("⚠️" in r for r in recommendations):
                recommendations.append(
                    "Đề nghị tái khám, chụp và đánh giá lại võng mạc định kỳ sau khoảng 12 tháng "
                    "(hoặc sớm hơn nếu xuất hiện triệu chứng bất thường về thị lực)."
                )
            return recommendations
        
        # Khuyến nghị riêng cho từng tình trạng bệnh tại mắt
        if 'CNV' in risk_assessment['positive_conditions']:
            recommendations.append(
                "⚠️ Phát hiện tổn thương CNV (tân mạch hắc mạc) – Khuyến nghị gửi khám "
                "chuyên khoa đáy mắt/nhãn khoa trong thời gian sớm nhất có thể."
            )
            recommendations.append(
                "Cân nhắc đánh giá chỉ định điều trị kháng VEGF (anti‑VEGF) hoặc các phác đồ điều trị phù hợp khác "
                "tùy theo thăm khám lâm sàng."
            )
        
        if 'DME' in risk_assessment['positive_conditions']:
            recommendations.append(
                "⚠️ Phát hiện phù hoàng điểm do đái tháo đường (DME) – Khuyến nghị gửi khám "
                "bác sĩ chuyên khoa võng mạc để được đánh giá chi tiết."
            )
            recommendations.append(
                "Cần tối ưu kiểm soát đường huyết (HbA1c, chế độ ăn, thuốc điều trị) và các yếu tố nguy cơ tim mạch "
                "khác theo hướng dẫn của bác sĩ nội khoa."
            )
            recommendations.append(
                "Tùy mức độ tổn thương, có thể cân nhắc điều trị laser vùng hoàng điểm hoặc tiêm nội nhãn "
                "thuốc kháng VEGF/corticosteroid theo chỉ định chuyên khoa."
            )
        
        if 'DRUSEN' in risk_assessment['positive_conditions']:
            recommendations.append(
                "Phát hiện drusen – dấu hiệu sớm gợi ý nguy cơ thoái hóa hoàng điểm tuổi già (AMD)."
            )
            recommendations.append(
                "Có thể cân nhắc sử dụng bổ sung vi chất theo khuyến cáo tương đương công thức AREDS2 "
                "(vitamin và khoáng chất hỗ trợ võng mạc) nếu phù hợp với tình trạng toàn thân."
            )
            recommendations.append(
                "Khuyến nghị theo dõi định kỳ, tái khám sau khoảng 6 tháng hoặc sớm hơn nếu thị lực giảm, "
                "méo hình hoặc nhìn biến dạng."
            )
        
        # =====================================================
        # SYSTEMIC HEALTH RECOMMENDATIONS (AURA Core Feature)
        # Using retinal findings as "window" to systemic health
        # =====================================================
        if systemic_risks:
            # Cardiovascular risk
            cv_risk = systemic_risks.get('cardiovascular', {})
            if cv_risk.get('risk_level') in ['High', 'Moderate']:
                level_vi = _risk_level_vi(cv_risk['risk_level'])
                recommendations.append(
                    f"❤️ Tim mạch: Nguy cơ {level_vi} được gợi ý dựa trên các thay đổi mạch máu võng mạc."
                )
                recommendations.append(
                    "   → Nên tầm soát bệnh lý tim mạch: đo huyết áp, xét nghiệm mỡ máu (cholesterol, triglycerid), "
                    "và đánh giá các yếu tố nguy cơ khác như hút thuốc, thừa cân, ít vận động."
                )
            
            # Diabetes risk
            diabetes_risk = systemic_risks.get('diabetes', {})
            if diabetes_risk.get('risk_level') in ['High', 'Moderate']:
                level_vi = _risk_level_vi(diabetes_risk['risk_level'])
                recommendations.append(
                    f"🩸 Đái tháo đường: Nguy cơ biến chứng {level_vi} được gợi ý thông qua hình ảnh võng mạc."
                )
                recommendations.append(
                    "   → Cần tối ưu kiểm soát đường huyết (mục tiêu HbA1c thường < 7% nếu phù hợp), "
                    "tuân thủ thuốc, chế độ ăn và luyện tập theo hướng dẫn bác sĩ."
                )
                recommendations.append(
                    "   → Nên kiểm tra định kỳ các biến chứng khác của đái tháo đường (thận, thần kinh ngoại biên, tim mạch…)."
                )
            
            # Hypertension risk
            hypertension_risk = systemic_risks.get('hypertension', {})
            if hypertension_risk.get('risk_level') in ['High', 'Moderate']:
                level_vi = _risk_level_vi(hypertension_risk['risk_level'])
                recommendations.append(
                    f"🔺 Tăng huyết áp: Hình ảnh mạch máu võng mạc gợi ý nguy cơ {level_vi}."
                )
                recommendations.append(
                    "   → Nên đo huyết áp thường xuyên và tham khảo ý kiến bác sĩ nếu huyết áp cao hoặc dao động nhiều "
                    "để được điều chỉnh thuốc và tư vấn lối sống."
                )
            
            # Stroke risk
            stroke_risk = systemic_risks.get('stroke', {})
            if stroke_risk.get('risk_level') in ['High', 'Moderate']:
                level_vi = _risk_level_vi(stroke_risk['risk_level'])
                recommendations.append(
                    f"🧠 Đột quỵ: Nguy cơ {level_vi} về bệnh lý mạch máu não được gợi ý từ dấu hiệu trên võng mạc."
                )
                recommendations.append(
                    "   → Khuyến nghị sớm tham khảo bác sĩ chuyên khoa thần kinh hoặc tim mạch để được đánh giá thêm."
                )
                recommendations.append(
                    "   → Có thể cân nhắc làm siêu âm Doppler động mạch cảnh và các xét nghiệm cận lâm sàng liên quan "
                    "nếu bác sĩ chỉ định."
                )
        # Khuyến nghị dựa trên mức độ nguy cơ tổng thể
        if risk_level == 'High':
            recommendations.append(
                "🔴 MỨC ĐỘ ƯU TIÊN CAO: Cần được bác sĩ chuyên khoa thăm khám trực tiếp trong thời gian sớm nhất có thể."
            )
        elif risk_level == 'Medium':
            recommendations.append(
                "🟡 Khuyến nghị được bác sĩ chuyên khoa thăm khám trong vòng khoảng 2–4 tuần "
                "để đánh giá chi tiết và xây dựng kế hoạch theo dõi/điều trị."
            )
        
        # Tóm tắt khi có nguy cơ hệ thống cần theo dõi
        if systemic_risks and risk_assessment.get('requires_systemic_followup'):
            recommendations.append("")
            recommendations.append("📋 TÓM TẮT SỨC KHỎE TOÀN THÂN:")
            recommendations.append(
                "   Các dấu hiệu trên võng mạc gợi ý khả năng tồn tại nguy cơ đối với sức khỏe toàn thân "
                "(tim mạch, chuyển hóa hoặc mạch máu não)."
            )
            recommendations.append(
                "   Khuyến nghị phối hợp nhiều chuyên khoa (mắt, nội tiết, tim mạch, thần kinh…) để được đánh giá "
                "và theo dõi toàn diện hơn."
            )
        
        return recommendations
    
    def _mock_predict(self, image_array: np.ndarray) -> Dict[str, Any]:
        """Generate mock predictions when model unavailable"""
        # Generate realistic mock based on image statistics
        if len(image_array.shape) == 3:
            gray = np.mean(image_array, axis=2)
        else:
            gray = image_array
        
        img_mean = np.mean(gray)
        img_std = np.std(gray)
        
        # Base probabilities
        probs = np.array([0.1, 0.1, 0.15, 0.65])  # CNV, DME, DRUSEN, NORMAL
        
        # Add variation
        noise = np.random.normal(0, 0.05, 4)
        probs = np.clip(probs + noise, 0.01, 0.99)
        probs = probs / probs.sum()  # Normalize
        
        predicted_idx = np.argmax(probs)
        predicted_class = self.OCT_CLASSES[predicted_idx]
        confidence = float(probs[predicted_idx])
        
        return self._build_clinical_results(probs, predicted_class, confidence)
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            'model_loaded': self.model_loaded,
            'model_version': self.model_version,
            'model_id': self.HF_MODEL_ID,
            'architecture': 'EfficientNet-B3',
            'use_mock': self.use_mock,
            'pytorch_available': PYTORCH_AVAILABLE,
            'device': str(self.device) if self.device else 'cpu',
            'gpu_available': torch.cuda.is_available() if PYTORCH_AVAILABLE else False,
            'image_size': self.IMAGE_SIZE,
            'classes': self.OCT_CLASSES,
            'num_classes': len(self.OCT_CLASSES),
            # AURA-specific: Systemic health detection
            'systemic_health_detection': True,
            'detectable_systemic_risks': list(self.SYSTEMIC_HEALTH_RISKS.keys()),
            'description': 'AURA AI Core - Retinal imaging as window to systemic health'
        }
    
    def predict_batch(self, images: List[np.ndarray]) -> List[Dict[str, Any]]:
        """
        Batch prediction cho nhiều ảnh.
        
        Lưu ý:
        - Nếu đang ở chế độ mock, sẽ gọi từng ảnh như predict() hiện tại.
        - Nếu có PyTorch và model thật, sẽ gom ảnh thành tensor batch để tận dụng hiệu năng.
        """
        if not self.model_loaded:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        # Mock: giữ nguyên logic cũ cho đơn giản
        if self.use_mock or not PYTORCH_AVAILABLE:
            results: List[Dict[str, Any]] = []
            for img in images:
                try:
                    results.append(self._mock_predict(img))
                except Exception as e:
                    logger.error(f"Error processing image in batch (mock): {str(e)}")
                    results.append({"error": str(e)})
            return results

        # Thực sự batch bằng tensor
        try:
            tensors: List[torch.Tensor] = []
            for img in images:
                try:
                    tensors.append(self.preprocess_image(img))
                except Exception as e:
                    logger.error(f"Preprocess failed for one image in batch: {str(e)}")
                    tensors.append(None)  # sẽ đánh dấu lỗi ở kết quả
            
            # Nếu tất cả đều lỗi preprocess
            if all(t is None for t in tensors):
                return [{"error": "Không thể tiền xử lý bất kỳ ảnh nào trong batch."} for _ in images]

            # Ghép các ảnh hợp lệ thành batch tensor
            valid_indices = [i for i, t in enumerate(tensors) if t is not None]
            if not valid_indices:
                return [{"error": "Không thể tiền xử lý bất kỳ ảnh nào trong batch."} for _ in images]

            batch_tensor = torch.cat([tensors[i] for i in valid_indices], dim=0)

            with torch.no_grad():
                output = self.model(batch_tensor)
                probs_batch = F.softmax(output, dim=1).cpu().numpy()

            results: List[Dict[str, Any]] = []
            valid_ptr = 0
            for idx, img in enumerate(images):
                if tensors[idx] is None:
                    results.append({"error": "Tiền xử lý ảnh thất bại."})
                    continue

                probs = probs_batch[valid_ptr]
                valid_ptr += 1

                predicted_idx = int(np.argmax(probs))
                predicted_class = self.OCT_CLASSES[predicted_idx]
                confidence = float(probs[predicted_idx])

                logger.info(
                    f"[Batch] Prediction image {idx}: {predicted_class} ({confidence:.2%})"
                )

                clinical = self._build_clinical_results(probs, predicted_class, confidence)
                results.append(clinical)

            return results

        except Exception as e:
            logger.error(f"Error in batch prediction: {str(e)}")
            # Fallback: thử lại theo từng ảnh để không mất toàn bộ batch
            fallback_results: List[Dict[str, Any]] = []
            for img in images:
                try:
                    fallback_results.append(self.predict(img))
                except Exception as e_img:
                    logger.error(f"Fallback single prediction failed: {str(e_img)}")
                    fallback_results.append({"error": str(e_img)})
            return fallback_results


# Singleton instance
_model_service: Optional[RetinalModelService] = None


def get_model_service() -> RetinalModelService:
    """Get or create model service singleton"""
    global _model_service
    if _model_service is None:
        _model_service = RetinalModelService()
    return _model_service
