import { connectDB, disconnectDB, syncIndexes } from '../config/db';
import { DIRECTORY_DOCTORS, NOT_PUBLISHED, type DirectoryDoctor } from '../data/doctorDirectory';
import {
  CONDITIONS_BY_SPECIALTY,
  DISTRICTS,
  FALLBACK_CONDITIONS,
  PROFILE_WEIGHTS,
  type Condition,
  type SeasonProfile,
} from '../data/clinicalReference';
import { Doctor, type IDoctor } from '../models/Doctor';
import {
  BLOOD_GROUPS,
  Patient,
  type Gender,
  type IPatient,
  type Severity,
} from '../models/Patient';
import { User, hashPassword } from '../models/User';
import { doctorSearchTerms, patientSearchTerms } from '../utils/search';
import { env } from '../config/env';

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(values: readonly T[]): T => values[Math.floor(Math.random() * values.length)];

function weightedPick<T>(entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let draw = Math.random() * total;
  for (const [value, weight] of entries) {
    draw -= weight;
    if (draw <= 0) return value;
  }
  return entries.at(-1)![0];
}

/** `A-101328` sorts after `A-26999` as a string, which is the opposite of the truth. */
const registrationOrder = (bmdc: string) => Number(bmdc.replace(/^A-/, ''));

/**
 * `experienceYears` is the one doctor field that is estimated rather than published.
 *
 * BMDC numbers are issued in registration order, so a lower number is an earlier
 * licence — that is a property of the register, not an invention. Ranking the seeded
 * set by number and mapping rank onto a career span keeps the figure internally
 * consistent (a professor-grade `A-11606` never reads as a three-year junior) without
 * claiming a number any directory printed. The README calls this out; every other
 * field on a doctor comes straight from a source.
 */
function experienceBySeniority(sortedByReg: readonly DirectoryDoctor[]): Map<string, number> {
  const out = new Map<string, number>();
  const last = sortedByReg.length - 1;
  sortedByReg.forEach((doctor, index) => {
    const fraction = last === 0 ? 1 : index / last;
    out.set(doctor.bmdc, Math.round(38 - fraction * 35));
  });
  return out;
}

/**
 * Patient identities are synthetic — see the note at the top of
 * `data/clinicalReference.ts` for why they have to be. Given names and surnames are
 * deliberately reused from small pools so no string here reads as one specific real
 * person.
 */
const MALE_NAMES = [
  'Md. Abdul Karim', 'Md. Shahidul Islam', 'Rafiqul Islam', 'Nurul Amin', 'Mizanur Rahman',
  'Anwar Hossain', 'Habibur Rahman', 'Mahmudul Hasan', 'Sabbir Ahmed', 'Tanvir Mahmood',
  'Rakibul Hasan', 'Imran Khan', 'Arifur Rahman', 'Golam Mostafa', 'Delwar Hossain',
  'Shamim Reza', 'Nazmul Karim', 'Ashraful Islam', 'Rezaul Karim', 'Zahidul Hasan',
  'Ahsanul Haque', 'Kamrul Islam', 'Mosabber Hossain', 'Sayed Mahmud', 'Faruk Ahmed',
] as const;

const FEMALE_NAMES = [
  'Nusrat Jahan', 'Fatema Kuddusi', 'Ayesha Siddiqua', 'Israt Jahan', 'Taslima Akter',
  'Rehana Parvin', 'Khaleda Begum', 'Farhana Yeasmin', 'Shirin Sultana', 'Nasrin Akter',
  'Jesmin Akter', 'Tanjila Rahman', 'Sumaiya Islam', 'Tasneem Zahra', 'Amena Khatun',
  'Dilara Khanom', 'Lamia Tabassum', 'Rokeya Khatun', 'Salma Akter', 'Rupali Chakma',
  'Sabina Yasmin', 'Rumana Hossain', 'Sharmistha Das', 'Mousumi Das', 'Nadia Rahman',
] as const;

const SURNAMES = [
  'Rahman', 'Islam', 'Ahmed', 'Hossain', 'Chowdhury', 'Khan', 'Uddin', 'Akter', 'Begum', 'Miah',
  'Sarkar', 'Talukder', 'Molla', 'Bhuiyan', 'Sikder', 'Mondal', 'Hawladar', 'Patwary', 'Ferdous',
  'Kabir', 'Anam', 'Siddique', 'Qureshi', 'Kamaruddin', 'Bepari', 'Nath', 'Das', 'Barman',
] as const;

/**
 * B+ and O+ lead and Rh-negative groups are rare, which is the shape Bangladeshi
 * blood-bank series report. An approximation of that shape, not a measurement.
 */
const BLOOD_WEIGHTS: readonly (readonly [(typeof BLOOD_GROUPS)[number], number])[] = [
  ['B+', 34],
  ['O+', 32],
  ['A+', 18],
  ['AB+', 8],
  ['O-', 3],
  ['B-', 2],
  ['A-', 2],
  ['AB-', 1],
] as const;

const ADVICE = [
  'Referred from the upazila health complex; advised to continue medication.',
  'After meal. Follow up after 2 weeks with a fresh lab report.',
  'Awaiting ultrasound report before the next consultation.',
  'Regular review, condition stable. Next visit in one month.',
  'Second opinion requested by family.',
  'Advised diet and lifestyle changes along with the prescription.',
  'Brought the previous prescription sheet. Dose adjusted.',
  'Advised to return immediately if fever runs past three days.',
] as const;

/** Patient numbers are invented, but they have to be dial-shaped or the phone search demo is meaningless. */
const mobile = () => `+8801${rand(3, 9)}${String(rand(0, 99999999)).padStart(8, '0')}`;

/**
 * OPD sessions run roughly 08:00–20:00, so visit hours come from that window and the
 * month comes from the condition's own seasonality curve.
 */
function seasonalDate(profile: SeasonProfile): Date {
  const now = new Date();
  const weights = PROFILE_WEIGHTS[profile];
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  let monthsBack = 0;
  let draw = Math.random() * total;
  for (let index = 0; index < 12; index += 1) {
    const calendarMonth = (now.getUTCMonth() - 11 + index + 12) % 12;
    draw -= weights[calendarMonth];
    if (draw <= 0) {
      monthsBack = 11 - index;
      break;
    }
  }

  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, 1));
  const daysInMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  // The current month is truncated, so no visit ever lands in the future.
  const maxDay = monthsBack === 0 ? Math.min(now.getUTCDate(), daysInMonth) : daysInMonth;

  date.setUTCDate(rand(1, maxDay));
  date.setUTCHours(rand(8, 19), rand(0, 59), rand(0, 59), 0);
  // A visit in the current month can still land after "now" once the hour is
  // drawn, so clamp — a future-dated appointment makes the dashboard's "this week"
  // count look wrong in a way that is hard to spot on screen.
  return new Date(Math.min(date.getTime(), Date.now() - rand(60, 3600) * 1000));
}

/** Skewed towards the present so the 12-month trend reads as growth, not flat noise. */
function recentDate(): Date {
  const daysAgo = Math.floor(Math.pow(Math.random(), 1.35) * 365);
  return new Date(Date.now() - daysAgo * 86_400_000 - rand(0, 86_399) * 1000);
}

const severityFor = (condition: Condition): Severity =>
  weightedPick(
    condition.severeProne
      ? ([['mild', 2], ['moderate', 4], ['severe', 4]] as const)
      : ([['mild', 6], ['moderate', 3], ['severe', 1]] as const),
  );

/**
 * The patient's home district, weighted so most people are seen near where they live:
 * the doctor's own district two thirds of the time, another district in the same
 * division for most of the rest. A Dhaka consultant with a Bandarban patient every
 * other row does not read as a real OPD list.
 */
function homeDistrict(doctorDistrict: string): string {
  const division = DISTRICTS.find((d) => d.name === doctorDistrict)?.division;
  const sameDivision = DISTRICTS.filter((d) => d.division === division);
  if (division && Math.random() < 0.66 && sameDivision.some((d) => d.name === doctorDistrict)) {
    return doctorDistrict;
  }
  if (division && sameDivision.length > 1) {
    return weightedPick(sameDivision.map((d) => [d.name, d.weight] as const));
  }
  return weightedPick(DISTRICTS.map((d) => [d.name, d.weight] as const));
}

/**
 * Contacts are the one thing deliberately not carried over from the directories. Both
 * sites publish chamber and personal numbers for these doctors; re-listing them on a
 * demo register would route cold calls at real people, and substituting invented ones
 * would put false contact data under real names. `not published` is stored instead and
 * rendered as a plain label.
 */
function buildDoctors(): Omit<IDoctor, '_id'>[] {
  const experience = experienceBySeniority(
    [...DIRECTORY_DOCTORS].sort((a, b) => registrationOrder(a.bmdc) - registrationOrder(b.bmdc)),
  );

  return DIRECTORY_DOCTORS.map((doctor) => {
    const createdAt = recentDate();
    return {
      name: doctor.name,
      specialization: doctor.specialization,
      hospital: doctor.hospital,
      district: doctor.district,
      phone: NOT_PUBLISHED,
      email: NOT_PUBLISHED,
      degrees: doctor.degrees,
      bmdcRegistration: doctor.bmdc,
      experienceYears: experience.get(doctor.bmdc) ?? rand(2, 38),
      // Withheld fields stay out of the token array on purpose: indexing the words
      // "not published" would make every record match a search for "published".
      searchTerms: doctorSearchTerms({
        name: doctor.name,
        email: '',
        bmdcRegistration: doctor.bmdc,
        phone: '',
      }),
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function buildPatients(
  count: number,
  doctors: { _id: unknown; specialization: string; district: string }[],
): Omit<IPatient, '_id'>[] {
  const grouped = new Map<string, typeof doctors>();
  for (const doctor of doctors) {
    const bucket = grouped.get(doctor.specialization);
    if (bucket) bucket.push(doctor);
    else grouped.set(doctor.specialization, [doctor]);
  }
  const pools = [...grouped.values()];

  const patients: Omit<IPatient, '_id'>[] = [];

  for (let index = 0; index < count; index += 1) {
    // Load is skewed so a few consultants carry far more patients than the rest —
    // a flat distribution would make the patients-per-doctor bar chart useless.
    const pool = pick(pools);
    const doctor = pool[Math.floor(Math.pow(Math.random(), 1.7) * pool.length)] ?? pool[0];

    const catalogue = CONDITIONS_BY_SPECIALTY[doctor.specialization] ?? FALLBACK_CONDITIONS;
    const condition = weightedPick(catalogue.map((item) => [item, item.weight] as const));
    const visitDate = seasonalDate(condition.profile);

    const gender: Gender = condition.femaleOnly
      ? 'female'
      : condition.maleOnly
        ? 'male'
        : Math.random() < 0.5
          ? 'male'
          : Math.random() < 0.98
            ? 'female'
            : 'other';

    const given = gender === 'male' ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
    const surname = pick(SURNAMES);
    // Most pool entries already carry a family name, so a second one on top reads as
    // machine-made ("Kamrul Islam Islam"). Half the rows keep the name as-is.
    const patientName =
      Math.random() < 0.5 || given.toLowerCase().split(' ').includes(surname.toLowerCase())
        ? given
        : `${given} ${surname}`;
    const phone = mobile();

    // The ICD-10 code and the home district go in `notes`: that is what an OPD card
    // actually carries, and it makes a synthetic record auditable rather than opaque.
    const notes =
      Math.random() < 0.8
        ? `ICD-10 ${condition.icd10}. From ${homeDistrict(doctor.district)}. ${pick(ADVICE)}`
        : undefined;

    patients.push({
      name: patientName,
      age: rand(condition.age[0], condition.age[1]),
      gender,
      bloodGroup: weightedPick(BLOOD_WEIGHTS),
      condition: condition.name,
      severity: severityFor(condition),
      phone,
      doctorId: doctor._id as IPatient['doctorId'],
      visitDate,
      searchTerms: patientSearchTerms({ name: patientName, condition: condition.name, phone }),
      notes,
      createdAt: visitDate,
      updatedAt: visitDate,
    });
  }

  return patients;
}

async function seed(): Promise<void> {
  await connectDB();

  // Dropped rather than emptied: collection options cannot be changed in place,
  // and a database seeded before the collation was removed would keep carrying
  // a collection-level ICU collation that makes every `$regex` a collection scan.
  console.log('Dropping existing collections…');
  await Promise.all([
    Patient.collection.drop().catch(() => undefined),
    Doctor.collection.drop().catch(() => undefined),
    User.collection.drop().catch(() => undefined),
  ]);

  // Indexes go on the empty collections first, so a duplicate BMDC number in the
  // directory data fails at insert time with E11000 instead of as an index-build
  // error after everything has already been written.
  await syncIndexes();

  // `insertMany` skips middleware, so both token arrays are built inside the
  // generators instead of by the model's pre-save hook.
  const doctors = buildDoctors();
  await Doctor.insertMany(doctors, { timestamps: false });

  const inserted = await Doctor.find({}, { _id: 1, specialization: 1, district: 1 }).lean();
  await Patient.insertMany(buildPatients(env.SEED_PATIENTS, inserted), { timestamps: false });

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  await User.create({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    passwordHash,
    role: 'admin',
    tokenVersion: 0,
  });

  const [doctorCount, patientCount] = await Promise.all([
    Doctor.countDocuments(),
    Patient.countDocuments(),
  ]);

  const specializations = new Set(doctors.map((doctor) => doctor.specialization));
  console.log(
    `\nSeeded ${doctorCount} real doctors across ${specializations.size} specialties and ` +
      `${patientCount} synthetic patients.\n` +
      `Sign in with ${env.ADMIN_EMAIL}.\n`,
  );
  await disconnectDB();
}

seed().catch(async (error: unknown) => {
  console.error(error);
  await disconnectDB().catch(() => undefined);
  process.exitCode = 1;
});
