import mongoose from 'mongoose';
import Project from './models/Project.js';
import Invoice from './models/Invoice.js';

async function fixExistingProjects() {
  try {
    await mongoose.connect('mongodb+srv://yakov1020:Yakov7470893@management-app.qrrmy.mongodb.net/?retryWrites=true&w=majority&appName=Management-App');
    
    const projects = await Project.find({});
    
    for (const project of projects) {
      // בדיקה אם אין תקציב - דלג או תקן
      if (!project.budget && project.budget !== 0) {
        console.log(`⚠️  פרויקט "${project.name}" ללא תקציב - מגדיר ל-0`);
        project.budget = 0;
      }

      // חישוב כמה כבר הוצא
      const invoices = await Invoice.find({ projectId: project._id });
      const totalSpent = invoices.reduce((sum, inv) => sum + (inv.sum || 0), 0);
      
      // עדכון התקציב הנותר
      const newRemainingBudget = project.budget - totalSpent;
      
      // בדיקה שהתוצאה תקינה
      if (isNaN(newRemainingBudget)) {
        console.log(`❌ שגיאה בחישוב עבור פרויקט "${project.name}"`);
        console.log(`   budget: ${project.budget}, totalSpent: ${totalSpent}`);
        continue; // דלג על הפרויקט הזה
      }
      
      project.remainingBudget = newRemainingBudget;
      await project.save();
      
      console.log(`✅ תוקן פרויקט: ${project.name}`);
      console.log(`   תקציב: ${project.budget} ₪`);
      console.log(`   הוצא: ${totalSpent} ₪`);
      console.log(`   נותר: ${project.remainingBudget} ₪\n`);
    }
    
    console.log('🎉 סיום תיקון כל הפרויקטים');
    process.exit(0);
  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  }
}

fixExistingProjects();