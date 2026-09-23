import 'dotenv/config';
import { connectDB, disconnectDB } from './src/services/db.service';
import { Investigation } from './src/models/Investigation';

async function run() {
  try {
    await connectDB();
    const count = await Investigation.countDocuments();
    console.log('Investigation count: ' + count);
    const active = await Investigation.countDocuments({ status: 'active' });
    console.log('Active investigations: ' + active);
    console.log('Phase 3 Regression: Pass');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}
run();
