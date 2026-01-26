import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { initializeSocket } from './config/socket.js';

// Routers
import authRoutes from './routes/Auth.js';
import usersRoutes from './routes/UserRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import salaryRoutes from './routes/salaryRoutes.js';
import invoiceRoutes from './routes/InvoiceRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import notesRoutes from './routes/NotesRoutes.js';
import uploadRoute from './routes/uploadRoute.js';
import suppliersRoutes from './routes/supplierRoutes.js';
import documentsRoutes from './routes/documentRoutes.js';
import masavRoutes from './routes/masavRoutes.js';
import incomeRoutes from './routes/incomeRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();
const app = express();
const httpServer = createServer(app);

// ✅ CORS - עודכן
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://manage-46b.pages.dev',
  'https://manage-2dkj.onrender.com',
  'https://management-zcer.onrender.com',
  'https://management-server-owna.onrender.com'
];

// const corsOptions = {
//   origin(origin, callback) {
//     // אפשר בקשות ללא origin (Postman, server-to-server)
//     if (!origin) return callback(null, true);

//     if (allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     } else {
//       // console.log("❌ BLOCKED ORIGIN:", origin);
//       return callback(new Error("Not allowed by CORS"));
//     }
//   },
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//   allowedHeaders: [
//     "Origin",
//     "X-Requested-With",
//     "Content-Type",
//     "Accept",
//     "Authorization",
//     "Cache-Control",
//   ],
// };

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // ❗ לא זורקים שגיאה
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
};


app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

initializeSocket(io);

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth
app.use('/api/auth', authRoutes);

// Projects
app.use('/api/projects', projectRoutes);

// Salaries
app.use("/api/salaries", salaryRoutes);

// Invoices
app.use('/api/invoices', invoiceRoutes);

// Orders
app.use('/api/orders', orderRoutes);

// Suppliers
app.use('/api/suppliers', suppliersRoutes);

// Users
app.use('/api/users', usersRoutes);

// Notes + Uploads
app.use('/api/notes', notesRoutes);
app.use('/api/upload', uploadRoute);

app.use('/api/documents', documentsRoutes);

app.use('/api/masav', masavRoutes);

// Incomes
app.use('/api/incomes', incomeRoutes);

// Expenses
app.use('/api/expenses', expenseRoutes);

// Submission routes
app.use('/api/submissions', submissionRoutes);

// Analytics routes
app.use('/api/analytics', analyticsRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Start DB + Server
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB...');
    const port = process.env.PORT || 3000;
    httpServer.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`🔌 Socket.IO ready for connections`);
    });
  } catch (err) {
    console.error('❌ Error connecting to MongoDB', err);
  }
};

connectDB();

export { io };
export default app;