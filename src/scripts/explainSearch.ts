import mongoose from 'mongoose';
import type { Db } from 'mongodb';
import { connectDB, disconnectDB, syncIndexes } from '../config/db';
import { escapeRegex } from '../utils/regex';
import { searchTerm } from '../utils/search';

/**
 * Prints the query planner's verdict for the paths the UI actually takes.
 *
 * The claim "search, filtering and pagination are index-backed" is worth nothing
 * without `explain()` output behind it, so this is what produces the numbers in
 * the README. Run `npm run indexes` after seeding.
 *
 * The three search rows together are the interesting part: an anchored pattern on
 * the normalized token array costs one index key per match, while the unanchored
 * and case-insensitive versions — the two ways this query is usually written —
 * both read the entire index.
 */

type Doc = Record<string, unknown>;

interface Verdict {
  stages: string[];
  indexes: string[];
  keys: number;
  docs: number;
  returned: number;
  millis: number;
}

/** `$or` fans out into parallel index scans under one root, so the tree is walked. */
function walk(plan: unknown, stages: string[], indexes: string[]): void {
  if (!plan || typeof plan !== 'object') return;
  const node = plan as Doc;

  if (typeof node.stage === 'string') stages.push(node.stage);
  if (typeof node.indexName === 'string') indexes.push(node.indexName);

  walk(node.inputStage, stages, indexes);
  walk(node.thenStage, stages, indexes);
  if (Array.isArray(node.inputStages)) node.inputStages.forEach((child) => walk(child, stages, indexes));
}

async function explain(
  db: Db,
  collection: string,
  filter: Doc,
  options: { sort?: Record<string, 1 | -1>; limit?: number } = {},
): Promise<Verdict> {
  let cursor = db.collection(collection).find(filter);
  if (options.sort) cursor = cursor.sort(options.sort);
  if (options.limit) cursor = cursor.limit(options.limit);

  const raw = (await cursor.explain('executionStats')) as unknown as Doc;
  // `queryPlanner` and `executionStats` are siblings — the plan is not nested
  // under `explain` in the MongoDB 8 output format.
  const stages: string[] = [];
  const indexes: string[] = [];
  walk((raw.queryPlanner as Doc | undefined)?.winningPlan, stages, indexes);

  const stats = (raw.executionStats ?? {}) as Doc;
  return {
    stages,
    indexes,
    keys: Number(stats.totalKeysExamined ?? 0),
    docs: Number(stats.totalDocsExamined ?? 0),
    returned: Number(stats.nReturned ?? 0),
    millis: Number(stats.executionTimeMillis ?? 0),
  };
}

function report(label: string, verdict: Verdict): void {
  const scanned = verdict.stages.includes('COLLSCAN');
  const wholeIndex = verdict.stages.includes('IXSCAN') && verdict.keys > verdict.returned * 4;
  const verdict$ = scanned ? 'COLLSCAN  ' : wholeIndex ? 'IXSCAN*   ' : 'IXSCAN    ';
  const used = verdict.indexes.length > 0 ? [...new Set(verdict.indexes)].join(', ') : 'none';

  console.log(
    `${verdict$} ${label}\n` +
      `             index: ${used}\n` +
      `             keys=${verdict.keys} docs=${verdict.docs} returned=${verdict.returned} ${verdict.millis}ms\n`,
  );
}

async function main(): Promise<void> {
  await connectDB();
  await syncIndexes();

  const db = mongoose.connection.db;
  if (!db) throw new Error('No active MongoDB connection');

  const sample = await db.collection('doctors').findOne({}, { projection: { name: 1 } });
  const tokens = sample && typeof sample.name === 'string' ? sample.name.toLowerCase().split(/\W+/) : [];
  // A surname is what an admin actually types, and it is never a prefix of
  // "Dr. Farhana Yeasmin Hossain" — which is the whole reason for `searchTerms`.
  const term = searchTerm(tokens.at(-1) ?? 'dr') ?? 'dr';

  console.log(`\nSearch term: "${term}"\n`);

  report(
    'doctor search — anchored prefix on normalized tokens',
    await explain(db, 'doctors', { searchTerms: { $regex: `^${escapeRegex(term)}` } }, { limit: 10 }),
  );

  report(
    'doctor search — same term unanchored (the usual first attempt)',
    await explain(db, 'doctors', { searchTerms: { $regex: escapeRegex(term) } }, { limit: 10 }),
  );

  report(
    'doctor search — anchored with the i flag on `name`',
    await explain(db, 'doctors', { name: { $regex: `^${escapeRegex(term)}`, $options: 'i' } }, { limit: 10 }),
  );

  const doctorRow = await db.collection('patients').findOne({}, { projection: { doctorId: 1 } });

  report(
    'doctor list — specialization filter + default sort + page 1',
    await explain(
      db,
      'doctors',
      { specialization: 'Medicine' },
      { sort: { createdAt: -1, _id: -1 }, limit: 10 },
    ),
  );

  if (doctorRow?.doctorId) {
    report(
      "patient list — one doctor, newest visit first",
      await explain(
        db,
        'patients',
        { doctorId: doctorRow.doctorId },
        { sort: { visitDate: -1, _id: -1 }, limit: 10 },
      ),
    );
  }

  const monthStart = (offset: number) => {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() - offset, 1);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  };

  report(
    'patient list — date-wise range on visitDate',
    await explain(db, 'patients', { visitDate: { $gte: monthStart(4), $lt: monthStart(0) } }, { limit: 10 }),
  );

  await disconnectDB();
}

main()
  .then(() => process.exit(0))
  .catch(async (error: unknown) => {
    console.error('Explain failed:', error instanceof Error ? error.message : error);
    await disconnectDB().catch(() => undefined);
    process.exit(1);
  });
