import { z } from 'zod';
import {
  BLOOD_GROUPS,
  PATIENT_GENDERS,
  PATIENT_SEVERITIES,
} from '../models/Patient';
import { dropEmptyParams, listQueryBase, objectIdSchema } from '../utils/query';
import { phoneSchema } from './doctor.schema';

const patientBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  age: z.coerce.number().int('Age must be a whole number').min(0).max(130),
  gender: z.enum(PATIENT_GENDERS),
  bloodGroup: z.enum(BLOOD_GROUPS),
  condition: z.string().trim().min(2, 'Condition is required').max(120),
  severity: z.enum(PATIENT_SEVERITIES),
  phone: phoneSchema,
  // Accepts an ISO string or `YYYY-MM-DD`; empty values are stripped upstream.
  visitDate: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
});

const idParams = z.object({ id: objectIdSchema });

export const createPatientSchema = z.object({
  body: patientBody.extend({ doctorId: objectIdSchema }),
});

export const addPatientToDoctorSchema = z.object({
  body: patientBody,
  params: idParams,
});

export const updatePatientSchema = z.object({
  body: patientBody
    .partial()
    .extend({ doctorId: objectIdSchema.optional() })
    .refine((value) => Object.keys(value).length > 0, {
      message: 'Provide at least one field to update',
    }),
  params: idParams,
});

export const patientIdSchema = z.object({ params: idParams });

export const removePatientFromDoctorSchema = z.object({
  params: z.object({ id: objectIdSchema, patientId: objectIdSchema }),
});

export const listPatientsQuerySchema = z.preprocess(
  dropEmptyParams,
  z.object({
    ...listQueryBase,
    search: z.string().trim().max(80).optional(),
    condition: z.string().trim().max(120).optional(),
    doctorId: objectIdSchema.optional(),
    gender: z.enum(PATIENT_GENDERS).optional(),
    // Every optional filter here has a matching compound index, so a filtered
    // page still resolves through an IXSCAN instead of a collection scan.
    severity: z.enum(PATIENT_SEVERITIES).optional(),
    sort: z
      .enum([
        '-createdAt',
        'createdAt',
        '-visitDate',
        'visitDate',
        'name',
        '-name',
        'condition',
        '-condition',
      ])
      .default('-createdAt'),
  }),
);

export type PatientInput = z.infer<typeof patientBody>;
export type CreatePatientInput = z.infer<typeof createPatientSchema>['body'];
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
