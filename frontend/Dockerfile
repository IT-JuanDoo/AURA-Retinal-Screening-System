# =============================================================================
# AURA Frontend - React/Vite Application
# Multi-stage build for optimized production image
# =============================================================================

# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Clean npm cache and install dependencies
RUN npm cache clean --force && npm ci --silent

# Copy source code
COPY . .

# Build arguments for environment variables
# In Docker production, API is proxied through nginx at /api
ARG VITE_API_URL=/api
ARG VITE_GOOGLE_CLIENT_ID=1004537461818-uh893ns4v68194fcqgq9e41s2bvhpc97.apps.googleusercontent.com
ARG VITE_FACEBOOK_APP_ID=25814417824848385
ARG VITE_CLOUDINARY_CLOUD_NAME=dylia0tle
ARG VITE_CLOUDINARY_UPLOAD_PRESET=aura-avatar-upload
ARG VITE_APP_NAME=AURA
ARG VITE_APP_VERSION=1.0.0

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_FACEBOOK_APP_ID=$VITE_FACEBOOK_APP_ID
ENV VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME
ENV VITE_CLOUDINARY_UPLOAD_PRESET=$VITE_CLOUDINARY_UPLOAD_PRESET
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Build the application
RUN npm run build

# Stage 2: Production with Nginx
FROM nginx:1.25-alpine AS production
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built assets from build stage
COPY --from=build /app/dist .

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

