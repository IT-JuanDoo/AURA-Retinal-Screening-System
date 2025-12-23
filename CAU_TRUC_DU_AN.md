# CẤU TRÚC DỰ ÁN - HỆ THỐNG AURA
## SP26SE025 - Retinal Screening System

---

## 📁 CẤU TRÚC TỔNG QUAN

```
aura-retinal-screening/
├── backend/                    # Backend API (.NET)
│   ├── src/
│   ├── tests/
│   └── docker/
├── frontend/                   # Frontend Web App (React + TypeScript)
│   ├── src/
│   ├── public/
│   └── tests/
├── database/                   # Database scripts
│   ├── migrations/
│   └── seeds/
├── docs/                       # Documentation
│   ├── api/
│   ├── design/
│   └── guides/
├── docker-compose.yml          # Docker compose cho local development
├── .gitignore
└── README.md
```

---

## 🔧 BACKEND STRUCTURE (.NET)

```
backend/
├── src/
│   ├── Aura.API/                          # Main API project
│   │   ├── Controllers/
│   │   │   ├── AuthController.cs
│   │   │   ├── UsersController.cs
│   │   │   ├── DoctorsController.cs
│   │   │   ├── ClinicsController.cs
│   │   │   ├── ImagesController.cs
│   │   │   ├── AnalysisResultsController.cs
│   │   │   ├── PackagesController.cs
│   │   │   ├── PaymentsController.cs
│   │   │   ├── MessagesController.cs
│   │   │   ├── NotificationsController.cs
│   │   │   ├── ReportsController.cs
│   │   │   └── AdminController.cs
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   └── appsettings.Development.json
│   │
│   ├── Aura.Core/                         # Core domain logic
│   │   ├── Entities/
│   │   │   ├── User.cs
│   │   │   ├── Doctor.cs
│   │   │   ├── Clinic.cs
│   │   │   ├── Admin.cs
│   │   │   ├── Role.cs
│   │   │   ├── Permission.cs
│   │   │   ├── RetinalImage.cs
│   │   │   ├── AnalysisResult.cs
│   │   │   ├── Annotation.cs
│   │   │   ├── ServicePackage.cs
│   │   │   ├── UserPackage.cs
│   │   │   ├── Payment.cs
│   │   │   ├── Message.cs
│   │   │   ├── Notification.cs
│   │   │   └── MedicalNote.cs
│   │   ├── Enums/
│   │   │   ├── RiskLevel.cs
│   │   │   ├── ImageType.cs
│   │   │   ├── AnalysisStatus.cs
│   │   │   └── PaymentStatus.cs
│   │   └── Interfaces/
│   │       ├── IAuditableEntity.cs
│   │       └── ISoftDeletable.cs
│   │
│   ├── Aura.Application/                  # Application layer
│   │   ├── Services/
│   │   │   ├── Auth/
│   │   │   │   ├── IAuthService.cs
│   │   │   │   └── AuthService.cs
│   │   │   ├── Users/
│   │   │   │   ├── IUserService.cs
│   │   │   │   └── UserService.cs
│   │   │   ├── Images/
│   │   │   │   ├── IImageService.cs
│   │   │   │   └── ImageService.cs
│   │   │   ├── Analysis/
│   │   │   │   ├── IAnalysisService.cs
│   │   │   │   └── AnalysisService.cs
│   │   │   └── ...
│   │   ├── DTOs/
│   │   │   ├── Auth/
│   │   │   │   ├── LoginDto.cs
│   │   │   │   ├── RegisterDto.cs
│   │   │   │   └── AuthResponseDto.cs
│   │   │   ├── Users/
│   │   │   │   ├── UserDto.cs
│   │   │   │   ├── CreateUserDto.cs
│   │   │   │   └── UpdateUserDto.cs
│   │   │   └── ...
│   │   ├── Mappings/
│   │   │   └── AutoMapperProfile.cs
│   │   └── Validators/
│   │       ├── CreateUserDtoValidator.cs
│   │       └── ...
│   │
│   ├── Aura.Infrastructure/               # Infrastructure layer
│   │   ├── Data/
│   │   │   ├── ApplicationDbContext.cs
│   │   │   ├── Repositories/
│   │   │   │   ├── IRepository.cs
│   │   │   │   ├── Repository.cs
│   │   │   │   ├── IUserRepository.cs
│   │   │   │   └── UserRepository.cs
│   │   │   └── UnitOfWork/
│   │   │       ├── IUnitOfWork.cs
│   │   │       └── UnitOfWork.cs
│   │   ├── Identity/
│   │   │   ├── JwtService.cs
│   │   │   └── PasswordHasher.cs
│   │   ├── External/
│   │   │   ├── CloudinaryService.cs
│   │   │   ├── AICoreClient.cs
│   │   │   └── PaymentGatewayService.cs
│   │   ├── Messaging/
│   │   │   ├── SignalRHub.cs
│   │   │   └── NotificationService.cs
│   │   └── Logging/
│   │       └── AuditLogger.cs
│   │
│   └── Aura.Shared/                       # Shared utilities
│       ├── Constants/
│       ├── Helpers/
│       ├── Middleware/
│       │   ├── ErrorHandlingMiddleware.cs
│       │   ├── AuthenticationMiddleware.cs
│       │   └── AuthorizationMiddleware.cs
│       └── Extensions/
│
├── tests/
│   ├── Aura.API.Tests/
│   ├── Aura.Application.Tests/
│   └── Aura.Infrastructure.Tests/
│
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

---

## 🎨 FRONTEND STRUCTURE (React + TypeScript)

```
frontend/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── assets/
│
├── src/
│   ├── components/                       # Reusable components
│   │   ├── common/
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   └── Button.test.tsx
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Table/
│   │   │   ├── Card/
│   │   │   └── Loading/
│   │   ├── layout/
│   │   │   ├── Header/
│   │   │   ├── Sidebar/
│   │   │   ├── Footer/
│   │   │   └── Layout.tsx
│   │   └── forms/
│   │       ├── LoginForm/
│   │       ├── RegisterForm/
│   │       └── ImageUploadForm/
│   │
│   ├── pages/                            # Page components
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── ForgotPasswordPage.tsx
│   │   ├── user/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── ImageUploadPage.tsx
│   │   │   ├── AnalysisResultsPage.tsx
│   │   │   └── ReportsPage.tsx
│   │   ├── doctor/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── PatientsPage.tsx
│   │   │   ├── AnalysisReviewPage.tsx
│   │   │   └── StatisticsPage.tsx
│   │   ├── clinic/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── BulkUploadPage.tsx
│   │   │   └── ReportsPage.tsx
│   │   └── admin/
│   │       ├── DashboardPage.tsx
│   │       ├── UserManagementPage.tsx
│   │       └── SystemConfigPage.tsx
│   │
│   ├── features/                         # Feature modules
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   │   └── authApi.ts
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── store/
│   │   │   │   └── authSlice.ts
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   ├── images/
│   │   ├── analysis/
│   │   ├── packages/
│   │   └── messaging/
│   │
│   ├── services/                         # API services
│   │   ├── api.ts                        # Axios instance
│   │   ├── authService.ts
│   │   ├── userService.ts
│   │   ├── imageService.ts
│   │   └── ...
│   │
│   ├── store/                            # State management
│   │   ├── index.ts
│   │   ├── rootReducer.ts
│   │   └── store.ts
│   │
│   ├── hooks/                            # Custom hooks
│   │   ├── useApi.ts
│   │   ├── useAuth.ts
│   │   └── useImageUpload.ts
│   │
│   ├── utils/                            # Utility functions
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   ├── validators.ts
│   │   └── formatters.ts
│   │
│   ├── types/                            # TypeScript types
│   │   ├── api.types.ts
│   │   ├── user.types.ts
│   │   └── ...
│   │
│   ├── routes/                           # Routing
│   │   ├── AppRoutes.tsx
│   │   ├── PrivateRoute.tsx
│   │   └── routes.config.ts
│   │
│   ├── styles/                           # Global styles
│   │   ├── theme.ts                      # Theme configuration
│   │   ├── globals.css
│   │   └── variables.css
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── vite.config.ts                   # hoặc tsconfig.json
│
├── tests/
│   ├── setup.ts
│   └── __mocks__/
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts                        # hoặc webpack.config.js
└── README.md
```

---

## 🗄️ DATABASE STRUCTURE

```
database/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_add_indexes.sql
│   └── ...
│
├── seeds/
│   ├── roles_seed.sql
│   ├── permissions_seed.sql
│   └── test_data.sql
│
├── aura_database_schema.sql              # Full schema (đã có)
└── README.md
```

---

## 📚 DOCS STRUCTURE

```
docs/
├── api/
│   ├── swagger.yaml                      # OpenAPI spec
│   └── postman_collection.json
│
├── design/
│   ├── erd.png
│   ├── architecture.md
│   └── wireframes/
│
├── guides/
│   ├── setup.md
│   ├── development.md
│   ├── deployment.md
│   └── contributing.md
│
└── requirements/
    ├── functional_requirements.md
    └── non_functional_requirements.md
```

---

## 🐳 DOCKER STRUCTURE

```
docker/
├── backend/
│   └── Dockerfile
├── frontend/
│   └── Dockerfile
└── docker-compose.yml
```

---

## 📝 FILE TEMPLATES

### Backend - Program.cs Template
```csharp
var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Authentication & Authorization
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => { /* JWT config */ });

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

### Frontend - API Service Template
```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 🔧 CONFIGURATION FILES

### Backend - appsettings.json
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=aura_db;Username=postgres;Password=password"
  },
  "Jwt": {
    "SecretKey": "your-secret-key-here",
    "Issuer": "AuraAPI",
    "Audience": "AuraClient",
    "ExpirationMinutes": 60
  },
  "Cloudinary": {
    "CloudName": "your-cloud-name",
    "ApiKey": "your-api-key",
    "ApiSecret": "your-api-secret"
  },
  "AICore": {
    "BaseUrl": "http://localhost:8000/api",
    "Timeout": 30000
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  }
}
```

### Frontend - .env.example
```env
VITE_API_URL=http://localhost:5000/api
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
```

---

## 📋 CHECKLIST SETUP DỰ ÁN

### Backend Setup
- [ ] Create .NET solution và projects
- [ ] Setup Entity Framework Core với PostgreSQL
- [ ] Configure JWT Authentication
- [ ] Setup Swagger/OpenAPI
- [ ] Configure CORS
- [ ] Setup dependency injection
- [ ] Create base repository pattern
- [ ] Setup logging
- [ ] Configure Cloudinary integration
- [ ] Setup Docker container

### Frontend Setup
- [ ] Initialize React + TypeScript project
- [ ] Setup Vite hoặc Create React App
- [ ] Install UI library (Material-UI/Ant Design)
- [ ] Setup React Router
- [ ] Setup state management (Redux/Zustand)
- [ ] Configure Axios
- [ ] Setup environment variables
- [ ] Create base layout components
- [ ] Setup authentication context
- [ ] Configure build và deployment

### Database Setup
- [ ] Run database schema script
- [ ] Create migration scripts
- [ ] Seed initial data (roles, permissions)
- [ ] Setup database backup strategy

### DevOps Setup
- [ ] Create Dockerfiles
- [ ] Setup docker-compose.yml
- [ ] Configure CI/CD pipeline
- [ ] Setup environment configurations
- [ ] Configure monitoring và logging

---

## 🚀 QUICK START

### Backend
```bash
cd backend/src/Aura.API
dotnet restore
dotnet run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker
```bash
docker-compose up -d
```

---



