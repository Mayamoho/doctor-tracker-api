import { Types, type QueryFilter } from 'mongoose';
import { Doctor } from '../models/Doctor';
import { Patient, type IPatient } from '../models/Patient';
import { ApiError } from '../utils/ApiError';
import { buildDateRange } from '../utils/dates';
import { buildMeta, toPageParams } from '../utils/pagination';
import { prefixRegex } from '../utils/regex';
import { resolveSort } from '../utils/query';
import { toPublic } from '../utils/serialize';
import { searchTerm } from '../utils/search';
import type {
  CreatePatientInput,
  ListPatientsQuery,
  PatientInput,
} from '../validation/patient.schema';

const SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  visitDate: 'visitDate',
  name: 'name',
  condition: 'condition',
};

interface PatientRow extends Omit<IPatient, '__v'> {
  doctorName: string | null;
  doctorSpecialization: string | null;
}

/**
 * Note the `new Types.ObjectId(...)` on `doctorId`.
 *
 * Aggregation pipelines skip Mongoose's casting entirely — a raw string here
 * would match nothing and read as "this doctor has no patients" rather than
 * erroring. Model queries would have coerced it for us; `$match` will not.
 */
function buildFilter(query: ListPatientsQuery): QueryFilter<IPatient> {
  const filter: QueryFilter<IPatient> = {};

  const term = query.search ? searchTerm(query.search) : null;
  if (term) filter.searchTerms = prefixRegex(term);
  if (query.condition) filter.condition = query.condition;
  if (query.gender) filter.gender = query.gender;
  if (query.severity) filter.severity = query.severity;
  if (query.doctorId) filter.doctorId = new Types.ObjectId(query.doctorId);

  // Patients are filtered by the clinical visit date, not the row's insert time.
  return Object.assign(filter, buildDateRange('visitDate', query.from, query.to));
}

export async function listPatients(query: ListPatientsQuery) {
  const { page, limit, skip } = toPageParams(query.page, query.limit);
  const filter = buildFilter(query);
  const sort = resolveSort(query.sort, SORT_FIELDS);

  const [rows, total] = await Promise.all([
    Patient.aggregate<PatientRow>(
      [
        { $match: filter },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        // Joins the doctor for exactly the rows on this page, so the patient
        // table can show a name without the client fetching doctors separately.
        {
          $lookup: {
            from: 'doctors',
            localField: 'doctorId',
            foreignField: '_id',
            as: '_doctor',
          },
        },
        {
          $addFields: {
            doctorName: { $arrayElemAt: ['$_doctor.name', 0] },
            doctorSpecialization: { $arrayElemAt: ['$_doctor.specialization', 0] },
          },
        },
        { $project: { _doctor: 0, __v: 0, updatedAt: 0, searchTerms: 0 } },
      ],
    ),
    Patient.countDocuments(filter),
  ]);

  return { items: rows, meta: buildMeta({ page, limit }, total) };
}

export async function getPatient(id: string) {
  const patient = await Patient.findById(id)
    .select('-__v -searchTerms')
    .populate('doctorId', 'name specialization')
    .lean();
  if (!patient) throw ApiError.notFound('Patient');
  return patient;
}

async function assertDoctorExists(doctorId: string): Promise<void> {
  const exists = await Doctor.exists({ _id: doctorId });
  if (!exists) throw ApiError.notFound('Doctor');
}

export async function createPatient(input: CreatePatientInput) {
  await assertDoctorExists(input.doctorId);
  const patient = await Patient.create(input);
  return toPublic(patient.toObject());
}

/** The doctor comes from the URL, so the request body cannot reassign them. */
export async function addPatientToDoctor(doctorId: string, input: PatientInput) {
  return createPatient({ ...input, doctorId });
}

/** See the note on `updateDoctor`: `save()` is what keeps `searchTerms` current. */
export async function updatePatient(id: string, patch: Partial<CreatePatientInput>) {
  if (patch.doctorId) await assertDoctorExists(patch.doctorId);

  const patient = await Patient.findById(id);
  if (!patient) throw ApiError.notFound('Patient');

  patient.set(patch);
  await patient.save();

  return toPublic(patient.toObject());
}

export async function deletePatient(id: string) {
  const removed = await Patient.deleteOne({ _id: id });
  if (removed.deletedCount === 0) throw ApiError.notFound('Patient');
  return { deleted: true };
}

/**
 * Both ids must match, so a guessed patient id cannot delete someone else's
 * patient through the per-doctor endpoint.
 */
export async function removePatientFromDoctor(doctorId: string, patientId: string) {
  const removed = await Patient.deleteOne({ _id: patientId, doctorId });
  if (removed.deletedCount === 0) throw ApiError.notFound('Patient');
  return { deleted: true };
}
