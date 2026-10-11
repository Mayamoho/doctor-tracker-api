import { connectDB, disconnectDB } from '../config/db';
import { env } from '../config/env';
import { User, hashPassword } from '../models/User';

/**
 * Rotate the admin credential in place, without the destructive full reseed that
 * `seed.ts` performs. `tokenVersion` is bumped so every already-issued refresh
 * token stops validating, which is the point of a rotation.
 */
async function main(): Promise<void> {
  await connectDB();

  const updated = await User.findOneAndUpdate(
    { email: env.ADMIN_EMAIL.toLowerCase() },
    { $set: { passwordHash: await hashPassword(env.ADMIN_PASSWORD) }, $inc: { tokenVersion: 1 } },
    { returnDocument: 'after' },
  );

  if (!updated) {
    throw new Error(`No user with ${env.ADMIN_EMAIL} — run npm run seed first.`);
  }

  console.log(`Rotated password for ${updated.email} (tokenVersion now ${updated.tokenVersion}).`);
  await disconnectDB();
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  await disconnectDB().catch(() => undefined);
  process.exitCode = 1;
});
