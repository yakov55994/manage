// authMiddleware.js
import jwt from 'jsonwebtoken'

// פונקציה שמוודאת אם הקוקי מכיל טוקן תקין
const authenticate = (req, res, next) => {
  // console.log('Cookies received:', req.cookies);
  const token = req.cookies.auth_token; // לוקחים את הקוקי עם הטוקן

  if (!token) {
    // console.log('No token found in cookies');
    return res.status(403).send('Access denied');
}

  try {
    // אם הטוקן תקין, מפענחים אותו
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    // console.log('Token verified successfully:', decoded);
    req.user = decoded; // שומרים את המידע שמפענחים מהטוקן
    next(); // אם הכל תקין, ממשיכים לקונטרולר הבא
  } catch (error) {
    // console.log('Token verification failed:', error);
    return res.status(401).send('Invalid token');
  }
};

export default authenticate; 