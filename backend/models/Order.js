import mongoose from "mongoose";
import cloudinary from '../config/cloudinary.js';

const orderSchema = new mongoose.Schema({
  orderNumber: { type: Number, required: true },     // ייחודי בפרויקט
  projectName: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },

  sum: { type: Number, required: true },

  createdAt: { type: Date, required: true },

 status: {
    type: String,
    enum: ["הוגש", "לא הוגש", "בעיבוד", "הוגש חלקי"], // ✅ הוסף
    required: true
  },

   // ✅ הוסף שדות הגשה חדשים
  submittedAmount: { type: Number, default: 0 },
  submittedDate: { type: Date, default: null },

  invitingName: { type: String, required: true }, // מי ביצע את ההזמנה
  detail: { type: String, required: false },

  remainingBudget: { type: Number },

  Contact_person: { type: String, required: false },

  files: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
    folder: { type: String, required: false },
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
    publicId: { type: String },
    resourceType: { type: String }
  }],
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: false
  },
  // ✅ הוספה חדשה
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdByName: {
    type: String,
    required: false
  }

});

orderSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  
  try {
    if (this.files && this.files.length > 0) {
      for (const file of this.files) {
        // ✅ חלץ publicId מה-URL אם לא קיים
        let publicId = file.publicId;
        
        if (!publicId && file.url) {
          publicId = extractPublicIdFromUrl(file.url);
        }
        
        
        if (publicId) {
          const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: file.resourceType || 'raw'
          });
        } else {
          console.log('⚠️ לא נמצא publicId עבור:', file.name);
        }
      }
    }
    next();
  } catch (err) {
    console.error('❌ שגיאה:', err);
    next(err);
  }
});

// פונקציה עזר לחילוץ publicId מ-URL של Cloudinary
function extractPublicIdFromUrl(url) {
  try {
    // URL לדוגמה: https://res.cloudinary.com/dbbivwbbt/raw/upload/v1764535273/invoices/vvzkducxoyn32oyulyq7.pdf
    
    // ✅ גרסה מתוקנת - כוללת את הסיומת
    const regex = /\/upload\/(?:v\d+\/)?(.+)$/;
    const match = url.match(regex);
    return match ? match[1] : null; // יחזיר: "invoices/vvzkducxoyn32oyulyq7.pdf"
  } catch (err) {
    console.error('שגיאה בחילוץ publicId:', err);
    return null;
  }
}
// 💡 אין צורך ב-pre-save כפילות כי אנחנו עושים זאת ב-service — הרבה יותר נכון!

const Order = mongoose.model("Order", orderSchema);
export default Order;
