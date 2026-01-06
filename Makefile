# =============================================================================
# AURA - Makefile for Docker Commands
# =============================================================================

.PHONY: help build up down logs clean dev prod restart rebuild-frontend rebuild-backend

# Default target
help:
	@echo "AURA Docker Commands:"
	@echo ""
	@echo "  make dev        - Start development environment (only database)"
	@echo "  make prod       - Build and start production environment"
	@echo "  make build      - Build all Docker images"
	@echo "  make up         - Start all containers"
	@echo "  make down       - Stop all containers"
	@echo "  make restart    - Restart all containers"
	@echo "  make logs       - View logs from all containers"
	@echo "  make logs-b     - View backend logs"
	@echo "  make logs-f     - View frontend logs"
	@echo "  make logs-db    - View database logs"
	@echo "  make logs-ai    - View AI Core logs"
	@echo "  make clean      - Remove all containers, images, and volumes"
	@echo "  make shell-b    - Open shell in backend container"
	@echo "  make shell-f    - Open shell in frontend container"
	@echo "  make shell-db   - Open psql in database container"
	@echo "  make shell-ai   - Open shell in AI Core container"
	@echo "  make rebuild-frontend - Rebuild frontend container (sau khi thêm code mới)"
	@echo "  make rebuild-backend  - Rebuild backend container (sau khi thêm code mới)"
	@echo "  make rebuild-ai      - Rebuild AI Core container (sau khi thêm code mới)"
	@echo "  make scale-ai N=3    - Scale AI Core to N instances"
	@echo "  make health-ai       - Check AI Core health status"
	@echo "  make backup-db      - Backup PostgreSQL database"
	@echo "  make restore-db FILE=path - Restore database from backup"
	@echo "  make health-db       - Check PostgreSQL health status"
	@echo "  make test-cloudinary - Test Cloudinary configuration"
	@echo ""

# Development mode (only database for local backend/frontend development)
dev:
	docker-compose -f docker-compose.dev.yml up -d
	@echo ""
	@echo "Development database started!"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  pgAdmin:    http://localhost:5050"
	@echo ""
	@echo "Run backend:  cd backend/src/Aura.API && dotnet run"
	@echo "Run frontend: cd frontend && npm run dev"

# Production mode
prod: build
	docker-compose up -d
	@echo ""
	@echo "AURA Production environment started!"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:5000"
	@echo "  pgAdmin:  http://localhost:5050"

# Build all images
build:
	docker-compose build

# Start containers
up:
	docker-compose up -d

# Stop containers
down:
	docker-compose down

# Restart containers
restart:
	docker-compose restart

# View all logs
logs:
	docker-compose logs -f

# View specific logs
logs-b:
	docker-compose logs -f backend

logs-f:
	docker-compose logs -f frontend

logs-db:
	docker-compose logs -f postgres

logs-ai:
	docker-compose logs -f aicore

# Shell access
shell-b:
	docker-compose exec backend sh

shell-f:
	docker-compose exec frontend sh

shell-db:
	docker-compose exec postgres psql -U aura_user -d aura_db

shell-ai:
	docker-compose exec aicore /bin/bash

# Clean everything
clean:
	docker-compose down -v --rmi all --remove-orphans
	@echo "All containers, images, and volumes removed!"

# Stop development
dev-down:
	docker-compose -f docker-compose.dev.yml down

# Clean development
dev-clean:
	docker-compose -f docker-compose.dev.yml down -v --rmi all --remove-orphans

# Rebuild frontend (sau khi thêm code mới)
rebuild-frontend:
	@echo "Rebuilding frontend container..."
	docker-compose build --no-cache frontend
	docker-compose up -d frontend
	@echo ""
	@echo "Frontend rebuilt and restarted!"
	@echo "Access at: http://localhost:3000/upload"

# Rebuild backend (sau khi thêm code mới)
rebuild-backend:
	@echo "Rebuilding backend container..."
	docker-compose build --no-cache backend
	docker-compose up -d backend
	@echo ""
	@echo "Backend rebuilt and restarted!"

# Rebuild AI Core (sau khi thêm code mới)
rebuild-ai:
	@echo "Rebuilding AI Core container..."
	docker-compose build --no-cache aicore
	docker-compose up -d aicore
	@echo ""
	@echo "AI Core rebuilt and restarted!"

# Scale AI Core service
scale-ai:
	@if [ -z "$(N)" ]; then \
		echo "Usage: make scale-ai N=3"; \
		exit 1; \
	fi
	@echo "Scaling AI Core to $(N) instances..."
	docker-compose up -d --scale aicore=$(N) --no-recreate aicore
	@echo ""
	@echo "AI Core scaled to $(N) instances!"
	@docker-compose ps aicore

# Check AI Core health
health-ai:
	@echo "Checking AI Core health..."
	@curl -s http://localhost:8000/health | python -m json.tool || echo "AI Core health check failed!"

# Database backup
backup-db:
	@echo "Creating database backup..."
	@mkdir -p database/backups
	@docker-compose exec -T postgres pg_dump -U aura_user aura_db > database/backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup created in database/backups/"

# Database restore
restore-db:
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make restore-db FILE=database/backups/backup_20240101_120000.sql"; \
		exit 1; \
	fi
	@echo "Restoring database from $(FILE)..."
	@docker-compose exec -T postgres psql -U aura_user -d aura_db < $(FILE)
	@echo "Database restored!"

# Database health check
health-db:
	@echo "Checking PostgreSQL health..."
	@docker-compose exec postgres pg_isready -U aura_user -d aura_db && echo "PostgreSQL is healthy!" || echo "PostgreSQL health check failed!"

# Test Cloudinary connection (requires backend to be running)
test-cloudinary:
	@echo "Testing Cloudinary configuration..."
	@curl -s http://localhost:5000/health | grep -q "healthy" && echo "Backend is running. Cloudinary config is in environment variables." || echo "Backend is not running. Start it with: make up"

