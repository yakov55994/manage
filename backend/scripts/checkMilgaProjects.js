import mongoose from 'mongoose';
import Project from '../models/Project.js';

const mongoURI = "mongodb+srv://yakov1020:Yakov7470893@management-app.qrrmy.mongodb.net/?retryWrites=true&w=majority&appName=Management-App";

async function checkProjects() {
  try {
    await mongoose.connect(mongoURI);

    const all = await Project.find({}).select('name isMilga type');
    const milga = all.filter(p => p.isMilga || p.type === 'milga');
    const regular = all.filter(p => !p.isMilga && p.type !== 'milga');

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkProjects();
