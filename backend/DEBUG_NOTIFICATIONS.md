# Debug Notifications Issue

## Quick Diagnostic Steps

### Step 1: Check what user ID is in your JWT token

Open browser console and run:
```javascript
// Decode JWT token to see user ID
const token = localStorage.getItem('paylens_access_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('User ID in JWT:', payload.sub);
console.log('Full JWT payload:', payload);
```

### Step 2: Check notifications in database

Run this SQL query in your Control DB:
```sql
-- See all notifications for your tenant
SELECT 
    id,
    user_id,
    tenant_id,
    title,
    message,
    type,
    is_read,
    created_at
FROM notifications
WHERE tenant_id = '98375BB5-A6C0-4DA5-A458-1D621A5A7348'
ORDER BY created_at DESC;

-- See what user IDs have notifications
SELECT DISTINCT user_id, COUNT(*) as notification_count
FROM notifications
WHERE tenant_id = '98375BB5-A6C0-4DA5-A458-1D621A5A7348'
GROUP BY user_id;
```

### Step 3: Check what user ID the job is creating notifications for

From the logs, notifications are being created for: `D0D686C6-7C2F-49B9-9F19-DF664AACDD58`

### Step 4: Compare

If the user ID in your JWT (`payload.sub`) doesn't match `D0D686C6-7C2F-49B9-9F19-DF664AACDD58`, that's the problem!

## Quick Fix (Temporary)

If you want to test immediately, you can manually update notifications to your user ID:

```sql
-- First, get your user ID from JWT (see Step 1)
-- Then update notifications to your user ID:
DECLARE @YourUserId UNIQUEIDENTIFIER = 'YOUR_USER_ID_FROM_JWT'; -- Replace with your actual user ID

UPDATE notifications
SET user_id = @YourUserId
WHERE tenant_id = '98375BB5-A6C0-4DA5-A458-1D621A5A7348'
  AND user_id = 'D0D686C6-7C2F-49B9-9F19-DF664AACDD58';
```

## Permanent Fix

The issue is that `getTenantAdminUsers()` is finding a different user than the one you're logged in as. We need to ensure notifications are created for the currently logged-in user, or for all users in the tenant.

