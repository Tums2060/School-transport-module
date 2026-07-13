import mongoose from 'mongoose';

let mongod = null;

export async function connectDB() {
  const connUri = process.env.MONGODB_URI;

  if (connUri) {
    try {
      await mongoose.connect(connUri);
      console.log(`MongoDB Connected successfully to: ${connUri}`);
      return;
    } catch (error) {
      console.error('Error connecting to provided MONGODB_URI:', error.message);
      process.exit(1);
    }
  }

  // Fallback to local MongoDB instance first
  try {
    const localUri = 'mongodb://127.0.0.1:27017/school_transport';
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`MongoDB Connected successfully to local instance: ${localUri}`);
  } catch (error) {
    console.log('Local MongoDB instance not running. Falling back to in-memory MongoDB server...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log(`In-Memory MongoDB Connected successfully to: ${uri}`);
    } catch (memError) {
      console.error('Failed to start in-memory MongoDB server:', memError.message);
      process.exit(1);
    }
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}
