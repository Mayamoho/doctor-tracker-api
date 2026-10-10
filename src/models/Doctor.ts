import mongoose from 'mongoose';
import { doctorSearchTerms } from '../utils/search';

export interface IDoctor {
  _id: mongoose.Types.ObjectId;
  name: string;
  specialization: string;
  hospital: string;
  district: string;
  phone: string;
  email: string;
  degrees: string;
  bmdcRegistration: string;
  experienceYears: number;
  /** Normalized lowercase tokens the record is findable by — never rendered. */
  searchTerms: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * No collection collation on purpose. A non-simple collation makes every `$regex`
 * a collection scan, which is the opposite of what a search box needs; the case-
 * insensitive behaviour it would have bought is produced by `searchTerms` instead.
 */
const doctorSchema = new mongoose.Schema<IDoctor>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    specialization: { type: String, required: true, trim: true, maxlength: 80 },
    hospital: { type: String, required: true, trim: true, maxlength: 120 },
    district: { type: String, required: true, trim: true, maxlength: 60 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    // e.g. "MBBS (Dhaka), FCPS (Cardiology)" — the convention used by Bangladeshi
    // medical directories, where qualification is part of the identity.
    degrees: { type: String, required: true, trim: true, maxlength: 160 },
    // Bangladesh Medical & Dental Council registration, e.g. "A-42965".
    bmdcRegistration: { type: String, required: true, trim: true, uppercase: true, unique: true },
    experienceYears: { type: Number, required: true, min: 0, max: 60 },
    searchTerms: { type: [String], default: [], index: true },
  },
  { timestamps: true },
);

/**
 * Keeps the token array in step with the fields it is derived from.
 * Only `save()` runs this, which is why the service updates through a document
 * rather than `findByIdAndUpdate` — `insertMany` skips middleware, so the seed
 * sets `searchTerms` itself.
 */
doctorSchema.pre('save', function syncSearchTerms() {
  if (
    this.isNew ||
    this.isModified('name') ||
    this.isModified('email') ||
    this.isModified('bmdcRegistration') ||
    this.isModified('phone')
  ) {
    this.searchTerms = doctorSearchTerms(this);
  }
});

// Unique index comes from the `bmdcRegistration` field definition.
doctorSchema.index({ name: 1 });
doctorSchema.index({ email: 1 });

// Filter + default sort, so a filtered page never needs an in-memory sort.
doctorSchema.index({ specialization: 1, createdAt: -1, _id: -1 });
doctorSchema.index({ district: 1, createdAt: -1, _id: -1 });
doctorSchema.index({ hospital: 1, createdAt: -1, _id: -1 });

// Default sort for the unfiltered list.
doctorSchema.index({ createdAt: -1, _id: -1 });

export const Doctor = mongoose.model<IDoctor>('Doctor', doctorSchema);
