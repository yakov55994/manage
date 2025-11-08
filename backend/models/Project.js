import mongoose from "mongoose";

const ALLOWED_DOC_TYPES = [
    "ח. עסקה",
    "ה. עבודה",
    "ד. תשלום, חשבונית מס / קבלה",
];

const invoiceSubSchema = new mongoose.Schema(
    {
        invoiceNumber: String,
        projectName: String,
        projectId: mongoose.Schema.Types.ObjectId,

        // זיהוי ספק + שם ספק
        supplierId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Supplier",
            required: false,          // חשוב: לא חובה
            default: undefined,       // אל תשמור "" כאן
        },
        invitingName: { type: String }, // אפשר שישאר ריק ""

        // סוג מסמך — מאפשרים גם "" כדי שהמשתמש ישלים
        documentType: {
            type: String,
            enum: [...ALLOWED_DOC_TYPES, ""],  // ✅ מאפשר גם ריק
            default: "",                       // ✅ ברירת מחדל ריקה
            required: false,
        },

        sum: Number,

        status: {
            type: String,
            enum: ["לא הוגש", "הוגש", "בעיבוד"],
            default: "לא הוגש",
        },

        // מצב תשלום: שומרים תאימות ל-paid וגם מאפשרים paymentStatus ריק
        paid: {
            type: String,
            enum: ["כן", "לא", ""],    // מאפשר גם ריק אם צריך
            default: "לא",
        },
        paymentStatus: {
            type: String,
            enum: ["שולם", "לא שולם", ""], // ✅ מאפשר גם ריק
            default: "",                    // ✅ אתה רצית שהמשתמש ישלים
        },

        detail: String,

        // נשאר String לתאימות
        paymentDate: String,

        file: String,
    },
    { _id: false }
);

const orderSubSchema = new mongoose.Schema(
    {
        orderNumber: String,
        invitingName: String,
        sum: Number,
        projectName: String,
        status: String,
        detail: String,
        paid: String,
        paymentDate: Date,
        createdAt: Date,
        file: String,
    },
    { _id: false }
);

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    budget: { type: Number },
    remainingBudget: { type: Number },
    invitingName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    Contact_person: { type: String, required: true },
    supplierName: { type: String, default: "" },

    paymentStatus: {
        type: String,
        enum: ["שולם", "לא שולם", ""],
        default: ""
    },

    missingDocument: {
        type: String,
        enum: ["כן", "לא", ""],
        default: ""
    },

    invoices: [invoiceSubSchema],
    orders: [orderSubSchema],

    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supplier",
        required: false,
        default: undefined,
    },
});

// remainingBudget auto-init
projectSchema.pre("save", function (next) {
    if (this.isNew) {
        this.remainingBudget =
            this.budget && !isNaN(this.budget) ? this.budget : 0;
    }
    next();
});

// delete cascading (ESM-safe)
projectSchema.pre(
    "deleteOne",
    { document: true, query: false },
    async function (next) {
        try {
            const { default: Invoice } = await import("./Invoice.js");
            const { default: Order } = await import("./Order.js");
            await Invoice.deleteMany({ projectId: this._id });
            await Order.deleteMany({ projectId: this._id });
            next();
        } catch (err) {
            next(err);
        }
    }
);

const Project = mongoose.model("Project", projectSchema);
export default Project;
