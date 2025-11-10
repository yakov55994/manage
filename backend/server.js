import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { protect } from './middleware/auth.js';
import authRoutes from './routes/Auth.js';
import usersRoutes from './routes/UserRoutes.js';

import projectRoutes from './routes/projectRoutes.js';
import invoiceRoutes from './routes/InvoiceRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import notesRoutes from './routes/NotesRoutes.js';
import uploadRoute from './routes/uploadRoute.js';
import suppliersRoutes from './routes/supplierRoutes.js';

dotenv.config();
const app = express();

// ✅ רשימת הדומיינים המותרים
const allowedOrigins = [
  'http://localhost:5173',
  'https://management-server-owna.onrender.com',
  'https://manage-2dkj.onrender.com',
  'https://manage-46b.pages.dev'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const isAllowed = allowedOrigins.includes(origin);

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 200
};

// ✅ 1. CORS - ראשון!
// app.use(cors(corsOptions));

app.use(cors({
  origin: true,
  credentials: true
}));
app.options('*', cors());

// טיפול מפורש בבקשות OPTIONS
app.options('*', cors(corsOptions), (req, res) => {
  console.log('📡 OPTIONS request received for:', req.headers.origin);
  res.sendStatus(200);
});

// ✅ 2. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 3. Debug middleware (אופציונלי - להסיר בproduction)
app.use((req, res, next) => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📥 ${req.method} ${req.url}`);
  console.log('Body:', req.body);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  next();
});

// ✅ 4. Auth routes - ללא הגנה! (login צריך להיות פתוח)
app.use('/api/auth', authRoutes);

// ✅ 6. Protected routes - עם authenticate middleware
// ❌ לא app.use(authenticate) על הכל! רק על routes ספציפיים:
app.use('/api/users', protect, usersRoutes);
app.use('/api/projects', protect, projectRoutes);
app.use('/api/invoices', protect, invoiceRoutes);
app.use('/api/orders', protect, orderRoutes);
app.use('/api/notes', protect, notesRoutes);
app.use('/api/upload', protect, uploadRoute);
app.use('/api/suppliers', protect, suppliersRoutes);

// ✅ 7. טיפול בשגיאות כללי
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// ✅ 8. חיבור ל־MongoDB והרצת השרת
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connected to MongoDB...");

    const port = process.env.PORT || 3000; // ✅ שונה ל-5000!
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`🌐 API available at: http://localhost:${port}/api`);
    });
  } catch (err) {
    console.error("❌ Error connecting to MongoDB", err);
  }
};

connectDB();

export default app;