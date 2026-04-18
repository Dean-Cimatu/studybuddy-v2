import mongoose from 'mongoose';

export async function connect(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined');
  }

  mongoose.connection.on('connected', () => console.log('MongoDB connected'));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err));

  await mongoose.connect(uri);
}
