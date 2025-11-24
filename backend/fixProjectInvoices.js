import mongoose from "mongoose";
import User from "./models/User.js";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
  try {
    console.log("🚀 Connecting to DB...");
    await mongoose.connect("mongodb+srv://yakov1020:Yakov7470893@management-app.qrrmy.mongodb.net/?retryWrites=true&w=majority&appName=Management-App");

    console.log("🔄 Updating permissions...");

    const users = await User.find();

    for (const user of users) {
      let changed = false;

      for (const perm of user.permissions) {
        if (!perm.modules) continue;

        // שינוי השמות
        if (perm.modules.invoices !== undefined) {
          perm.modules.invoice = perm.modules.invoices;
          delete perm.modules.invoices;
          changed = true;
        }

        if (perm.modules.orders !== undefined) {
          perm.modules.order = perm.modules.orders;
          delete perm.modules.orders;
          changed = true;
        }

        if (perm.modules.suppliers !== undefined) {
          perm.modules.supplier = perm.modules.suppliers;
          delete perm.modules.suppliers;
          changed = true;
        }

        if (perm.modules.files !== undefined) {
          perm.modules.file = perm.modules.files;
          delete perm.modules.files;
          changed = true;
        }
      }

      if (changed) {
        await user.save();
        console.log(`✔ Updated user: ${user.username}`);
      }
    }

    console.log("🎉 Done! All permissions updated.");
    process.exit(0);

  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

run();
