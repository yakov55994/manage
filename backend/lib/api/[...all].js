// backend/api/[...all].js
import app from '../../server.js';
import connectDB from '../lib/db.js';

export default async function handler(req, res) {
  // ודא חיבור למסד לפני טיפול בבקשה
  await connectDB();

  // Express הוא request handler תואם (req,res)
  return app(req, res);
}
