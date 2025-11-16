import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

// ❌ הסר את jwt אם לא משתמשים פה
// import jwt from 'jsonwebtoken';

// ראוטרים
import authRoutes from './routes/Auth.js';
import usersRoutes from './routes/UserRoutes.js';          // ודא שהתוואי/שם זהים לקובץ בפועל
import projectRoutes from './routes/projectRoutes.js';     // שמות לפי מה שהגדרנו למעלה
import invoiceRoutes from './routes/InvoiceRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import notesRoutes from './routes/NotesRoutes.js';
import uploadRoute from './routes/uploadRoute.js';
import suppliersRoutes from './routes/supplierRoutes.js';

// אם ה-routers כבר עושים protect – אין צורך לייבא פה:
// import { protect } from './middleware/auth.js';

dotenv.config();
const app = express();

// ✅ CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://manage-46b.pages.dev',
  'https://manage-2dkj.onrender.com'
];

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // Postman/SSR
    return cb(allowedOrigins.includes(origin) ? null : new Error('Not allowed by CORS'), true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization',
    'Cache-Control' // ← כדי למנוע שגיאת preflight על cache-control
  ],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions), (req, res) => res.sendStatus(200));

// ✅ Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Auth (פתוח)
app.use('/api/auth', authRoutes);

// ✅ Routers עם הגנות בפנים (protect/withScope/requireOp נעשים בתוך הקבצים עצמם)
app.use('/api/projects', projectRoutes);

app.use('/api/projects/:projectId/invoices', invoiceRoutes);
app.use('/api/projects/:projectId/orders', orderRoutes);
app.use('/api/suppliers/', suppliersRoutes);

// 🧑‍💼 ניהול משתמשים — בקובץ ה־router כבר יש protect+requireAdmin (כמו שהכנת)
app.use('/api/users', usersRoutes);

// ראוטרים נוספים (אם אין להם הגנות פנימיות – עטוף אותם שם, לא כאן)
app.use('/api/notes', notesRoutes);
app.use('/api/upload', uploadRoute);

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// ✅ DB + Server
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB...');
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`🌐 API at http://localhost:${port}/api`);
    });
  } catch (err) {
    console.error('❌ Error connecting to MongoDB', err);
  }
};

connectDB();

export default app;
