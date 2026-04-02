import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });
import mongoose from 'mongoose';

const uri = process.env.VITE_MONGODB_URI || process.env.MONGODB_URI;
if (!uri) {
  console.error('Mongo URI not found in .env');
  process.exit(1);
}

const rideSchema = new mongoose.Schema({}, { strict: false, collection: 'rides' });
const Ride = mongoose.model('Ride', rideSchema);

try {
  // Connect to the application's database (pooldesk) instead of default admin
  await mongoose.connect(uri, { dbName: 'pooldesk' });
  console.log('Connected to MongoDB');
  const rides = await Ride.find().sort({ _id: -1 }).limit(10).lean();
  console.log('Latest rides:');
  rides.forEach(r => {
    console.log(`- id: ${r._id} status: ${r.status} pickup: ${r.pickupLocation} dropoff: ${r.dropoffLocation} driver:${r.driverName || ''} passenger:${r.passengerName || ''}`);
  });
  await mongoose.disconnect();
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}
