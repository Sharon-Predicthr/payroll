# Docker Deployment Guide

This guide explains how to deploy PayLens using Docker, making it easy to run locally and deploy to cloud platforms.

## Architecture

```
┌─────────────┐
│   Nginx     │ (Optional, for production)
│  (Port 80)  │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│Front│ │Back │
│end  │ │end  │
│:3000│ │:4000│
└──┬──┘ └──┬──┘
   │       │
   └───┬───┘
       │
   ┌───▼──────┐
   │ SQL      │
   │ Server   │
   │ :1433    │
   └──────────┘
```

## Quick Start

### Production (Docker Compose)

1. **Clone and configure:**
   ```bash
   git clone <your-repo>
   cd payroll
   cp .env.example .env
   # Edit .env with your settings
   ```

2. **Build and start:**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - SQL Server: localhost:1433

4. **View logs:**
   ```bash
   docker-compose logs -f
   ```

5. **Stop:**
   ```bash
   docker-compose down
   ```

### Development Mode

For development with hot reload:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Control Database
CONTROL_DB_URL=Server=sqlserver;Database=PayrollControlDB;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=True;

# JWT Secret (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Backend Port
PORT=4000

# Frontend Backend URL (for Docker, use service name)
NEXT_PUBLIC_BACKEND_URL=http://backend:4000

# Or for external access:
# NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

## Services

### SQL Server
- **Image:** `mcr.microsoft.com/mssql/server:2022-latest`
- **Port:** 1433
- **Default Password:** `YourStrong@Passw0rd` (CHANGE IN PRODUCTION!)
- **Data Volume:** `sqlserver-data`

### Backend
- **Port:** 4000
- **Health Check:** `/health` endpoint
- **Dependencies:** SQL Server

### Frontend
- **Port:** 3000
- **Dependencies:** Backend
- **Build:** Uses Next.js standalone output

### Nginx (Optional)
- **Ports:** 80, 443
- **Profile:** `production`
- **Usage:** `docker-compose --profile production up`

## Cloud Deployment

### AWS (ECS / EC2)

1. **Build images:**
   ```bash
   docker build -t payroll-backend ./backend
   docker build -t payroll-frontend ./frontend
   ```

2. **Push to ECR:**
   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
   docker tag payroll-backend <account>.dkr.ecr.<region>.amazonaws.com/payroll-backend:latest
   docker push <account>.dkr.ecr.<region>.amazonaws.com/payroll-backend:latest
   ```

3. **Use managed SQL Server (RDS)** instead of container

### Azure (Container Instances / AKS)

1. **Build and push to ACR:**
   ```bash
   az acr build --registry <registry> --image payroll-backend ./backend
   az acr build --registry <registry> --image payroll-frontend ./frontend
   ```

2. **Use Azure SQL Database** instead of container

### Google Cloud (Cloud Run / GKE)

1. **Build and push to GCR:**
   ```bash
   gcloud builds submit --tag gcr.io/<project>/payroll-backend ./backend
   gcloud builds submit --tag gcr.io/<project>/payroll-frontend ./frontend
   ```

2. **Use Cloud SQL** instead of container

## Production Considerations

### Security

1. **Change default passwords:**
   - SQL Server SA password
   - JWT secret
   - Database passwords

2. **Use secrets management:**
   - AWS Secrets Manager
   - Azure Key Vault
   - HashiCorp Vault

3. **Enable HTTPS:**
   - Use Nginx with SSL certificates
   - Or use cloud load balancer with SSL

### Database

For production, **DO NOT** use SQL Server in a container. Use:
- **AWS:** RDS for SQL Server
- **Azure:** Azure SQL Database
- **GCP:** Cloud SQL for SQL Server

Update `CONTROL_DB_URL` to point to managed database.

### Scaling

- **Frontend:** Stateless, scale horizontally
- **Backend:** Stateless, scale horizontally
- **Database:** Use managed service with read replicas

### Monitoring

Add monitoring:
- **Health checks:** Already included
- **Logging:** Use Docker logging drivers
- **Metrics:** Add Prometheus/Grafana
- **APM:** Add Application Performance Monitoring

## Troubleshooting

### Port already in use
```bash
# Find and kill process
docker ps
docker stop <container-id>
```

### Database connection issues
```bash
# Check SQL Server logs
docker-compose logs sqlserver

# Test connection
docker-compose exec backend sh
# Then test connection from inside container
```

### Build failures
```bash
# Clean build
docker-compose down -v
docker system prune -a
docker-compose build --no-cache
```

## Next Steps

1. **Set up CI/CD:**
   - GitHub Actions
   - GitLab CI
   - Azure DevOps

2. **Add monitoring:**
   - Prometheus + Grafana
   - ELK Stack
   - CloudWatch / Application Insights

3. **Set up backups:**
   - Database backups
   - Volume snapshots

4. **Configure domain:**
   - Point domain to server
   - Set up SSL certificates




