import mongoose from 'mongoose';
import { patientSearchTerms } from '../utils/search';

export type Gender = 'male' | 'female' | 'other';
export type Severity = 'mild' | 'moderate' | 'severe';

export const PATIENT_GENDERS = ['male', 'female', 'other'] as const;
export const PATIENT_SEVERITIES = ['mild', 'moderate', 'severe'] as const;
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export interface IPatient {
  _id: mongoose.Types.ObjectId;
  name: string;
  age: number;
  gender: Gender;
  bloodGroup: (typeof BLOOD_GROUPS)[number];
  condition: string;
  severity: Severity;
  phone: string;
  doctorId: mongoose.Types.ObjectId;
  visitDate: Date;
  notes?: string;
  searchTerms: string[];
  createdAt: Date;
  updatedAt: Date;
}

/** See the note on the Doctor schema about collection collation. */
const patientSchema = new mongoose.Schema<IPatient>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    age: { type: Number, required: true, min: 0, max: 130 },
    gender: { type: String, enum: PATIENT_GENDERS, required: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    condition: { type: String, required: true, trim: true, maxlength: 120 },
    severity: { type: String, enum: PATIENT_SEVERITIES, required: true, default: 'mild' },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    // The clinical visit date, distinct from `createdAt`. "Date-wise" filtering
    // is about when the patient was seen, not when the row was inserted.
    visitDate: { type: Date, required: true, default: () => new Date() },
    notes: { type: String, trim: true, maxlength: 500 },
    searchTerms: { type: [String], default: [], index: true },
  },
  { timestamps: true },
);

patientSchema.pre('save', function syncSearchTerms() {
  if (
    this.isNew ||
    this.isModified('name') ||
    this.isModified('condition') ||
    this.isModified('phone')
  ) {
    this.searchTerms = patientSearchTerms(this);
  }
});

patientSchema.index({ name: 1 });
patientSchema.index({ condition: 1, createdAt: -1, _id: -1 });
patientSchema.index({ severity: 1, createdAt: -1, _id: -1 });
patientSchema.index({ visitDate: -1, _id: -1 });
patientSchema.index({ createdAt: -1, _id: -1 });

// A doctor's own patient list, in both orderings the UI offers.
patientSchema.index({ doctorId: 1, createdAt: -1, _id: -1 });
patientSchema.index({ doctorId: 1, visitDate: -1, _id: -1 });
patientSchema.index({ doctorId: 1, condition: 1, createdAt: -1 });

export const Patient = mongoose.model<IPatient>('Patient', patientSchema);
