import { Doctor } from '../models/Doctor';
import { Patient } from '../models/Patient';
import { startOfCurrentMonth, startOfWeek } from '../utils/dates';

const TIMELINE_MONTHS = 12;
const TOP_LIMIT = 8;

interface CountRow {
  n: number;
}
interface GroupRow {
  _id: string | null;
  count: number;
}
interface DoctorGroupRow {
  _id: unknown;
  patients: number;
  name: string | null;
  specialization: string | null;
}
interface TimelineRow {
  _id: { y: number; m: number } | null;
  patients: number;
}

interface PatientFacet {
  total: CountRow[];
  thisWeek: CountRow[];
  thisMonth: CountRow[];
  perDoctor: DoctorGroupRow[];
  timeline: TimelineRow[];
  byCondition: GroupRow[];
}

interface DoctorFacet {
  total: CountRow[];
  thisMonth: CountRow[];
  bySpecialization: GroupRow[];
}

const scalar = (rows: CountRow[] | undefined): number => rows?.[0]?.n ?? 0;

/**
 * The last N calendar months as `YYYY-MM`, oldest first.
 *
 * Generated independently of the data so a month with zero visits still appears
 * on the axis — otherwise the chart silently draws a trend across a gap and the
 * viewer cannot tell "no patients" from "no data".
 */
function monthKeys(count: number): { key: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index), 1),
    );
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
    };
  });
}

/**
 * Every patient-side number in one pass over the collection.
 *
 * Six separate `countDocuments`/`$group` calls would be six network waits.
 * `$facet` computes them together, and the two facets below run concurrently
 * because neither depends on the other.
 *
 * Each helper declares its own return type so `Promise.all` infers a tuple;
 * inlining both aggregates into one call collapses to a union of arrays and
 * every field access below fails to typecheck.
 */
async function loadPatientFacet(since: Date): Promise<PatientFacet | undefined> {
  const rows = await Patient.aggregate<PatientFacet>(
    [
      {
        $facet: {
          total: [{ $count: 'n' }],
          thisWeek: [{ $match: { visitDate: { $gte: startOfWeek() } } }, { $count: 'n' }],
          thisMonth: [
            { $match: { visitDate: { $gte: startOfCurrentMonth() } } },
            { $count: 'n' },
          ],
          perDoctor: [
            { $group: { _id: '$doctorId', patients: { $sum: 1 } } },
            { $sort: { patients: -1 } },
            { $limit: TOP_LIMIT },
            {
              $lookup: {
                from: 'doctors',
                localField: '_id',
                foreignField: '_id',
                as: 'doctor',
              },
            },
            {
              $addFields: {
                name: { $arrayElemAt: ['$doctor.name', 0] },
                specialization: { $arrayElemAt: ['$doctor.specialization', 0] },
              },
            },
            { $project: { doctor: 0, _id: 0 } },
          ],
          timeline: [
            { $match: { visitDate: { $gte: since } } },
            {
              $group: {
                _id: { y: { $year: '$visitDate' }, m: { $month: '$visitDate' } },
                patients: { $sum: 1 },
              },
            },
            { $sort: { '_id.y': 1, '_id.m': 1 } },
          ],
          byCondition: [
            { $group: { _id: '$condition', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: TOP_LIMIT },
          ],
        },
      },
    ],
  );

  return rows[0];
}

async function loadDoctorFacet(): Promise<DoctorFacet | undefined> {
  const rows = await Doctor.aggregate<DoctorFacet>([
    {
      $facet: {
        total: [{ $count: 'n' }],
        thisMonth: [{ $match: { createdAt: { $gte: startOfCurrentMonth() } } }, { $count: 'n' }],
        bySpecialization: [
          { $group: { _id: '$specialization', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: TOP_LIMIT },
        ],
      },
    },
  ]);

  return rows[0];
}

export async function getStats() {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - (TIMELINE_MONTHS - 1));
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);

  const [patients, doctors] = await Promise.all([loadPatientFacet(since), loadDoctorFacet()]);

  const countsByMonth = new Map(
    (patients?.timeline ?? [])
      .filter((row) => row._id !== null)
      .map((row) => [`${row._id!.y}-${String(row._id!.m).padStart(2, '0')}`, row.patients]),
  );

  const totalDoctors = scalar(doctors?.total);
  const totalPatients = scalar(patients?.total);

  return {
    totals: {
      doctors: totalDoctors,
      patients: totalPatients,
      avgPatientsPerDoctor:
        totalDoctors === 0 ? 0 : Math.round((totalPatients / totalDoctors) * 10) / 10,
      patientsThisWeek: scalar(patients?.thisWeek),
      patientsThisMonth: scalar(patients?.thisMonth),
      doctorsThisMonth: scalar(doctors?.thisMonth),
    },
    timeline: monthKeys(TIMELINE_MONTHS).map(({ key, label }) => ({
      month: key,
      label,
      patients: countsByMonth.get(key) ?? 0,
    })),
    patientsPerDoctor: (patients?.perDoctor ?? []).map((row) => ({
      doctorId: String(row._id ?? ''),
      name: row.name ?? 'Unknown',
      specialization: row.specialization ?? '—',
      patients: row.patients,
    })),
    byCondition: (patients?.byCondition ?? []).map((row) => ({
      condition: row._id ?? 'Unspecified',
      count: row.count,
    })),
    bySpecialization: (doctors?.bySpecialization ?? []).map((row) => ({
      specialization: row._id ?? 'Unspecified',
      count: row.count,
    })),
  };
}

/**
 * Distinct values for the filter dropdowns. `distinct` is served from the
 * existing `{ specialization, createdAt }` and `{ condition, createdAt }`
 * indexes rather than a full scan, so it stays cheap as the collections grow.
 */
export async function getFilterOptions() {
  const [specializations, hospitals, districts, conditions] = await Promise.all([
    Doctor.distinct('specialization'),
    Doctor.distinct('hospital'),
    Doctor.distinct('district'),
    Patient.distinct('condition'),
  ]);

  const alphabetical = (values: (string | null)[]) =>
    values.filter((value): value is string => Boolean(value)).sort((a, b) => a.localeCompare(b));

  return {
    specializations: alphabetical(specializations),
    hospitals: alphabetical(hospitals),
    districts: alphabetical(districts),
    conditions: alphabetical(conditions),
  };
}
