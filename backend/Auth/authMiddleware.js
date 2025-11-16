// authMiddleware.js
import jwt from 'jsonwebtoken'

// פונקציה שמוודאת אם הקוקי מכיל טוקן תקין
const authenticate = (req, res, next) => {
  const token = req.cookies.auth_token; // לוקחים את הקוקי עם הטוקן

  if (!token) {
    return res.status(403).send('Access denied');
}

  try {
    // אם הטוקן תקין, מפענחים אותו
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    req.user = decoded; // שומרים את המידע שמפענחים מהטוקן
    next(); // אם הכל תקין, ממשיכים לקונטרולר הבא
  } catch (error) {
    return res.status(401).send('Invalid token');
  }
};

export default authenticate; 