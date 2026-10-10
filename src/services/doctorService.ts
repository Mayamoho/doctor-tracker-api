import type { QueryFilter, Types } from 'mongoose';
import { Doctor, type IDoctor } from '../models/Doctor';
import { Patient } from '../models/Patient';
import { ApiError } from '../utils/ApiError';
import { buildDateRange } from '../utils/dates';
import { buildMeta, toPageParams } from '../utils/pagination';
import { prefixRegex } from '../utils/regex';
import { resolveSort } from '../utils/query';
import { toPublic } from '../utils/serialize';
import { searchTerm } from '../utils/search';
import type { DoctorInput, ListDoctorsQuery } from '../validation/doctor.schema';

const SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  name: 'name',
  specialization: 'specialization',
  hospital: 'hospital',
  district: 'district',
  experienceYears: 'experienceYears',
};

/** Only the fields the table renders — `__v` and timestamps we do not show stay out. */
const LIST_FIELDS = {
  name: 1,
  specialization: 1,
  hospital: 1,
  district: 1,
  degrees: 1,
  bmdcRegistration: 1,
  experienceYears: 1,
  phone: 1,
  email: 1,
  createdAt: 1,
} as const;

function buildFilter(query: ListDoctorsQuery): QueryFilter<IDoctor> {
  const filter: QueryFilter<IDoctor> = {};

  const term = query.search ? searchTerm(query.search) : null;
  if (term) filter.searchTerms = prefixRegex(term);
  if (query.specialization) filter.specialization = query.specialization;
  if (query.hospital) filter.hospital = query.hospital;
  if (query.district) filter.district = query.district;

  return Object.assign(filter, buildDateRange('createdAt', query.from, query.to));
}

/**
 * Patient counts for a whole page in one grouped query.
 *
 * The two obvious alternatives are worse: calling `countDocuments` per row is an
 * N+1 (10 rows = 10 extra round trips), and a `$lookup` that pulls the patient
 * documents into each doctor transfers every patient field just to read its
 * length. This ships one `{ doctorId, count }` pair per doctor.
 */
async function patientCounts(doctorIds: Types.ObjectId[]): Promise<Record<string, number>> {
  if (doctorIds.length === 0) return {};

  const rows = await Patient.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { doctorId: { $in: doctorIds } } },
    { $group: { _id: '$doctorId', count: { $sum: 1 } } },
  ]);

  return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
}

export async function listDoctors(query: ListDoctorsQuery) {
  const { page, limit, skip } = toPageParams(query.page, query.limit);
  const filter = buildFilter(query);
  const sort = resolveSort(query.sort, SORT_FIELDS);

  const [rows, total] = await Promise.all([
    Doctor.find(filter).select(LIST_FIELDS).sort(sort).skip(skip).limit(limit).lean(),
    Doctor.countDocuments(filter),
  ]);

  const counts = await patientCounts(rows.map((row) => row._id));

  return {
    items: rows.map((row) => ({ ...row, patientCount: counts[String(row._id)] ?? 0 })),
    meta: buildMeta({ page, limit }, total),
  };
}

export async function getDoctor(id: string) {
  const doctor = await Doctor.findById(id).select('-__v -searchTerms').lean();
  if (!doctor) throw ApiError.notFound('Doctor');

  const counts = await patientCounts([doctor._id]);
  return { ...doctor, patientCount: counts[String(doctor._id)] ?? 0 };
}

export async function createDoctor(input: DoctorInput) {
  const doctor = await Doctor.create(input);
  return { ...toPublic(doctor.toObject()), patientCount: 0 };
}

/**
 * Load-modify-save instead of `findByIdAndUpdate`: `save()` is what runs the
 * pre-save hook that rebuilds `searchTerms`. Writes are rare in an admin portal,
 * and a token array left stale after a rename makes the record unfindable.
 */
export async function updateDoctor(id: string, patch: Partial<DoctorInput>) {
  const doctor = await Doctor.findById(id);
  if (!doctor) throw ApiError.notFound('Doctor');

  doctor.set(patch);
  await doctor.save();

  const counts = await patientCounts([doctor._id]);
  return { ...toPublic(doctor.toObject()), patientCount: counts[String(doctor._id)] ?? 0 };
}

/**
 * Removes the doctor and their patients.
 *
 * The parent document goes first on purpose: if the process dies between the two
 * writes the patients are orphaned but still present and reassignable, whereas
 * deleting the children first would have destroyed them for nothing. On a replica
 * set this belongs in a transaction.
 */
export async function deleteDoctor(id: string) {
  const doctor = await Doctor.findByIdAndDelete(id).lean();
  if (!doctor) throw ApiError.notFound('Doctor');

  const removed = await Patient.deleteMany({ doctorId: doctor._id });
  return { deleted: true, deletedPatients: removed.deletedCount };
}
