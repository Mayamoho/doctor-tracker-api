import mongoose from 'mongoose';
import type { Db } from 'mongodb';
import { connectDB, disconnectDB, syncIndexes } from '../config/db';
// `syncIndexes` walks `mongoose.models`, so the schemas have to be registered
// before it is called — without these the script silently reports on whatever the
// last seed left behind instead of the index set defined in the models.
import '../models/Doctor';
import '../models/Patient';
import '../models/User';
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

/** First object under `key` anywhere in the tree — plan shapes differ per verb. */
function deepFind(node: unknown, key: string): Doc | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = deepFind(child, key);
      if (hit) return hit;
    }
    return undefined;
  }
  const direct = (node as Doc)[key];
  if (direct && typeof direct === 'object') return direct as Doc;
  for (const child of Object.values(node as Doc)) {
    const hit = deepFind(child, key);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Collects every `stage` / `indexName` in the plan tree.
 *
 * Deliberately shape-agnostic: `$or` fans out into parallel scans under one root,
 * and an aggregation plan nests the cursor plan one level deeper than a `find()`
 * plan does. Walking everything is shorter than tracking both layouts.
 */
function collect(node: unknown, stages: string[], indexes: string[]): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((child) => collect(child, stages, indexes));
    return;
  }
  const doc = node as Doc;
  if (typeof doc.stage === 'string') stages.push(doc.stage);
  if (typeof doc.indexName === 'string') indexes.push(doc.indexName);
  Object.values(doc).forEach((child) => collect(child, stages, indexes));
}

function toVerdict(raw: unknown): Verdict {
  const stages: string[] = [];
  const indexes: string[] = [];
  collect(deepFind(raw, 'winningPlan') ?? raw, stages, indexes);

  const stats = deepFind(raw, 'executionStats') ?? {};
  return {
    stages,
    indexes,
    keys: Number(stats.totalKeysExamined ?? 0),
    docs: Number(stats.totalDocsExamined ?? 0),
    returned: Number(stats.nReturned ?? 0),
    millis: Number(stats.executionTimeMillis ?? 0),
  };
}

async function explainFind(
  db: Db,
  collection: string,
  filter: Doc,
  options: { sort?: Record<string, 1 | -1>; limit?: number } = {},
): Promise<Verdict> {
  let cursor = db.collection(collection).find(filter);
  if (options.sort) cursor = cursor.sort(options.sort);
  if (options.limit) cursor = cursor.limit(options.limit);
  // `queryPlanner` and `executionStats` are siblings — the plan is not nested
  // under `explain` in the MongoDB 8 output format.
  return toVerdict(await cursor.explain('executionStats'));
}

/** The patient list is an aggregation, so it has to be explained as one. */
async function explainPipeline(db: Db, collection: string, pipeline: Doc[]): Promise<Verdict> {
  return toVerdict(await db.collection(collection).aggregate(pipeline).explain('executionStats'));
}

function report(label: string, verdict: Verdict): void {
  const scanned = verdict.stages.includes('COLLSCAN');
  const wholeIndex = verdict.stages.includes('IXSCAN') && verdict.keys > verdict.returned * 4;
  const plan = scanned ? 'COLLSCAN  ' : wholeIndex ? 'IXSCAN*   ' : 'IXSCAN    ';
  const used = verdict.indexes.length > 0 ? [...new Set(verdict.indexes)].join(', ') : 'none';
  const sorted = verdict.stages.includes('SORT') ? ' + blocking sort' : '';

  console.log(
    `${plan} ${label}${sorted}\n` +
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

  // Values are read from the seeded data rather than hardcoded, so a filter row
  // can never quietly turn into "matches nothing" after the directory changes.
  const specialization = (await db.collection('doctors').findOne({}, { projection: { specialization: 1 } }))
    ?.specialization as string | undefined;
  const gender = (await db.collection('patients').findOne({}, { projection: { gender: 1 } }))?.gender as
    | string
    | undefined;
  const patientRow = await db.collection('patients').findOne({}, { projection: { doctorId: 1 } });

  console.log(`\nSearch term: "${term}"\n`);

  report(
    'doctor search — anchored prefix on normalized tokens',
    await explainFind(db, 'doctors', { searchTerms: { $regex: `^${escapeRegex(term)}` } }, { limit: 10 }),
  );

  report(
    'doctor search — same term unanchored (the usual first attempt)',
    await explainFind(db, 'doctors', { searchTerms: { $regex: escapeRegex(term) } }, { limit: 10 }),
  );

  report(
    'doctor search — anchored with the i flag on `name`',
    await explainFind(db, 'doctors', { name: { $regex: `^${escapeRegex(term)}`, $options: 'i' } }, { limit: 10 }),
  );

  report(
    'doctor search + newest-first page (the list endpoint)',
    await explainFind(
      db,
      'doctors',
      { searchTerms: { $regex: `^${escapeRegex(term)}` } },
      { sort: { createdAt: -1, _id: -1 }, limit: 10 },
    ),
  );

  if (specialization) {
    report(
      `doctor list — specialization "${specialization}" + default sort + page 1`,
      await explainFind(
        db,
        'doctors',
        { specialization },
        { sort: { createdAt: -1, _id: -1 }, limit: 10 },
      ),
    );
  }

  report(
    'doctor list — most experienced first',
    await explainFind(db, 'doctors', {}, { sort: { experienceYears: -1, _id: -1 }, limit: 10 }),
  );

  if (patientRow?.doctorId) {
    report(
      'patient list — one doctor, newest visit first (aggregation as the service runs it)',
      await explainPipeline(db, 'patients', [
        { $match: { doctorId: patientRow.doctorId } },
        { $sort: { visitDate: -1, _id: -1 } },
        { $skip: 0 },
        { $limit: 10 },
      ]),
    );
  }

  if (gender) {
    report(
      `patient list — gender "${gender}" filter + newest first`,
      await explainFind(
        db,
        'patients',
        { gender },
        { sort: { createdAt: -1, _id: -1 }, limit: 10 },
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
    await explainFind(db, 'patients', { visitDate: { $gte: monthStart(4), $lt: monthStart(0) } }, { limit: 10 }),
  );

  report(
    'patient search — condition typed into the box, newest first',
    await explainFind(
      db,
      'patients',
      { searchTerms: { $regex: `^${escapeRegex('hypertension')}` } },
      { sort: { createdAt: -1, _id: -1 }, limit: 10 },
    ),
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
