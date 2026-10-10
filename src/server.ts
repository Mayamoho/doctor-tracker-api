import { app } from './app';
import { connectDB, disconnectDB, syncIndexes } from './config/db';
import { env } from './config/env';

/**
 * Mongoose embeds the full connection string — credentials included — in its
 * connection errors. Strip it before anything reaches the log.
 */
function sanitize(message: string): string {
  return message.replace(/\/\/[^@\s/]*@/g, '//***:***@');
}

async function main(): Promise<void> {
  await connectDB();
  await syncIndexes();

  const server = app.listen(env.PORT, () => {
    console.log(`Doctor Tracker API → http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`);
  });

  const shutdown = (signal: NodeJS.Signals): void => {
    console.log(`${signal} received, closing connections`);

    server.close(() => {
      void disconnectDB().finally(() => process.exit(0));
    });

    // Render kills the container shortly after SIGTERM; do not hang waiting for
    // a keep-alive connection that will never drain.
    setTimeout(() => {
      console.error('Forced exit after shutdown timeout');
      process.exit(1);
    }, 8000).unref();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason instanceof Error ? sanitize(reason.message) : reason);
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to start: ${sanitize(message)}`);
  process.exit(1);
});
