# גישה מרחוק למערכת - פתרונות חלופיים

## פתרון 1: VPN (מומלץ)
אם המשתמשים על אותו רשת או VPN:
- המשתמשים יגשו ל: `http://YOUR_LOCAL_IP:3000`
- ה-backend יגיע דרך: `http://YOUR_LOCAL_IP:4000`

### איך למצוא את ה-IP המקומי:
```bash
# Windows PowerShell
ipconfig | findstr IPv4
```

### עדכון .env.local:
```env
NEXT_PUBLIC_BACKEND_URL=http://YOUR_LOCAL_IP:4000
```

---

## פתרון 2: Port Forwarding (Router)
אם יש לך גישה ל-router:
1. פתח port 3000 (frontend) ו-4000 (backend)
2. המשתמשים יגשו דרך: `http://YOUR_PUBLIC_IP:3000`

---

## פתרון 3: Cloudflare Tunnel (חינמי)
```bash
# התקנה
npm install -g cloudflared

# Frontend
cloudflared tunnel --url http://localhost:3000

# Backend (טרמינל נוסף)
cloudflared tunnel --url http://localhost:4000
```

---

## פתרון 4: Deployment אמיתי
- **Frontend**: Vercel / Netlify (חינמי)
- **Backend**: Railway / Render / Fly.io (חינמי עם מגבלות)
- **Database**: SQL Server על Azure / AWS

---

## הערה
ngrok לא עובד טוב עם המערכת הנוכחית ולכן בוטל.

