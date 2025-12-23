# חשיפת האפליקציה למשתמשים נוספים

**הערה:** השימוש ב-ngrok בוטל. המערכת משתמשת ב-localhost:4000 עבור ה-backend.

---

## שיטה 1: ngrok (מומלץ - הכי פשוט)

### התקנה:
```bash
# Windows (PowerShell)
winget install ngrok
# או הורדה ידנית מ: https://ngrok.com/download

# לאחר התקנה, הרשמה בחינם ב: https://dashboard.ngrok.com/signup
# קבל את ה-auth token והזן:
ngrok config add-authtoken YOUR_TOKEN_HERE
```

### שימוש:
```bash
# טרמינל 1 - חשיפת Frontend (port 3000)
ngrok http 3000

# טרמינל 2 - חשיפת Backend (port 4000) 
ngrok http 4000
```

**חשוב**: תצטרך לעדכן את ה-frontend להצביע על ה-ngrok URL של ה-backend!

### עדכון Frontend להצביע על ngrok:
ערוך את `frontend/.env.local` (צריך ליצור אם לא קיים):
```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend-ngrok-url.ngrok.io
# או
NEXT_PUBLIC_API_BASE_URL=https://your-backend-ngrok-url.ngrok.io
```

**חשוב**: לאחר עדכון הקובץ, יש להפעיל מחדש את ה-frontend (`npm run dev`) כדי שהשינויים ייכנסו לתוקף!

---

## שיטה 2: Cloudflare Tunnel (חינמי, לא דורש הרשמה)

### התקנה:
```bash
npm install -g cloudflared
```

### שימוש:
```bash
# Frontend
cloudflared tunnel --url http://localhost:3000

# Backend (טרמינל נוסף)
cloudflared tunnel --url http://localhost:4000
```

**חשוב**: לאחר קבלת ה-URL של ה-backend, עדכן את `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend-cloudflare-url.trycloudflare.com
```

---

## שיטה 3: localtunnel (חינמי, פשוט)

### התקנה:
```bash
npm install -g localtunnel
```

### שימוש:
```bash
# Frontend
lt --port 3000

# Backend
lt --port 4000 --subdomain your-backend-name
```

**חשוב**: לאחר קבלת ה-URL של ה-backend, עדכן את `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend-name.loca.lt
```

---

## שלבים לביצוע (לכל השיטות):

1. **הפעל את ה-Frontend וה-Backend** (כמו תמיד):
   ```bash
   # טרמינל 1 - Backend
   cd backend
   npm run start:dev

   # טרמינל 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **הפעל את ה-Tunnel** (בחר שיטה אחת):
   - **ngrok**: `ngrok http 4000` (לטרמינל נפרד)
   - **Cloudflare**: `cloudflared tunnel --url http://localhost:4000`
   - **localtunnel**: `lt --port 4000 --subdomain your-name`

3. **קבל את ה-URL** של ה-backend מה-tunnel (יופיע בטרמינל)

4. **צור/עדכן `frontend/.env.local`**:
   ```env
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-tunnel-url
   ```

5. **הפעל מחדש את ה-Frontend** (Ctrl+C ואז `npm run dev` שוב)

6. **הפעל tunnel גם ל-Frontend** (אופציונלי, אם רוצה שהמשתמשים יגשו דרך tunnel):
   ```bash
   # טרמינל נוסף
   ngrok http 3000  # או cloudflared/localtunnel
   ```

7. **שתף את ה-URL של ה-Frontend** עם המשתמשים

## הערות חשובות:

1. **כל ה-tunnel URLs הם זמניים** - משתנים בכל הרצה (חוץ מ-ngrok עם תוכנית בתשלום)

2. **CORS** - ה-backend כבר מוגדר לאפשר כל origin (`origin: true`), אז זה אמור לעבוד.

3. **HTTPS** - כל ה-tunnels נותנים HTTPS חינם!

4. **בטחון** - הקפד לא לחשוף למשתמשים לא רצויים, הכל חשוף לכל מי שיש לו את ה-URL.

5. **Database** - ה-DB עדיין צריך להיות נגיש מה-localhost שלך (או שרת מרוחק).

6. **JWT Tokens** - ה-tokens נשמרים ב-localStorage, אז הם יעבדו גם דרך tunnel.

---

## פתרון קבוע יותר - Deployment אמיתי:

אם רוצה פתרון קבוע, אפשר לעשות:
- **Frontend**: Vercel / Netlify (חינמי)
- **Backend**: Railway / Render / Fly.io (חינמי עם מגבלות)
- **Database**: SQL Server על Azure / AWS (בתשלום) או להשאיר על השרת המקומי עם VPN

