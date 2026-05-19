import mongoose from 'mongoose';
import { config } from './config.js';

export async function connectDb(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongoUri, {
    autoIndex: true,
  });
  // eslint-disable-next-line no-console
  console.log(`[db] connected to ${redact(config.mongoUri)}`);
}

function redact(uri: string): string {
  return uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
}
