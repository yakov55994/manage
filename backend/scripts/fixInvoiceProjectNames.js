import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Invoice from '../models/Invoice.js';
import Project from '../models/Project.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// טען את .env מהתיקייה הראשית של backend
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function fixInvoiceProjectNames() {
  try {
    // התחברות למסד הנתונים
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // מציאת כל החשבוניות
    const invoices = await Invoice.find({ type: { $ne: 'salary' } });
    console.log(`📊 Found ${invoices.length} invoices to check`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const invoice of invoices) {
      try {
        let needsUpdate = false;
        const updatedProjects = [];

        for (const proj of invoice.projects) {
          const projectId = proj.projectId?._id || proj.projectId;

          // מצא את הפרויקט האמיתי
          const project = await Project.findById(projectId).select('name');

          if (!project) {
            console.log(`⚠️  Project not found for invoice ${invoice.invoiceNumber}: ${projectId}`);
            updatedProjects.push(proj);
            continue;
          }

          // בדוק אם צריך לעדכן
          if (proj.projectName !== project.name) {
            console.log(`🔄 Updating invoice ${invoice.invoiceNumber}: "${proj.projectName}" → "${project.name}"`);
            needsUpdate = true;
          }

          updatedProjects.push({
            projectId: projectId,
            projectName: project.name,
            sum: proj.sum
          });
        }

        // עדכן את החשבונית אם צריך
        if (needsUpdate) {
          await Invoice.findByIdAndUpdate(invoice._id, {
            projects: updatedProjects
          });
          updatedCount++;
        }
      } catch (err) {
        console.error(`❌ Error updating invoice ${invoice.invoiceNumber}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Migration completed!`);
    console.log(`📊 Total invoices: ${invoices.length}`);
    console.log(`✏️  Updated: ${updatedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// הרצת הסקריפט
fixInvoiceProjectNames();
