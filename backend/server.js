import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import authenticate from './Auth/authMiddleware.js';

import projectRoutes from './routes/projectRoutes.js';
import invoiceRoutes from './routes/InvoiceRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import notesRoutes from './routes/NotesRoutes.js';
import uploadRoute from './routes/uploadRoute.js';
import suppliersRoutes from './routes/supplierRoutes.js';

dotenv.config();
const app = express();

// ✅ רשימת הדומיינים המותרים
// החלף את החלק הזה בקוד שלך:

const allowedOrigins = [
  'http://localhost:5173',
  'https://management-server-owna.onrender.com',
  'https://manage-app.pages.dev'  // ← וודא שזה בדיוק ככה!
];

const corsOptions = {
  origin: function (origin, callback) {
    // console.log('🔎 Origin received:', origin);
    // console.log('📋 Allowed origins:', allowedOrigins); // הוסף את זה!
    
    // אפשר בקשות ללא origin
    if (!origin) {
      // console.log('✅ No origin - allowing');
      return callback(null, true);
    }
    
    // בדיקה מדויקת
    const isAllowed = allowedOrigins.includes(origin);
    // console.log('🔍 Is allowed:', isAllowed); // הוסף את זה!
    
    if (isAllowed) {
      // console.log('✅ Origin allowed:', origin);
      callback(null, true);
    } else {
      // console.log('❌ Blocked Origin:', origin);
      // console.log('📋 Available origins:', allowedOrigins); // עוד לוג
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 200
};
// ✅ Middleware חשובים לפי סדר
app.use(cors(corsOptions));

// טיפול מפורש בבקשות OPTIONS
app.options('*', cors(corsOptions), (req, res) => {
  console.log('📡 OPTIONS request received for:', req.headers.origin);
  res.sendStatus(200);
});

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ אימות משתמש
app.post('/api/authenticate', (req, res) => {
  // console.log('🔐 Authentication attempt with body:', req.body); // לוג לאבחון
  const { code } = req.body;

  if (code === process.env.SECRET_CODE) {
    const token = jwt.sign({ authenticated: true }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' ? true : false, // גמישות לסביבת פיתוח
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', // גמישות לסביבת פיתוח
      maxAge: 12 * 60 * 60 * 1000,
      path: '/'
    });
    // console.log('✅ Authentication successful, token set');
    return res.json({ message: 'Authenticated', token });
  } else {
    // console.log('❌ Authentication failed: Invalid code');
    return res.status(401).send('סיסמה שגויה, אנא נסה שנית');
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' ? true : false,
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    path: '/'
  });
  // console.log('✅ Logged out successfully');
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth-status', authenticate, (req, res) => {
  // console.log('🔍 Auth status checked for user:', req.user); // לוג לאבחון
  res.json({ authenticated: true, user: req.user });
});

// ✅ שמירה על הגנת ראוטים
app.use(authenticate);

// ✅ ראוטים אחרים
app.use("/api/projects", projectRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/orders", orderRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/upload', uploadRoute);
app.use('/api/suppliers', suppliersRoutes);

// ✅ טיפול בשגיאות כללי
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack); // לוג שגיאות מפורט
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// ✅ חיבור ל־MongoDB והרצת השרת
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connected to MongoDB...");

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (err) {
    console.error("❌ Error connecting to MongoDB", err);
  }
};

connectDB();

export default app;