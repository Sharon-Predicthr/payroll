# Fix for "Cannot POST /api/auth/login" Error

If you're getting a 404 error for `/api/auth/login`, follow these steps:

## Solution 1: Restart Next.js Dev Server

1. Stop the Next.js dev server (press `Ctrl+C` in the terminal where it's running)
2. Restart it:
   ```bash
   cd frontend
   npm run dev
   ```

## Solution 2: Clear Next.js Cache

If restarting doesn't work, clear the cache:

1. Stop the dev server
2. Delete the `.next` folder:
   ```bash
   cd frontend
   rm -rf .next  # On Windows: rmdir /s /q .next
   ```
3. Restart the dev server:
   ```bash
   npm run dev
   ```

## Solution 3: Verify Backend is Running

Make sure your backend is running on port 4000:

```bash
cd backend
npm run start:dev
```

## Verify the Route

The API route should be at: `frontend/app/api/auth/login/route.ts`

It should export a `POST` function like:
```typescript
export async function POST(request: NextRequest) {
  // ... code
}
```

## Check Console Logs

After restarting, check:
1. Next.js terminal - should show the route being compiled
2. Browser console - should show any errors
3. Network tab - should show the request going to `/api/auth/login`

