# מדריך מהיר - גישה מרחוק למערכת

## מה צריך לעשות (3 שלבים פשוטים):

### שלב 1: הפעל את המערכת (כמו תמיד)
```bash
# טרמינל 1 - Backend
cd backend
npm run start:dev

# טרמינל 2 - Frontend  
cd frontend
npm run dev
```

### שלב 2: הפעל ngrok על ה-Frontend
```bash
# טרמינל 3 - ngrok
ngrok http 3000
```

תקבל URL כמו: `https://abc123.ngrok-free.dev`

### שלב 3: תן למשתמש את ה-URL
זה הכל! תן למשתמש את ה-URL מה-ngrok (למשל: `https://abc123.ngrok-free.dev`)

---

## חשוב לוודא:

1. **ה-frontend רץ** על `http://localhost:3000`
2. **ה-backend רץ** על `http://localhost:4000`
3. **קובץ `frontend/.env.local`** מכיל:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-ngrok-url.ngrok-free.dev
   ```
   (אבל אם אתה מריץ ngrok רק על frontend, זה לא נחוץ - ה-frontend יתחבר ל-backend דרך localhost)

---

## אם יש בעיה:

אם ngrok לא עובד, נסה:
```bash
# עצור את כל ה-ngrok processes
taskkill /F /IM ngrok.exe

# הרץ מחדש
ngrok http 3000
```

