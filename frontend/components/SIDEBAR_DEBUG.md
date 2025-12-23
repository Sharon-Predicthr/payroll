# Sidebar Debug Guide

הוספתי לוגים מפורטים כדי לחקור את בעיית התפריט שלא מגיב במסך עובדים.

## לוגים שמופיעים בקונסול:

### 1. Sidebar Rendering
- `[Sidebar] Rendering sidebar, pathname: ...` - כשהתפריט נטען

### 2. Mouse Events על Sidebar
- `[Sidebar] Mouse entered sidebar` - כשהעכבר נכנס לתפריט
- `[Sidebar] Mouse left sidebar` - כשהעכבר יוצא מהתפריט
- `[Sidebar] Click on aside element` - כל קליק על ה-aside
- `[Sidebar] Click on nav element` - כל קליק על ה-nav

### 3. Button Events
- `[Sidebar] MouseDown event` - כשלוחצים על כפתור
- `[Sidebar] MouseUp event` - כשמשחררים
- `[Sidebar] onClick event triggered` - כשהאירוע onClick מתבצע
- `[Sidebar] After preventDefault/stopPropagation` - אחרי מניעת התנהגות ברירת מחדל
- `[Sidebar] Navigating to: ...` - כשמתחילה הניווט
- `[Sidebar] router.push called successfully` - כשה-router.push נקרא בהצלחה

### 4. Employees Page
- `[EmployeesPage] Component mounted/updated` - כשהדף נטען
- `[EmployeesPage] Checking for elements that might block sidebar` - בדיקה לאלמנטים חוסמים
- `[EmployeesPage] Sidebar position: ...` - מיקום התפריט
- `[EmployeesPage] Elements at sidebar position: ...` - אלמנטים באותו מיקום
- `[EmployeesPage] Element X blocking sidebar` - אם יש אלמנט חוסם

### 5. PageShell
- `[PageShell] Layout rendered` - כשהלייאאוט נטען
- `[PageShell] Sidebar rect: ...` - מיקום התפריט
- `[PageShell] Main content rect: ...` - מיקום התוכן הראשי
- `[PageShell] Do they overlap?` - האם יש חפיפה
- `[PageShell] Click detected outside sidebar` - קליקים מחוץ לתפריט

## מה לחפש:

1. **אם לא רואים `[Sidebar] onClick event triggered`** - האירוע לא מגיע לכפתור, כנראה שיש אלמנט שמכסה אותו

2. **אם רואים `[EmployeesPage] Element X blocking sidebar`** - זה האלמנט החוסם!

3. **אם רואים `[PageShell] Do they overlap? true`** - יש חפיפה בין התפריט לתוכן

4. **אם רואים `[Sidebar] onClick` אבל לא `router.push called successfully`** - יש שגיאה בניווט

## פתרונות אפשריים:

אם נמצא אלמנט חוסם, צריך:
- להוריד לו z-index
- להוסיף לו `pointer-events: none` באזורים שמכסים את התפריט
- או להזיז את התפריט למקום אחר

