import { z } from 'zod';
import { dropEmptyParams, listQueryBase, objectIdSchema } from '../utils/query';

export const phoneSchema = z
  .string()
  .trim()
  // Bangladeshi mobiles: +8801XXXXXXXXX or the local 01XXXXXXXXX form.
  .regex(/^(?:\+?880|0)1[3-9]\d{8}$/, 'Enter a valid Bangladeshi mobile number')
  .min(11)
  .max(14);

/** Bangladesh Medical & Dental Council registration, e.g. "A-42965" or "56879". */
export const bmdcSchema = z
  .string()
  .trim()
  .uppercase()
  .regex(/^A-\d{4,6}$|^\d{4,6}$/, 'BMDC number must look like A-12345 or 12345');

const doctorBody = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  specialization: z.string().trim().min(2, 'Specialization is required').max(80),
  hospital: z.string().trim().min(2, 'Hospital is required').max(120),
  district: z.string().trim().min(2, 'District is required').max(60),
  phone: phoneSchema,
  email: z.email().max(160),
  degrees: z.string().trim().min(3, 'Degrees are required').max(160),
  bmdcRegistration: bmdcSchema,
  experienceYears: z.coerce.number().int('Experience must be a whole number').min(0).max(60),
});

const idParams = z.object({ id: objectIdSchema });

export const createDoctorSchema = z.object({ body: doctorBody });

export const updateDoctorSchema = z.object({
  body: doctorBody.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  }),
  params: idParams,
});

export const doctorIdSchema = z.object({ params: idParams });

export const listDoctorsQuerySchema = z.preprocess(
  dropEmptyParams,
  z.object({
    ...listQueryBase,
    search: z.string().trim().max(80).optional(),
    specialization: z.string().trim().max(80).optional(),
    hospital: z.string().trim().max(120).optional(),
    district: z.string().trim().max(60).optional(),
    sort: z
      .enum([
        '-createdAt',
        'createdAt',
        'name',
        '-name',
        'specialization',
        '-specialization',
        'hospital',
        '-hospital',
        'district',
        '-district',
        'experienceYears',
        '-experienceYears',
      ])
      .default('-createdAt'),
  }),
);

export type DoctorInput = z.infer<typeof doctorBody>;
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;
