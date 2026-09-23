import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './src/services/db.service';
import { Investigation } from './src/models/Investigation';
import fs from 'fs';

async function run() {
  try {
    await connectDB();
    const docs = await Investigation.find({}).lean();
    fs.writeFileSync('output.json', JSON.stringify(docs, null, 2));
    console.log('Success, wrote to output.json');
  } catch (err) {
    console.error('Error in script:', err);
    fs.writeFileSync('output.json', JSON.stringify({error: String(err)}));
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}
run();
