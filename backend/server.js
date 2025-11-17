import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

// Routers
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

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://manage-46b.pages.dev',
  'https://manage-2dkj.onrender.com'
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true); // Postman, Server-to-server

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);          // מותר
    } else {
      console.log("❌ BLOCKED ORIGIN:", origin);
      return callback(new Error("Not allowed by CORS")); // לא מותר
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
  ],
};


app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth
app.use('/api/auth', authRoutes);

// Projects
app.use('/api/projects', projectRoutes);

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
