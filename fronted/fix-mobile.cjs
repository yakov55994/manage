#!/usr/bin/env node

/**
 * סקריפט אוטומטי לתיקון responsive למובייל
 * מחליף דפוסים נפוצים בכל קבצי ה-JSX
 */

const fs = require('fs');
const path = require('path');

// דפוסי החלפה
const replacements = [
  // תיקון padding ראשי - py-12 להיות responsive
  {
    pattern: /className="min-h-screen([^"]*?)py-12/g,
    replacement: 'className="min-h-screen$1pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-12'
  },

  // כותרות ראשיות
  {
    pattern: /className="([^"]*?)text-4xl([^"]*?)"/g,
    replacement: 'className="$1text-2xl sm:text-3xl md:text-4xl$2"'
  },

  // כותרות משניות
  {
    pattern: /className="([^"]*?)text-3xl([^"]*?)"/g,
    replacement: 'className="$1text-xl sm:text-2xl md:text-3xl$2"'
  },

  // Padding גדול בהדרים
  {
    pattern: /className="([^"]*?)p-8([^"]*?)"/g,
    replacement: 'className="$1p-4 sm:p-6 md:p-8$2"'
  },

  // Padding בינוני
  {
    pattern: /className="([^"]*?)p-6([^"]*?)"/g,
    replacement: 'className="$1p-4 sm:p-5 md:p-6$2"'
  },

  // Margin bottom
  {
    pattern: /className="([^"]*?)mb-10([^"]*?)"/g,
    replacement: 'className="$1mb-6 sm:mb-8 md:mb-10$2"'
  },

  {
    pattern: /className="([^"]*?)mb-6([^"]*?)"/g,
    replacement: 'className="$1mb-4 sm:mb-5 md:mb-6$2"'
  },

  // Gap
  {
    pattern: /className="([^"]*?)gap-4([^"]*?)"/g,
    replacement: 'className="$1gap-3 sm:gap-4$2"'
  },

  // Icon sizes - w-10 h-10
  {
    pattern: /className="([^"]*?)w-10 h-10([^"]*?)"/g,
    replacement: 'className="$1w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10$2"'
  },

  // Icon sizes - w-8 h-8
  {
    pattern: /className="([^"]*?)w-8 h-8([^"]*?)"/g,
    replacement: 'className="$1w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8$2"'
  },

  // Rounded corners
  {
    pattern: /className="([^"]*?)rounded-3xl([^"]*?)"/g,
    replacement: 'className="$1rounded-2xl sm:rounded-3xl$2"'
  },
];

// פונקציה לתיקון קובץ בודד
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // החלף את כל הדפוסים
    replacements.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });

    // שמור רק אם היו שינויים
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ תוקן: ${path.basename(filePath)}`);
      return true;
    }

    return false;
  } catch (err) {
    console.error(`❌ שגיאה בתיקון ${filePath}:`, err.message);
    return false;
  }
}

// פונקציה למציאת קבצים באופן רקורסיבי
function findJsxFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findJsxFiles(filePath, fileList);
    } else if (file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// מצא את כל קבצי ה-JSX
const pagesDir = path.join(__dirname, 'src/pages');
const files = findJsxFiles(pagesDir);

// דפים שכבר תוקנו (לא נגע בהם)
const skipFiles = [
  'Create_Order.jsx',
  'View_Orders.jsx',
  'View_Projects.jsx',
  'View_Invoices.jsx',
  'NavBar.jsx'
];

console.log('🚀 מתחיל תיקון קבצים למובייל...\n');

let fixedCount = 0;
let skippedCount = 0;

files.forEach(filePath => {
  const fileName = path.basename(filePath);

  // דלג על קבצים שכבר תוקנו
  if (skipFiles.includes(fileName)) {
    console.log(`⏭️  מדלג: ${fileName} (כבר תוקן)`);
    skippedCount++;
    return;
  }

  if (fixFile(filePath)) {
    fixedCount++;
  }
});

console.log('\n📊 סיכום:');
console.log(`✅ תוקנו: ${fixedCount} קבצים`);
console.log(`⏭️  דולגו: ${skippedCount} קבצים (כבר תוקנו קודם)`);
console.log(`📁 סה"כ: ${files.length} קבצים`);
console.log('\n✨ הסקריפט הסתיים בהצלחה!');
