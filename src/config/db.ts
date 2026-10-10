import mongoose from 'mongoose';
import { env } from './env';

/**
 * Indexes are built explicitly rather than via Mongoose's `autoIndex`, so startup
 * cost is deterministic and a missing index is visible in the logs instead of
 * silently degrading a query to a collection scan.
 *
 * It is a separate call from `connectDB` because the seed must be able to wipe and
 * rewrite the collections *before* the unique indexes exist — building a unique
 * index over documents that predate a newly required field fails on null collisions.
 */
export async function syncIndexes(): Promise<void> {
  const started = Date.now();
  await Promise.all(
    Object.values(mongoose.models).map(async (model) => {
      await model.syncIndexes();
    }),
  );
  console.log(`Indexes synchronised in ${Date.now() - started}ms`);
}

export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.MONGO_URI, {
    autoIndex: false,
    serverSelectionTimeoutMS: 20000,
    maxPoolSize: 10,
  });

  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected → ${host}/${name}`);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
