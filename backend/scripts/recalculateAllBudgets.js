import mongoose from 'mongoose';
import Project from '../models/Project.js';
import { recalculateRemainingBudget } from '../services/invoiceService.js';

const mongoURI = "mongodb+srv://yakov1020:Yakov7470893@management-app.qrrmy.mongodb.net/?retryWrites=true&w=majority&appName=Management-App";

async function recalculateAll() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoURI);
    console.log("✅ Connected!");

    console.log("📊 Fetching all projects...");
    const projects = await Project.find({});
    console.log(`Found ${projects.length} projects`);

    console.log("\n🔄 Recalculating budgets...");
    for (const project of projects) {
      console.log(`\n📌 Project: ${project.name}`);
      console.log(`   Budget: ₪${project.budget}`);
      console.log(`   Before: ₪${project.remainingBudget}`);

      await recalculateRemainingBudget(project._id);

      const updated = await Project.findById(project._id);
      console.log(`   After:  ₪${updated.remainingBudget}`);
    }

    console.log("\n✅ Done! All budgets recalculated.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

recalculateAll();
