# תיקון בעיית חיבור ל-Backend

## הבעיה:
ה-frontend מקבל שגיאה: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

זה קורה כי:
- ה-backend לא רץ על `localhost:4000`
- ה-ngrok מנסה להפנות ל-backend שלא קיים

## הפתרון:

### שלב 1: הפעל את ה-Backend
```bash
cd backend
npm run start:dev
```

וודא שאתה רואה:
```
Backend running on http://localhost:4000
```

### שלב 2: הפעל ngrok (אם צריך גישה מרחוק)
```bash
ngrok http 4000
```

העתק את ה-URL (למשל: `https://xyz123.ngrok-free.dev`)

### שלב 3: עדכן את frontend/.env.local
```env
NEXT_PUBLIC_BACKEND_URL=https://your-ngrok-url.ngrok-free.dev
```

או אם לא משתמשים ב-ngrok:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### שלב 4: הפעל מחדש את ה-Frontend
```bash
# עצור (Ctrl+C) והפעל מחדש
cd frontend
npm run dev
```

## בדיקה:
אחרי שכל זה רץ, נסה להתחבר למערכת - השגיאה צריכה להיעלם.

