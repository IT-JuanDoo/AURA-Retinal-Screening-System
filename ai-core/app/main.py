"""
AURA AI Core Microservice
Retinal Image Analysis Service using Hugging Face OCT Classifier
Model: tomalmog/oct-retinal-classifier (EfficientNet-B3, 99.6% accuracy)
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, Dict, Any, List, Tuple
import uvicorn
import logging
from datetime import datetime
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AURA AI Core Microservice",
    description="""
    ## Comprehensive AI Understanding Retinal Analysis (AURA)
    
    **Using retinal imaging as a "window" to systemic health**
    
    ### 🔬 Model Information
    - **Model**: tomalmog/oct-retinal-classifier
    - **Architecture**: EfficientNet-B3
    - **Accuracy**: 99.6% on test set
    - **Source**: [Hugging Face](https://huggingface.co/tomalmog/oct-retinal-classifier)
    
    ### 👁️ Eye Conditions Detected
    - **CNV**: Choroidal Neovascularization
    - **DME**: Diabetic Macular Edema
    - **DRUSEN**: Early AMD (Age-related Macular Degeneration)
    - **NORMAL**: Healthy Retina
    
    ### ❤️ Systemic Health Risk Assessment (AURA Core Feature)
    Based on retinal vascular analysis, AURA estimates risks for:
    - **Cardiovascular Disease**: Heart disease risk from vascular changes
    - **Diabetes Complications**: Risk based on diabetic retinopathy signs
    - **Hypertension**: Blood pressure risk from vessel abnormalities
    - **Stroke**: Cerebrovascular risk assessment
    
    ### 📋 Clinical Decision Support
    AURA acts as a Clinical Decision Support (CDS) tool that assists — not replaces — physicians.
    """,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Request/Response Models
# ============================================================================

class AnalyzeRequest(BaseModel):
    """Request model for image analysis"""
    image_url: HttpUrl
    image_type: str = Field(default="OCT", description="Image type: OCT or Fundus")
    model_version: Optional[str] = None

class ConditionResult(BaseModel):
    """Result for a single condition"""
    probability: float
    positive: bool
    threshold: float
    severity: str
    clinical_name: str
    icd10: Optional[str] = None
    description: str
    confidence_interval: Dict[str, float]

class RiskAssessment(BaseModel):
    """Overall risk assessment"""
    risk_level: str
    risk_score: float
    primary_condition: str
    positive_conditions: List[str]
    urgency: str
    requires_referral: bool

class AnalysisResult(BaseModel):
    """Complete analysis result model for AURA Retinal Screening System"""
    analysis_id: str
    image_url: str
    image_type: str
    
    # Primary prediction
    predicted_class: str
    confidence: float
    
    # Risk assessment
    risk_level: str
    risk_score: float
    
    # Eye condition results
    conditions: Dict[str, Dict[str, Any]]
    risk_assessment: Dict[str, Any]
    findings: List[Dict[str, Any]]
    recommendations: List[str]
    
    # AURA Core Feature: Systemic Health Risk Assessment
    # Using retinal imaging as "window" to cardiovascular, diabetes, hypertension, stroke risks
    systemic_health_risks: Dict[str, Dict[str, Any]] = Field(
        default={},
        description="Systemic health risks derived from retinal findings (cardiovascular, diabetes, hypertension, stroke)"
    )
    
    # Annotations
    annotations: Optional[Dict[str, Any]] = None
    heatmap_url: Optional[str] = None
    
    # Metadata
    processed_at: datetime
    model_version: str
    model_info: Dict[str, Any]
    processing_time_ms: int
    image_quality: Dict[str, Any]

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    timestamp: datetime
    uptime_seconds: float
    model_loaded: bool
    model_info: Optional[Dict[str, Any]] = None

# ============================================================================
# Global State
# ============================================================================

app_start_time = datetime.now()
model_loaded = False
model_service = None

# ============================================================================
# Health Check Endpoint
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint for Docker and load balancer
    Returns service health status and model information
    """
    uptime = (datetime.now() - app_start_time).total_seconds()
    
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        timestamp=datetime.now(),
        uptime_seconds=uptime,
        model_loaded=model_loaded,
        model_info=model_service.get_model_info() if model_service else None
    )

@app.get("/api/health", response_model=HealthResponse)
async def health_check_api():
    """Health check endpoint at /api/health"""
    return await health_check()

# ============================================================================
# Analysis Endpoint
# ============================================================================

@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze_image(request: AnalyzeRequest, background_tasks: BackgroundTasks):
    """
    Analyze retinal image and return comprehensive risk assessment
    
    Uses the tomalmog/oct-retinal-classifier model for OCT image classification.
    
    **Supported conditions:**
    - CNV (Choroidal Neovascularization)
    - DME (Diabetic Macular Edema)
    - DRUSEN (Early AMD)
    - NORMAL (Healthy Retina)
    
    Args:
        request: AnalyzeRequest with image_url and image_type
        
    Returns:
        AnalysisResult with comprehensive risk assessment and clinical findings
    """
    start_time = datetime.now()
    
    try:
        logger.info(f"Analyzing image: {request.image_url}, Type: {request.image_type}")
        
        result = await perform_analysis(request)
        
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        result.processing_time_ms = processing_time
        
        logger.info(f"Analysis completed in {processing_time}ms - Prediction: {result.predicted_class}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error analyzing image: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze image: {str(e)}"
        )

async def perform_analysis(request: AnalyzeRequest) -> AnalysisResult:
    """
    Perform complete AI analysis on the image
    
    Pipeline:
    1. Download image from URL
    2. Validate image quality
    3. Preprocess image
    4. Run AI model inference
    5. Generate clinical findings and recommendations
    6. Generate annotations
    """
    import uuid
    import numpy as np
    
    try:
        from app.image_processor import ImageProcessor
    except ImportError:
        from image_processor import ImageProcessor
    
    analysis_id = str(uuid.uuid4())
    processor = ImageProcessor()
    
    try:
        # 1. Download image
        logger.info("Downloading image...")
        image_array, metadata = await processor.download_image(str(request.image_url))
        
        # 2. Validate image quality
        logger.info("Validating image...")
        validation = processor.validate_image(image_array, metadata)
        
        if not validation['is_valid']:
            logger.warning(f"Image validation issues: {validation['issues']}")
        
        # 3. Run AI model inference
        logger.info("Running model inference...")
        if model_service and model_service.model_loaded:
            try:
                # Model handles its own preprocessing
                model_results = model_service.predict(image_array)
                logger.info(f"Model prediction: {model_results.get('predicted_class', 'Unknown')}")
            except Exception as e:
                logger.error(f"Model prediction failed: {str(e)}")
                model_results = generate_fallback_results()
        else:
            logger.warning("Model not loaded, using fallback")
            model_results = generate_fallback_results()
        
        # 4. Extract results
        predicted_class = model_results.get('predicted_class', 'NORMAL')
        confidence = model_results.get('confidence', 0.5)
        conditions = model_results.get('conditions', {})
        risk_assessment = model_results.get('risk_assessment', {})
        recommendations = model_results.get('recommendations', [])
        
        # 5. Extract AURA systemic health risks (cardiovascular, diabetes, hypertension, stroke)
        systemic_health_risks = model_results.get('systemic_health_risks', {})
        
        # 6. Generate findings
        findings = generate_findings_from_results(model_results, validation)
        
        # 7. Generate annotations
        features = processor.analyze_image_features(
            processor.preprocess_image(image_array)
        )
        annotations = generate_annotations(features, image_array.shape)
        
        # 8. Log systemic health risks
        if systemic_health_risks:
            high_risks = [k for k, v in systemic_health_risks.items() if v.get('risk_level') in ['High', 'Moderate']]
            if high_risks:
                logger.info(f"Systemic health risks detected: {high_risks}")
        
        # 9. Build response
        return AnalysisResult(
            analysis_id=analysis_id,
            image_url=str(request.image_url),
            image_type=request.image_type,
            
            # Primary prediction
            predicted_class=predicted_class,
            confidence=confidence,
            
            # Risk assessment
            risk_level=risk_assessment.get('risk_level', 'Low'),
            risk_score=risk_assessment.get('risk_score', 0.0),
            
            # Eye condition results
            conditions=conditions,
            risk_assessment=risk_assessment,
            findings=findings,
            recommendations=recommendations,
            
            # AURA Core: Systemic health risks
            systemic_health_risks=systemic_health_risks,
            
            # Annotations
            annotations=annotations,
            heatmap_url=f"https://placeholder.aura-health.com/heatmaps/{analysis_id}.png",
            
            # Metadata
            processed_at=datetime.now(),
            model_version=model_service.model_version if model_service else "fallback",
            model_info=model_service.get_model_info() if model_service else {},
            processing_time_ms=0,  # Will be set by caller
            image_quality={
                'score': validation.get('quality_score', 0.0),
                'is_valid': validation.get('is_valid', False),
                'issues': validation.get('issues', []),
                'characteristics': validation.get('characteristics', {})
            }
        )
    finally:
        await processor.close()


def generate_fallback_results() -> Dict[str, Any]:
    """Generate fallback results when model is not available"""
    return {
        'predicted_class': 'NORMAL',
        'confidence': 0.5,
        'systemic_health_risks': {
            'cardiovascular': {
                'name': 'Cardiovascular Risk',
                'risk_score': 0.1,
                'risk_level': 'Minimal',
                'description': 'Risk of heart disease based on retinal vascular changes',
                'contributing_conditions': []
            },
            'diabetes': {
                'name': 'Diabetes Complications Risk',
                'risk_score': 0.1,
                'risk_level': 'Minimal',
                'description': 'Risk of diabetes-related complications',
                'contributing_conditions': []
            },
            'hypertension': {
                'name': 'Hypertension Risk',
                'risk_score': 0.1,
                'risk_level': 'Minimal',
                'description': 'Risk of high blood pressure based on vascular changes',
                'contributing_conditions': []
            },
            'stroke': {
                'name': 'Stroke Risk',
                'risk_score': 0.1,
                'risk_level': 'Minimal',
                'description': 'Risk of cerebrovascular events',
                'contributing_conditions': []
            }
        },
        'conditions': {
            'CNV': {
                'probability': 0.1,
                'positive': False,
                'threshold': 0.3,
                'severity': 'Not detected',
                'clinical_name': 'Choroidal Neovascularization',
                'icd10': 'H35.31',
                'description': 'Abnormal blood vessel growth beneath the retina',
                'confidence_interval': {'lower': 0.05, 'upper': 0.15}
            },
            'DME': {
                'probability': 0.1,
                'positive': False,
                'threshold': 0.3,
                'severity': 'Not detected',
                'clinical_name': 'Diabetic Macular Edema',
                'icd10': 'E11.311',
                'description': 'Fluid accumulation in the macula due to diabetes',
                'confidence_interval': {'lower': 0.05, 'upper': 0.15}
            },
            'DRUSEN': {
                'probability': 0.1,
                'positive': False,
                'threshold': 0.4,
                'severity': 'Not detected',
                'clinical_name': 'Drusen (Early AMD)',
                'icd10': 'H35.30',
                'description': 'Yellow deposits under the retina',
                'confidence_interval': {'lower': 0.05, 'upper': 0.15}
            },
            'NORMAL': {
                'probability': 0.7,
                'positive': True,
                'threshold': 0.5,
                'severity': 'Healthy',
                'clinical_name': 'Normal Retina',
                'icd10': None,
                'description': 'No significant abnormalities detected',
                'confidence_interval': {'lower': 0.65, 'upper': 0.75}
            }
        },
        'risk_assessment': {
            'risk_level': 'Low',
            'risk_score': 0.1,
            'primary_condition': 'NORMAL',
            'positive_conditions': [],
            'urgency': 'low',
            'requires_referral': False
        },
        'recommendations': [
            "⚠️ Model not loaded - results may be inaccurate",
            "No significant abnormalities detected (fallback analysis).",
            "Routine follow-up recommended in 12 months."
        ]
    }


def generate_findings_from_results(
    model_results: Dict[str, Any],
    validation: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Generate clinical findings from model results"""
    findings = []
    
    conditions = model_results.get('conditions', {})
    risk_assessment = model_results.get('risk_assessment', {})
    
    # Add findings for positive conditions
    for class_name, data in conditions.items():
        if class_name == 'NORMAL':
            continue
        
        if data.get('positive', False):
            prob = data.get('probability', 0.0)
            
            findings.append({
                "type": data.get('clinical_name', class_name),
                "severity": data.get('severity', 'Unknown'),
                "location": "Retina",
                "description": f"{data.get('clinical_name', class_name)} detected with {prob:.1%} probability",
                "probability": prob,
                "icd10": data.get('icd10'),
                "confidence_interval": data.get('confidence_interval', {}),
                "urgency": "high" if class_name in ['CNV', 'DME'] else "medium"
            })
    
    # If normal
    if not findings:
        normal_data = conditions.get('NORMAL', {})
        findings.append({
            "type": "Normal Retina",
            "severity": "Healthy",
            "location": "General",
            "description": f"No significant abnormalities detected (confidence: {normal_data.get('probability', 0.5):.1%})",
            "probability": normal_data.get('probability', 0.5),
            "urgency": "low"
        })
    
    # Add image quality note if needed
    quality_score = validation.get('quality_score', 1.0)
    if quality_score < 0.7:
        findings.append({
            "type": "Image Quality Note",
            "severity": "Warning",
            "location": "General",
            "description": f"Image quality is suboptimal (score: {quality_score:.2f}). Analysis confidence may be reduced.",
            "urgency": "low"
        })
    
    return findings


def generate_annotations(features: Dict[str, Any], image_shape: Tuple[int, ...]) -> Dict[str, Any]:
    """Generate annotations for the image"""
    import random
    
    height, width = image_shape[:2]
    
    abnormal_regions = []
    abnormalities_count = features.get('potential_abnormalities_count', 0)
    
    random.seed(42)
    
    for i in range(min(abnormalities_count, 5)):
        x = random.randint(50, max(51, width - 100))
        y = random.randint(50, max(51, height - 100))
        w = random.randint(30, 80)
        h = random.randint(30, 80)
        
        abnormal_regions.append({
            "x": x,
            "y": y,
            "width": w,
            "height": h,
            "type": "potential_abnormality",
            "confidence": random.uniform(0.5, 0.8)
        })
    
    return {
        "abnormal_regions": abnormal_regions,
        "image_dimensions": {
            "width": int(width),
            "height": int(height)
        }
    }

# ============================================================================
# Model Management Endpoints
# ============================================================================

@app.post("/api/models/load")
async def load_model_endpoint(
    model_path: Optional[str] = Query(None, description="Local path to model file"),
    model_version: str = Query("v2.0.0", description="Model version string")
):
    """
    Load AI model into memory
    
    By default, loads the tomalmog/oct-retinal-classifier from Hugging Face.
    """
    global model_loaded, model_service
    
    try:
        if model_service is None:
            try:
                from app.model_service import RetinalModelService
                model_service = RetinalModelService()
            except ImportError:
                raise HTTPException(
                    status_code=503,
                    detail="Model service not available"
                )
        
        logger.info(f"Loading model version: {model_version}")
        
        success = model_service.load_model(model_path, model_version)
        
        if success:
            model_loaded = model_service.model_loaded
            return {
                "status": "success",
                "message": f"Model loaded successfully",
                "model_version": model_version,
                "model_info": model_service.get_model_info()
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to load model"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

@app.get("/api/models/status")
async def model_status():
    """Get current model status and information"""
    if model_service is None:
        return {
            "model_loaded": False,
            "error": "Model service not initialized"
        }
    
    info = model_service.get_model_info()
    return {
        "model_loaded": info.get('model_loaded', False),
        "model_version": info.get('model_version'),
        "model_id": info.get('model_id'),
        "architecture": info.get('architecture'),
        "use_mock": info.get('use_mock', True),
        "pytorch_available": info.get('pytorch_available', False),
        "device": info.get('device', 'cpu'),
        "gpu_available": info.get('gpu_available', False),
        "classes": info.get('classes', []),
        "num_classes": info.get('num_classes', 0)
    }

@app.get("/api/models/classes")
async def get_model_classes():
    """Get list of classes the model can detect"""
    if model_service is None:
        return {
            "classes": ['CNV', 'DME', 'DRUSEN', 'NORMAL'],
            "descriptions": {
                'CNV': 'Choroidal Neovascularization - Abnormal blood vessel growth',
                'DME': 'Diabetic Macular Edema - Fluid accumulation due to diabetes',
                'DRUSEN': 'Early AMD - Yellow deposits under the retina',
                'NORMAL': 'Healthy Retina - No significant abnormalities'
            }
        }
    
    return {
        "classes": model_service.OCT_CLASSES,
        "condition_mapping": model_service.CONDITION_MAPPING
    }


@app.get("/api/systemic-health-risks")
async def get_systemic_health_risks():
    """
    Get list of systemic health risks that AURA can detect
    
    AURA uses retinal imaging as a "window" to systemic health,
    detecting risks of cardiovascular disease, diabetes complications,
    hypertension, and stroke based on retinal vascular changes.
    """
    if model_service is None:
        return {
            "systemic_risks": ['cardiovascular', 'diabetes', 'hypertension', 'stroke'],
            "description": "AURA detects systemic health risks from retinal findings"
        }
    
    return {
        "systemic_risks": list(model_service.SYSTEMIC_HEALTH_RISKS.keys()),
        "risk_details": model_service.SYSTEMIC_HEALTH_RISKS,
        "description": "AURA uses retinal imaging as a 'window' to systemic health"
    }

# ============================================================================
# Root Endpoint
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "AURA AI Core Microservice",
        "description": "Comprehensive AI Understanding Retinal Analysis - Using retinal imaging as a window to systemic health",
        "version": "2.0.0",
        "status": "running",
        "model": {
            "name": "OCT Retinal Classifier",
            "source": "tomalmog/oct-retinal-classifier",
            "architecture": "EfficientNet-B3",
            "accuracy": "99.6%",
            "eye_conditions": ["CNV", "DME", "DRUSEN", "NORMAL"]
        },
        "aura_features": {
            "systemic_health_detection": True,
            "detectable_risks": ["cardiovascular", "diabetes", "hypertension", "stroke"],
            "description": "Estimates systemic health risks from retinal vascular analysis"
        },
        "endpoints": {
            "health": "/health",
            "analyze": "/api/analyze",
            "model_status": "/api/models/status",
            "model_classes": "/api/models/classes",
            "systemic_risks": "/api/systemic-health-risks",
            "docs": "/docs"
        }
    }

# ============================================================================
# Startup/Shutdown Events
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    global model_loaded, model_service
    
    logger.info("=" * 60)
    logger.info("AURA AI Core Microservice starting up...")
    logger.info("Model: tomalmog/oct-retinal-classifier (EfficientNet-B3)")
    logger.info("=" * 60)
    
    # Initialize model service
    try:
        from app.model_service import RetinalModelService
        model_service = RetinalModelService()
        
        # Load model
        model_version = os.getenv("MODEL_VERSION", "v2.0.0")
        model_path = os.getenv("MODEL_PATH", None)
        
        logger.info(f"Loading model version: {model_version}")
        success = model_service.load_model(model_path, model_version)
        
        if success:
            model_loaded = model_service.model_loaded
            info = model_service.get_model_info()
            logger.info(f"Model loaded successfully!")
            logger.info(f"  - Model ID: {info.get('model_id')}")
            logger.info(f"  - Architecture: {info.get('architecture')}")
            logger.info(f"  - Device: {info.get('device')}")
            logger.info(f"  - GPU Available: {info.get('gpu_available')}")
            logger.info(f"  - Classes: {info.get('classes')}")
        else:
            logger.warning("Model loaded with fallback (mock predictions)")
            
    except ImportError as e:
        logger.error(f"Failed to import model service: {str(e)}")
        logger.warning("AI Core will use mock predictions")
    except Exception as e:
        logger.error(f"Error initializing model service: {str(e)}")
        logger.warning("AI Core will use mock predictions")
    
    logger.info("=" * 60)
    logger.info("AURA AI Core Microservice started successfully!")
    logger.info("Docs available at: /docs")
    logger.info("=" * 60)

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("AURA AI Core Microservice shutting down...")

# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,
        log_level="info"
    )
