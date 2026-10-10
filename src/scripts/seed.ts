import { connectDB, disconnectDB, syncIndexes } from '../config/db';
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
  return entries[0][0];
}

type SeasonProfile = 'chronic' | 'monsoon' | 'winter' | 'summer';

/**
 * Specialty labels follow Bangladeshi medical directories ("Child", "Gynae & Obs",
 * "Chest & Asthma", "Diabetes & Hormone") rather than Western department names,
 * because that is the vocabulary the local registrations actually use.
 *
 * Each specialty carries its own qualification string and case mix, so the
 * dashboard's condition chart is coherent with the patients-per-doctor chart:
 * a paediatrician does not appear with cirrhotic adults.
 */
interface Specialty {
  name: string;
  degrees: readonly string[];
  conditions: readonly string[];
  age: readonly [number, number];
  /** Gynaecology only ever sees female patients. */
  femaleOnly?: boolean;
  weight: number;
}

const SPECIALTIES: readonly Specialty[] = [
  {
    name: 'Medicine',
    degrees: ['MBBS, FCPS (Medicine)', 'MBBS (Dhaka), MD (Medicine)', 'MBBS, MCPS (Medicine)'],
    conditions: ['Hypertension', 'Type 2 Diabetes', 'Dengue Fever', 'Typhoid', 'Gastroenteritis', 'Iron Deficiency Anemia'],
    age: [18, 86],
    weight: 16,
  },
  {
    name: 'Cardiology',
    degrees: ['MBBS, MD (Cardiology)', 'MBBS (Dhaka), FCPS (Cardiology)', 'MBBS, DCard (NICVD)'],
    conditions: ['Ischemic Heart Disease', 'Hypertension', 'Atrial Fibrillation', 'Heart Failure', 'Dyslipidemia'],
    age: [35, 88],
    weight: 9,
  },
  {
    name: 'Child',
    degrees: ['MBBS, DCH', 'MBBS (Dhaka), FCPS (Pediatrics)', 'MBBS, MD (Pediatrics)'],
    conditions: ['Acute Watery Diarrhea', 'Pneumonia', 'Measles', 'Acute Asthma', 'Malnutrition', 'Fever with Rash'],
    age: [1, 14],
    weight: 11,
  },
  {
    name: 'Gynae & Obs',
    degrees: ['MBBS, FCPS (Gynae & Obs)', 'MBBS (Dhaka), MS (Gynae)', 'MBBS, MCPS (Gynae)'],
    conditions: ['Anemia in Pregnancy', 'PCOS', 'Menstrual Disorder', 'Ante-natal Check-up', 'Uterine Fibroid'],
    age: [15, 55],
    femaleOnly: true,
    weight: 10,
  },
  {
    name: 'Chest & Asthma',
    degrees: ['MBBS, FCPS (Medicine)', 'MBBS, MD (Pulmonology)', 'MBBS (DU), Dip (TB & Chest)'],
    conditions: ['Asthma', 'COPD', 'Tuberculosis', 'Chronic Bronchitis', 'Pleurisy'],
    age: [12, 80],
    weight: 7,
  },
  {
    name: 'Diabetes & Hormone',
    degrees: ['MBBS, MD (Endocrinology)', 'MBBS (Dhaka), FCPS (Medicine)', 'MBBS, DDV'],
    conditions: ['Type 2 Diabetes', 'Type 1 Diabetes', 'Hypothyroidism', 'Dyslipidemia', 'Obesity'],
    age: [14, 78],
    weight: 7,
  },
  {
    name: 'Neurology',
    degrees: ['MBBS, MD (Neurology)', 'MBBS (Dhaka), FCPS (Neurology)'],
    conditions: ['Migraine', 'Epilepsy', 'Post-Stroke Recovery', 'Cervical Spondylosis', 'Parkinsonism'],
    age: [16, 82],
    weight: 6,
  },
  {
    name: 'Orthopedic',
    degrees: ['MBBS, MS (Ortho)', 'MBBS (Dhaka), FCPS (Orthopedic)', 'MBBS, D. Orth'],
    conditions: ['Osteoarthritis', 'Back Pain', 'Fracture Follow-up', 'Slipped Disc', 'Frozen Shoulder'],
    age: [8, 85],
    weight: 7,
  },
  {
    name: 'Nephrology',
    degrees: ['MBBS, MD (Nephrology)', 'MBBS (Dhaka), FCPS (Nephrology)'],
    conditions: ['Chronic Kidney Disease', 'Urinary Tract Infection', 'Nephrotic Syndrome', 'Kidney Stone'],
    age: [10, 80],
    weight: 5,
  },
  {
    name: 'Gastroenterology',
    degrees: ['MBBS, MD (Gastroenterology)', 'MBBS (Dhaka), FCPS (Medicine)', 'MBBS, MRCP'],
    conditions: ['Gastric Ulcer', 'Jaundice', 'Hepatitis B', 'Cirrhosis', 'GERD', 'Irritable Bowel'],
    age: [16, 80],
    weight: 6,
  },
  {
    name: 'Eye',
    degrees: ['MBBS, DO', 'MBBS (Dhaka), FCPS (Ophthalmology)', 'MBBS, MS (Eye)'],
    conditions: ['Cataract', 'Glaucoma', 'Diabetic Retinopathy', 'Conjunctivitis', 'Refractive Error'],
    age: [6, 88],
    weight: 5,
  },
  {
    name: 'ENT',
    degrees: ['MBBS, DLO', 'MBBS (Dhaka), FCPS (ENT)'],
    conditions: ['Chronic Sinusitis', 'Tonsillitis', 'Hearing Loss', 'Vertigo', 'Allergic Rhinitis'],
    age: [5, 78],
    weight: 4,
  },
  {
    name: 'Dermatology & VD',
    degrees: ['MBBS, DDV', 'MBBS (Dhaka), FCPS (Dermatology)'],
    conditions: ['Fungal Infection', 'Scabies', 'Acne Vulgaris', 'Eczema', 'Psoriasis'],
    age: [8, 70],
    weight: 4,
  },
  {
    name: 'Urology',
    degrees: ['MBBS, MS (Urology)', 'MBBS (Dhaka), FCPS (Urology)'],
    conditions: ['BPH', 'Kidney Stone', 'Urinary Tract Infection', 'Prostatitis'],
    age: [25, 85],
    weight: 4,
  },
  {
    name: 'Psychiatry',
    degrees: ['MBBS, MD (Psychiatry)', 'MBBS (Dhaka), FCPS (Psychiatry)'],
    conditions: ['Depressive Disorder', 'Generalized Anxiety', 'Insomnia', 'Panic Disorder'],
    age: [14, 68],
    weight: 4,
  },
  {
    name: 'Cancer',
    degrees: ['MBBS, MD (Oncology)', 'MBBS (Dhaka), FCPS (Surgery)', 'MBBS, MRCP'],
    conditions: ['Breast Cancer', 'Cervical Cancer', 'Lymphoma', 'Colorectal Cancer', 'Post-Chemo Review'],
    age: [28, 82],
    weight: 3,
  },
  {
    name: 'General Surgery',
    degrees: ['MBBS, MS (Surgery)', 'MBBS (Dhaka), FCPS (Surgery)'],
    conditions: ['Hernia', 'Appendicitis Follow-up', 'Thyroid Nodule', 'Piles', 'Gall Stone'],
    age: [15, 80],
    weight: 5,
  },
  {
    name: 'Laparoscopic Surgery',
    degrees: ['MBBS, MS, FELCS', 'MBBS (Dhaka), FCPS (Surgery)', 'MBBS, D-Lap'],
    conditions: ['Gall Stone', 'Appendicitis Follow-up', 'Hernia', 'Ovarian Cyst'],
    age: [18, 72],
    weight: 3,
  },
];

/** Government and private facilities, each pinned to the district it actually sits in. */
const FACILITIES: readonly { hospital: string; district: string; weight: number }[] = [
  { hospital: 'Dhaka Medical College Hospital', district: 'Dhaka', weight: 8 },
  { hospital: 'BSMMU (Pepsu)', district: 'Dhaka', weight: 7 },
  { hospital: 'Square Hospital', district: 'Dhaka', weight: 6 },
  { hospital: 'United Hospital', district: 'Dhaka', weight: 5 },
  { hospital: 'Labaid Specialized Hospital', district: 'Dhaka', weight: 5 },
  { hospital: 'Ibn Sina Common Health Care', district: 'Dhaka', weight: 5 },
  { hospital: 'Popular Diagnostic Center', district: 'Dhaka', weight: 4 },
  { hospital: 'Evercare Hospital Dhaka', district: 'Dhaka', weight: 3 },
  { hospital: 'Bangladesh Specialized Hospital', district: 'Dhaka', weight: 3 },
  { hospital: 'National Institute of Cardiovascular Diseases', district: 'Dhaka', weight: 3 },
  { hospital: 'Mugda Medical College Hospital', district: 'Dhaka', weight: 3 },
  { hospital: 'Chattogram Medical College Hospital', district: 'Chattogram', weight: 6 },
  { hospital: 'Park Hospital', district: 'Chattogram', weight: 3 },
  { hospital: 'Imperial Hospital', district: 'Chattogram', weight: 3 },
  { hospital: 'MAA Ospitation', district: 'Chattogram', weight: 2 },
  { hospital: 'Sylhet MAG Osmani Medical College Hospital', district: 'Sylhet', weight: 5 },
  { hospital: 'Kea Women Medical College Hospital', district: 'Sylhet', weight: 2 },
  { hospital: 'Rajshahi Medical College Hospital', district: 'Rajshahi', weight: 4 },
  { hospital: 'Khulna Medical College Hospital', district: 'Khulna', weight: 3 },
  { hospital: 'Sher-e-Bangla Medical College Hospital', district: 'Barishal', weight: 3 },
  { hospital: 'Rangpur Medical College Hospital', district: 'Rangpur', weight: 3 },
  { hospital: 'Cumilla Medical College Hospital', district: 'Cumilla', weight: 3 },
  { hospital: 'Sheikh Mainur Rahman Medical College Hospital', district: 'Bogura', weight: 2 },
  { hospital: 'Pabna Medical College Hospital', district: 'Pabna', weight: 2 },
  { hospital: 'Mymensingh Medical College Hospital', district: 'Mymensingh', weight: 3 },
  { hospital: 'Shaheed Suhrawardy Medical College Hospital', district: 'Dhaka', weight: 3 },
];

/**
 * Month weights, January first.
 *
 * Dengue and food-borne illness peak in the June–November monsoon; asthma, COPD
 * and pneumonia climb through the cool December–February months. Spreading every
 * condition evenly would make the 12-month area chart a flat line, which reads as
 * "the dashboard does not work".
 */
const PROFILE_WEIGHTS: Record<SeasonProfile, readonly number[]> = {
  chronic: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  monsoon: [0.2, 0.2, 0.3, 0.4, 0.7, 1.6, 2.6, 2.8, 2.4, 1.6, 0.7, 0.3],
  winter: [2.6, 2.2, 1.2, 0.6, 0.5, 0.5, 0.6, 0.7, 1.0, 1.6, 2.4, 2.8],
  summer: [0.3, 0.4, 0.8, 1.6, 2.2, 2.0, 1.4, 1.0, 0.9, 0.7, 0.4, 0.3],
};

const CONDITION_PROFILE: Record<string, SeasonProfile> = {
  'Dengue Fever': 'monsoon',
  Typhoid: 'monsoon',
  Gastroenteritis: 'monsoon',
  'Acute Watery Diarrhea': 'monsoon',
  Measles: 'monsoon',
  'Fever with Rash': 'monsoon',
  Jaundice: 'monsoon',
  'Urinary Tract Infection': 'monsoon',
  Pneumonia: 'winter',
  Asthma: 'winter',
  'Acute Asthma': 'winter',
  COPD: 'winter',
  Tuberculosis: 'winter',
  'Chronic Bronchitis': 'winter',
  Pleurisy: 'winter',
  'Allergic Rhinitis': 'winter',
  Migraine: 'winter',
  'Atrial Fibrillation': 'winter',
  Cataract: 'summer',
  Conjunctivitis: 'summer',
  'Fungal Infection': 'summer',
  Scabies: 'summer',
  'Acne Vulgaris': 'summer',
  'Kidney Stone': 'summer',
};

/** Senior consultants carry lower BMDC numbers, which is how the register reads. */
function bmdcNumber(experienceYears: number): number {
  const seniority = 58 - experienceYears;
  return Math.floor(1200 + seniority * 820 + rand(0, 700));
}

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

const DOCTOR_TITLES: readonly (readonly [string, number])[] = [
  ['Dr.', 7],
  ['Prof. Dr.', 2],
  ['Assoc. Prof. Dr.', 2],
] as const;

const EMAIL_HOSTS: readonly (readonly [string, number])[] = [
  ['gmail.com', 7],
  ['yahoo.com', 2],
  ['outlook.com', 1],
] as const;

/** O+ and B+ dominate; Rh-negative groups are genuinely rare in this population. */
const BLOOD_WEIGHTS: readonly (readonly [(typeof BLOOD_GROUPS)[number], number])[] = [
  ['O+', 34],
  ['B+', 30],
  ['A+', 13],
  ['O-', 8],
  ['AB+', 6],
  ['B-', 5],
  ['A-', 3],
  ['AB-', 1],
] as const;

const SEVERE_PRONE = new Set([
  'Dengue Fever', 'Ischemic Heart Disease', 'Heart Failure', 'Chronic Kidney Disease',
  'Pneumonia', 'COPD', 'Tuberculosis', 'Cirrhosis', 'Hepatitis B', 'Stroke',
  'Post-Stroke Recovery', 'Breast Cancer', 'Cervical Cancer', 'Lymphoma',
  'Colorectal Cancer', 'Nephrotic Syndrome', 'Malnutrition', 'Measles',
]);

const mobile = () => `+8801${rand(3, 9)}${String(rand(0, 99999999)).padStart(8, '0')}`;

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z]+/g, '.')
    .replace(/^\.|\.$/g, '');

/** OPD sessions run roughly 08:00–20:00, so visit hours are drawn from that window. */
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

const severityFor = (condition: string): Severity =>
  weightedPick(
    SEVERE_PRONE.has(condition)
      ? ([['mild', 2], ['moderate', 4], ['severe', 4]] as const)
      : ([['mild', 6], ['moderate', 3], ['severe', 1]] as const),
  );

function buildDoctors(count: number): Omit<IDoctor, '_id'>[] {
  const seenNames = new Set<string>();
  const seenBmdc = new Set<string>();
  const doctors: Omit<IDoctor, '_id'>[] = [];

  while (doctors.length < count) {
    const specialty = weightedPick(SPECIALTIES.map((item) => [item, item.weight] as const));
    const facility = weightedPick(FACILITIES.map((item) => [item, item.weight] as const));

    const given = Math.random() < 0.55 ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
    const surname = pick(SURNAMES);
    const name = `${weightedPick(DOCTOR_TITLES)} ${given} ${surname}`;
    if (seenNames.has(name)) continue;
    seenNames.add(name);

    const experienceYears = rand(2, 40);
    const reg = Math.random() < 0.75 ? `A-${bmdcNumber(experienceYears)}` : String(bmdcNumber(experienceYears));
    if (seenBmdc.has(reg)) continue;
    seenBmdc.add(reg);

    // Derived from the doctor's own name, so the address and the record agree.
    const givenToken = given.split(' ').at(-1) ?? given;
    const email = `${slug(givenToken)}${slug(surname)}${rand(10, 99)}@${weightedPick(EMAIL_HOSTS)}`;
    const phone = mobile();
    const createdAt = recentDate();
    doctors.push({
      phone,
      name,
      specialization: specialty.name,
      hospital: facility.hospital,
      district: facility.district,
      email,
      degrees: pick(specialty.degrees),
      bmdcRegistration: reg,
      experienceYears,
      searchTerms: doctorSearchTerms({ name, email, bmdcRegistration: reg, phone }),
      createdAt,
      updatedAt: createdAt,
    });
  }

  return doctors;
}

function buildPatients(
  count: number,
  doctors: { _id: unknown; specialization: string }[],
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
    const specialty =
      SPECIALTIES.find((item) => item.name === doctor.specialization) ?? SPECIALTIES[0];

    const condition = pick(specialty.conditions);
    const profile = CONDITION_PROFILE[condition] ?? 'chronic';
    const visitDate = seasonalDate(profile);

    const gender: Gender = specialty.femaleOnly
      ? 'female'
      : Math.random() < 0.5
        ? 'male'
        : Math.random() < 0.98
          ? 'female'
          : 'other';

    const patientName = `${gender === 'male' ? pick(MALE_NAMES) : pick(FEMALE_NAMES)} ${pick(SURNAMES)}`;
    const phone = mobile();

    patients.push({
      name: patientName,
      age: rand(specialty.age[0], specialty.age[1]),
      gender,
      bloodGroup: weightedPick(BLOOD_WEIGHTS),
      condition,
      severity: severityFor(condition),
      phone,
      doctorId: doctor._id as IPatient['doctorId'],
      visitDate,
      searchTerms: patientSearchTerms({ name: patientName, condition, phone }),
      notes:
        Math.random() < 0.35
          ? pick([
              'Referred from upazila health complex; advised to continue medication.',
              'After meal. Follow up after 2 weeks with fresh lab report.',
              'Awaiting ultrasound report before next consultation.',
              'Regular review, condition stable. Next visit in one month.',
              'Second opinion requested by family.',
              'Advised diet and lifestyle changes along with prescription.',
            ])
          : undefined,
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
  // generated data fails at insert time with E11000 instead of as an index-build
  // error after everything has already been written.
  await syncIndexes();

  // `insertMany` skips middleware, so both token arrays are built inside the
  // generators instead of by the model's pre-save hook.
  await Doctor.insertMany(buildDoctors(env.SEED_DOCTORS), { timestamps: false });

  const doctors = await Doctor.find({}, { _id: 1, specialization: 1 }).lean();
  await Patient.insertMany(buildPatients(env.SEED_PATIENTS, doctors), { timestamps: false });

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

  console.log(
    `\nSeeded ${doctorCount} doctors and ${patientCount} patients.\n` +
      `Sign in with ${env.ADMIN_EMAIL} / ${env.ADMIN_PASSWORD}\n`,
  );

  await disconnectDB();
}

seed()
  .then(() => process.exit(0))
  .catch(async (error: unknown) => {
    console.error('Seed failed:', error instanceof Error ? error.message : error);
    await disconnectDB().catch(() => undefined);
    process.exit(1);
  });
