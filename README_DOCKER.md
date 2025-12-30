# Quick Start - Docker Deployment

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone <your-repo>
   cd payroll
   ```

2. **Create environment file:**
   ```bash
   # Copy example (or create manually)
   cat > .env << EOF
   CONTROL_DB_URL=Server=sqlserver;Database=PayrollControlDB;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=True;
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   PORT=4000
   NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
   NODE_ENV=production
   EOF
   ```

3. **Start all services:**
   ```bash
   docker-compose up -d --build
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:4000

5. **View logs:**
   ```bash
   docker-compose logs -f
   ```

6. **Stop:**
   ```bash
   docker-compose down
   ```

## Development Mode

```bash
docker-compose -f docker-compose.dev.yml up --build
```

## Important Notes

- **Change default passwords** in `.env` before production!
- **SQL Server data** is persisted in Docker volume `sqlserver-data`
- For **production**, use managed SQL Server (RDS/Azure SQL/Cloud SQL) instead of container

## Troubleshooting

See `DOCKER_DEPLOYMENT.md` for detailed troubleshooting and cloud deployment guides.




