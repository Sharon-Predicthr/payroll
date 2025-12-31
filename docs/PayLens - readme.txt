# PayLens - Multi-Tenant Payroll SaaS Platform

A comprehensive payroll management system built with NestJS (backend) and Next.js (frontend), featuring multi-tenant architecture, employee management, payslip generation, and more.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your machine:

### Required Software

1. **Docker Desktop** (or Docker Engine + Docker Compose)
   - **Windows/Mac**: Download from [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - **Linux**: Install Docker Engine and Docker Compose
   - **Verify installation**: Open a terminal and run:
     ```bash
     docker --version
     docker compose version
     ```
     Both commands should display version numbers.

2. **Git** (optional, if cloning from repository)
   - Download from [Git](https://git-scm.com/downloads)
   - **Verify installation**: Run `git --version`

### System Requirements

- **RAM**: Minimum 4GB (8GB recommended)
- **Disk Space**: At least 5GB free space
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)

## 🚀 Quick Start Guide

### Step 1: Get the Code

If you have the code in a Git repository:
```bash
git clone <repository-url>
cd payroll
```

If you have the code as a ZIP file:
1. Extract the ZIP file to a folder
2. Open a terminal in that folder

### Step 2: Start the Application

**That's it!** Just run this single command:

```bash
docker compose up -d
```

This command will:
- Download all required Docker images (if not already present)
- Build the application containers
- Start the SQL Server database
- Initialize the database with tables and data
- Start the backend API server
- Start the frontend web application

**Note**: The first time you run this command, it may take 5-10 minutes to download images and build the application. Subsequent starts will be much faster.

### Step 3: Access the Application

Once all containers are running, open your web browser and navigate to:

- **Frontend (Web Application)**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Database**: localhost:1435 (SQL Server)

### Step 4: Verify Everything is Running

Check the status of all containers:
```bash
docker compose ps
```

You should see all services with status "Up" or "running".

View logs if needed:
```bash
docker compose logs -f
```

Press `Ctrl+C` to exit the logs view.

## 📝 Common Commands

### Start the Application
```bash
docker compose up -d
```
The `-d` flag runs containers in the background (detached mode).

### Stop the Application
```bash
docker compose down
```

### Restart the Application
```bash
docker compose restart
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service (backend, frontend, sqlserver)
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f sqlserver
```

### Rebuild After Code Changes
```bash
docker compose up -d --build
```

### Stop and Remove Everything (including data)
```bash
docker compose down -v
```
⚠️ **Warning**: This will delete all database data!

## 🏗️ Application Architecture

The application consists of the following services:

1. **SQL Server Database** (`sqlserver`)
   - Stores all application data
   - Port: 1435 (mapped from container port 1433)
   - Default credentials: `sa` / `MyStrongPass123!`

2. **Backend API** (`backend`)
   - NestJS REST API
   - Port: 4000
   - Handles business logic, authentication, and data processing

3. **Frontend** (`frontend`)
   - Next.js web application
   - Port: 3000
   - User interface for the payroll system

4. **Nginx** (`nginx`) - Optional
   - Reverse proxy for production deployments
   - Only runs when using the `production` profile

## 🔧 Configuration

### Environment Variables

The application uses default configuration that works out of the box. For production deployments, you may want to customize:

**Backend Environment Variables** (in `docker-compose.yml`):
- `CONTROL_DB_URL`: Database connection string
- `JWT_SECRET`: Secret key for JWT tokens (change in production!)
- `PORT`: Backend server port (default: 4000)

**Frontend Environment Variables**:
- `NEXT_PUBLIC_BACKEND_URL`: Backend API URL (default: http://localhost:4000)

### Database Password

The default SQL Server password is `MyStrongPass123!`. To change it:

1. Edit `docker-compose.yml`
2. Change `MSSQL_SA_PASSWORD` in the `sqlserver` service
3. Update `CONTROL_DB_URL` in the `backend` service
4. Rebuild and restart: `docker compose up -d --build`

## 🐛 Troubleshooting

### Containers Won't Start

1. **Check Docker is running**:
   ```bash
   docker ps
   ```

2. **Check for port conflicts**:
   - Ensure ports 3000, 4000, and 1435 are not in use
   - On Windows/Mac, check Docker Desktop is running

3. **View error logs**:
   ```bash
   docker compose logs
   ```

### Database Connection Issues

1. **Wait for database to be ready**:
   The database initialization may take 1-2 minutes on first start.

2. **Check database health**:
   ```bash
   docker compose ps sqlserver
   ```

3. **Restart database**:
   ```bash
   docker compose restart sqlserver
   ```

### Frontend/Backend Not Loading

1. **Check if services are running**:
   ```bash
   docker compose ps
   ```

2. **Check service logs**:
   ```bash
   docker compose logs frontend
   docker compose logs backend
   ```

3. **Rebuild containers**:
   ```bash
   docker compose up -d --build
   ```

### Out of Disk Space

Docker images and containers can use significant disk space. To clean up:

```bash
# Remove unused containers, networks, and images
docker system prune

# Remove all unused data (including volumes - WARNING: deletes data!)
docker system prune -a --volumes
```

## 📚 Additional Resources

- **Development Setup**: See `QUICK_START.md` for local development without Docker
- **Docker Deployment**: See `DOCKER_DEPLOYMENT.md` for production deployment details
- **Database Setup**: See `database/init/README.md` for database initialization scripts

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `docker compose logs`
2. Verify Docker is running: `docker ps`
3. Ensure all prerequisites are installed correctly
4. Try rebuilding: `docker compose up -d --build`

## 📄 License

[Your License Here]

---

**Made with ❤️ for payroll management**
