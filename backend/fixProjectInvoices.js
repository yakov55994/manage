import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Project from "./models/Project.js";
import Invoice from "./models/Invoice.js";

mongoose.set("strictQuery", false);

const run = async () => {
  console.log("🔧 Connecting to DB…");
  await mongoose.connect("mongodb+srv://yakov1020:Yakov7470893@management-app.qrrmy.mongodb.net/?retryWrites=true&w=majority&appName=Management-App");

  const invoices = await Invoice.find({});
  const projects = await Project.find({});

  let fixed = 0;

  for (const inv of invoices) {
    // אם כבר יש projectId – לדלג
    if (inv.projectId) continue;

    const invName = (inv.projectName || "").trim();

    if (!invName) continue;

    // 1️⃣ התאמה מלאה
    let project = projects.find(
      (p) => p.name.trim() === invName
    );

    // 2️⃣ התאמה חלקית
    if (!project) {
      project = projects.find(
        (p) =>
          invName.includes(p.name.trim()) ||
          p.name.trim().includes(invName)
      );
    }

    if (!project) {
      console.log("⚠️ לא נמצא פרויקט ל:", inv._id, invName);
      continue;
    }

    // עדכון החשבונית
    inv.projectId = project._id;
    await inv.save();

    // הוספה לפרויקט
    if (!project.invoices.includes(inv._id)) {
      project.invoices.push(inv._id);
      await project.save();
    }

    console.log(`✔ fixed invoice ${inv._id} → project ${project._id}`);
    fixed++;
  }

  console.log(`🎉 DONE! Fixed ${fixed} invoices`);
  process.exit();
};

run();
