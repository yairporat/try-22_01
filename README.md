# THV

## איך מריצים את הפרויקט

1. מתקינים [Node.js](https://nodejs.org) (גרסת LTS). צריך להתקין רק פעם אחת.
2. מורידים את הפרויקט: ב-GitHub עוברים לענף `claude/adventure-preview-tkdnrh`, לוחצים על **Code** ואז על **Download ZIP**, ומחלצים את הקובץ.
3. פותחים טרמינל בתוך התיקייה שחולצה ומריצים:
   ```
   npm install
   npm run dev
   ```
4. פותחים בדפדפן: http://localhost:3000

כדי לעצור את השרת: Ctrl+C בטרמינל.

## מה יש בפרויקט

```
app/
  layout.jsx           מעטפת לכל העמודים (עברית, מימין לשמאל)
  page.tsx             מסך הבית: "מצא לי את ההרפתקה שלי"
  adventure/page.jsx   עמוד ההרפתקה: התחנות, המפה, "התחל הרפתקה"
public/places/         תמונות התחנות (כרגע זמניות)
package.json           רשימת הספריות של הפרויקט
package-lock.json      הגרסאות המדויקות של הספריות
tsconfig.json          הגדרות TypeScript (בשביל page.tsx)
next-env.d.ts          קובץ ש-Next.js יוצר בעצמו
```

תיקיות שנוצרות לבד ולא צריך להעתיק: `node_modules` (נוצרת ב-`npm install`) ו-`.next` (נוצרת בהרצה).
