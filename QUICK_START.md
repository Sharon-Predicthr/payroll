# Quick Start Guide

## Running the Application

### Option 1: Run Both Backend & Frontend Together (Recommended)
```bash
npm run dev
```
This will start both the backend (NestJS) and frontend (Next.js) simultaneously.

### Option 2: Run Separately

**Backend only:**
```bash
npm run dev:backend
```

**Frontend only:**
```bash
npm run dev:frontend
```

## Other Useful Commands

**Build both:**
```bash
npm run build
```

**Install all dependencies:**
```bash
npm run install:all
```

**Production mode (both):**
```bash
npm run start
```

## Ports

- **Backend:** http://localhost:4000
- **Frontend:** http://localhost:3000

## First Time Setup

1. Install all dependencies:
   ```bash
   npm run install:all
   ```

2. Set up environment variables:
   - Copy `backend/.env.example` to `backend/.env` (if exists)
   - Copy `frontend/.env.example` to `frontend/.env.local` (if exists)

3. Run the application:
   ```bash
   npm run dev
   ```


