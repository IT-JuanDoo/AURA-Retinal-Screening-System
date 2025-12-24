# =============================================================================
# AURA - Makefile for Docker Commands
# =============================================================================

.PHONY: help build up down logs clean dev prod restart

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
	@echo "  make clean      - Remove all containers, images, and volumes"
	@echo "  make shell-b    - Open shell in backend container"
	@echo "  make shell-f    - Open shell in frontend container"
	@echo "  make shell-db   - Open psql in database container"
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

# Shell access
shell-b:
	docker-compose exec backend sh

shell-f:
	docker-compose exec frontend sh

shell-db:
	docker-compose exec postgres psql -U aura_user -d aura_db

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

