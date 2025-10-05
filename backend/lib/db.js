// backend/lib/db.js
import mongoose from 'mongoose';

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  throw new Error('❌ Missing MONGO_URL env variable');
}

// שימוש ב-global כדי למחזר חיבור בין זימונים ב-Vercel
let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

export default async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URL, {
      // אפשר כאן פרמטרים אם צריך
    }).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
