import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Invoice from '../models/Invoice.js';
import Salary from '../models/Salary.js';

const mongoURI = "mongodb+srv://yakov1020:Yakov7470893@management-app.qrrmy.mongodb.net/?retryWrites=true&w=majority&appName=Management-App";

async function debug() {
  try {
    await mongoose.connect(mongoURI);

    const project = await Project.findOne({ name: 'בדיקה יעקב 02' });
    const projectId = project._id;

    console.log('1️⃣ Regular invoices (non-salary):');
    const regularInvoices = await Invoice.find({
      'projects.projectId': projectId,
      type: { $ne: 'salary' },
      fundedFromProjectId: { $exists: false },
    });
    console.log('  Found:', regularInvoices.length);

    let regularTotal = 0;
    for (const inv of regularInvoices) {
      console.log(`  Invoice #${inv.invoiceNumber}:`);
      const projectPart = inv.projects.find(
        (p) => String(p.projectId) === String(projectId)
      );
      if (projectPart) {
        console.log(`    Sum for this project: ₪${projectPart.sum}`);
        regularTotal += Number(projectPart.sum || 0);
      } else {
        console.log('    Project not found in invoice!');
      }
    }
    console.log('  Total regular: ₪' + regularTotal);

    console.log('\n2️⃣ Milga invoices funded by this project:');
    const milgaInvoices = await Invoice.find({
      fundedFromProjectId: projectId,
    });
    console.log('  Found:', milgaInvoices.length);

    console.log('\n3️⃣ Salary invoices funded by this project:');
    const salaryInvoices = await Invoice.find({
      type: 'salary',
      fundedFromProjectId: projectId,
    });
    console.log('  Found:', salaryInvoices.length);

    console.log('\n4️⃣ Old Salary model:');
    const salaries = await Salary.find({ projectId });
    console.log('  Found:', salaries.length);

    const totalSpent = regularTotal;
    console.log('\n💰 Calculation:');
    console.log('  Budget:', project.budget);
    console.log('  Total Spent:', totalSpent);
    console.log('  Should be:', project.budget - totalSpent);
    console.log('  Actually is:', project.remainingBudget);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debug();
