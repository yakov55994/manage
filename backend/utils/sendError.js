export const sendError = (res, err) => {
  const msg = err?.message || "שגיאה לא ידועה";

  // 🔐 הרשאות
  if (msg === "אין הרשאה") {
    return res.status(403).json({ success: false, message: msg });
  }

  // ❗ לא נמצא
  if (msg === "לא נמצא" || msg.includes("לא נמצא")) {
    return res.status(404).json({ success: false, message: msg });
  }

  // 🟡 שגיאה מצד המשתמש (וולידציה)
  if (msg.includes("לא תקין") || msg.includes("שדה חסר")) {
    return res.status(400).json({ success: false, message: msg });
  }

  // 🟡 שגיאות ולידציה נוספות - סכום לא זהה, חובה לבחור וכו'
  if (msg.includes("סכום") || msg.includes("חובה") || msg.includes("חייב")) {
    return res.status(400).json({ success: false, message: msg });
  }

  // 🔴 שגיאת DB או אחרת
  console.error("❌ SERVER ERROR:", err);
  return res.status(500).json({ success: false, message: "שגיאת שרת" });
};
