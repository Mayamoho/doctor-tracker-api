/**
 * Clinical reference data for the patient side of the seed.
 *
 * Doctors come from `doctorDirectory.ts` and are real. Patients cannot be: no
 * lawful public source of named Bangladeshi patient records exists — DHS/BDHS,
 * icddr,b and MIMIC all prohibit redistribution, and anything advertising real
 * named patients with diagnoses is unlawfully obtained. So identities here are
 * synthetic, and everything around them is chosen to match the real thing:
 *
 *  - `DISTRICTS` are the official spellings returned by the DGHS Facility Registry
 *    (hrm.dghs.gov.bd/public/facility-registry), which is also where the national
 *    institute names and codes come from.
 *  - `CONDITIONS` use the names a Bangladeshi OPD register actually records, each
 *    with its real ICD-10 chapter code.
 *  - Month weights encode the seasonality Bangladesh actually has — dengue in the
 *    monsoon, asthma/COPD/pneumonia in the cool months — because spreading every
 *    condition evenly would make the dashboard's 12-month chart a flat line.
 *
 * Weights are approximations of published patterns, not measurements. They exist to
 * make the aggregate charts shaped like Bangladesh, and the README says so.
 */

export interface District {
  name: string;
  division: string;
  /** Relative share of the population, so patients are not spread evenly. */
  weight: number;
}

export const DISTRICTS: readonly District[] = [
  { name: 'Dhaka', division: 'Dhaka', weight: 16 },
  { name: 'Chattogram', division: 'Chattogram', weight: 9 },
  { name: 'Cumilla', division: 'Chattogram', weight: 7 },
  { name: 'Rajshahi', division: 'Rajshahi', weight: 6 },
  { name: 'Khulna', division: 'Khulna', weight: 5 },
  { name: 'Kushtia', division: 'Khulna', weight: 4 },
  { name: 'Jhenaidah', division: 'Khulna', weight: 3 },
  { name: 'Sylhet', division: 'Sylhet', weight: 5 },
  { name: 'Mymensingh', division: 'Mymensingh', weight: 5 },
  { name: 'Rangpur', division: 'Rangpur', weight: 5 },
  { name: 'Dinajpur', division: 'Rangpur', weight: 4 },
  { name: 'Bogura', division: 'Rajshahi', weight: 4 },
  { name: 'Pabna', division: 'Rajshahi', weight: 3 },
  { name: 'Narayanganj', division: 'Dhaka', weight: 5 },
  { name: 'Gazipur', division: 'Dhaka', weight: 4 },
  { name: 'Tangail', division: 'Dhaka', weight: 4 },
  { name: 'Kishoreganj', division: 'Dhaka', weight: 3 },
  { name: 'Manikganj', division: 'Dhaka', weight: 2 },
  { name: 'Munshiganj', division: 'Dhaka', weight: 2 },
  { name: 'Faridpur', division: 'Dhaka', weight: 4 },
  { name: 'Gopalganj', division: 'Dhaka', weight: 2 },
  { name: 'Madaripur', division: 'Dhaka', weight: 2 },
  { name: 'Shariatpur', division: 'Dhaka', weight: 2 },
  { name: 'Rajbari', division: 'Dhaka', weight: 1 },
  { name: 'Narsingdi', division: 'Dhaka', weight: 3 },
  { name: 'Brahmanbaria', division: 'Chattogram', weight: 4 },
  { name: 'Noakhali', division: 'Chattogram', weight: 4 },
  { name: "Cox's Bazar", division: 'Chattogram', weight: 3 },
  { name: 'Chandpur', division: 'Chattogram', weight: 3 },
  { name: 'Feni', division: 'Chattogram', weight: 2 },
  { name: 'Bandarban', division: 'Chattogram', weight: 1 },
  { name: 'Jashore', division: 'Khulna', weight: 4 },
  { name: 'Barishal', division: 'Barishal', weight: 4 },
  { name: 'Patuakhali', division: 'Barishal', weight: 2 },
];

export type SeasonProfile = 'chronic' | 'monsoon' | 'winter' | 'summer';

/**
 * Month weights, January first.
 *
 * Dengue and food-borne illness peak in the June–November monsoon; asthma, COPD
 * and pneumonia climb through the cool December–February months.
 */
export const PROFILE_WEIGHTS: Record<SeasonProfile, readonly number[]> = {
  chronic: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  monsoon: [0.2, 0.2, 0.3, 0.4, 0.7, 1.6, 2.6, 2.8, 2.4, 1.6, 0.7, 0.3],
  winter: [2.6, 2.2, 1.2, 0.6, 0.5, 0.5, 0.6, 0.7, 1.0, 1.6, 2.4, 2.8],
  summer: [0.3, 0.4, 0.8, 1.6, 2.2, 2.0, 1.4, 1.0, 0.9, 0.7, 0.4, 0.3],
};

export interface Condition {
  name: string;
  /** ICD-10 code as a Bangladeshi OPD card would record it. */
  icd10: string;
  profile: SeasonProfile;
  /** Share of this specialty's caseload. */
  weight: number;
  age: readonly [number, number];
  severeProne?: boolean;
  femaleOnly?: boolean;
  maleOnly?: boolean;
}

/**
 * Keyed on the specialty labels the directories actually use — `Child`, not
 * "Pediatrics", `Gynae & Obs`, not "OB/GYN" — because the dashboard groups patients
 * by their doctor's specialization and the two vocabularies have to agree.
 */
export const CONDITIONS_BY_SPECIALTY: Readonly<Record<string, readonly Condition[]>> = {
  Cardiology: [
    { name: 'Hypertension', icd10: 'I10', profile: 'chronic', weight: 30, age: [30, 85] },
    { name: 'Ischemic Heart Disease', icd10: 'I25.1', profile: 'chronic', weight: 22, age: [40, 88], severeProne: true },
    { name: 'Type 2 Diabetes', icd10: 'E11.9', profile: 'chronic', weight: 14, age: [35, 80] },
    { name: 'Atrial Fibrillation', icd10: 'I48', profile: 'winter', weight: 8, age: [45, 85], severeProne: true },
    { name: 'Heart Failure', icd10: 'I50', profile: 'winter', weight: 8, age: [40, 88], severeProne: true },
    { name: 'Rheumatic Heart Disease', icd10: 'I09', profile: 'winter', weight: 7, age: [15, 60], severeProne: true },
    { name: 'Dyslipidemia', icd10: 'E78.5', profile: 'chronic', weight: 6, age: [30, 75] },
    { name: 'Acute Asthma Attack', icd10: 'J45.0', profile: 'winter', weight: 5, age: [16, 70], severeProne: true },
  ],
  'Cardiac Surgery': [
    { name: 'Ischemic Heart Disease', icd10: 'I25.1', profile: 'chronic', weight: 30, age: [40, 80], severeProne: true },
    { name: 'Rheumatic Heart Disease', icd10: 'I09', profile: 'winter', weight: 25, age: [18, 65], severeProne: true },
    { name: 'Congenital Heart Disease', icd10: 'Q24.9', profile: 'chronic', weight: 20, age: [1, 40], severeProne: true },
    { name: 'Valve Replacement Follow-up', icd10: 'Z95.2', profile: 'chronic', weight: 15, age: [25, 75] },
    { name: 'Aortic Aneurysm', icd10: 'I71.9', profile: 'chronic', weight: 10, age: [40, 80], severeProne: true },
  ],
  Nephrology: [
    { name: 'Chronic Kidney Disease', icd10: 'N18.9', profile: 'chronic', weight: 30, age: [20, 80], severeProne: true },
    { name: 'Type 2 Diabetes', icd10: 'E11.9', profile: 'chronic', weight: 20, age: [35, 80] },
    { name: 'Urinary Tract Infection', icd10: 'N39.0', profile: 'monsoon', weight: 16, age: [16, 80] },
    { name: 'Nephrotic Syndrome', icd10: 'N04', profile: 'chronic', weight: 12, age: [4, 60], severeProne: true },
    { name: 'Kidney Stone', icd10: 'N20.0', profile: 'summer', weight: 12, age: [18, 65] },
    { name: 'Acute Kidney Injury', icd10: 'N17.9', profile: 'monsoon', weight: 10, age: [10, 80], severeProne: true },
  ],
  Urology: [
    { name: 'BPH', icd10: 'N40', profile: 'chronic', weight: 30, age: [50, 85], maleOnly: true },
    { name: 'Kidney Stone', icd10: 'N20.0', profile: 'summer', weight: 25, age: [18, 60] },
    { name: 'Urinary Tract Infection', icd10: 'N39.0', profile: 'monsoon', weight: 20, age: [16, 80] },
    { name: 'Prostatitis', icd10: 'N41', profile: 'chronic', weight: 15, age: [30, 70], maleOnly: true },
    { name: 'Benign Prostate Bleeding', icd10: 'N40', profile: 'chronic', weight: 10, age: [55, 85], maleOnly: true },
  ],
  Neurosurgery: [
    { name: 'Head Injury', icd10: 'S06', profile: 'chronic', weight: 28, age: [8, 65], severeProne: true },
    { name: 'Cervical Spondylosis', icd10: 'M47.8', profile: 'chronic', weight: 20, age: [30, 75] },
    { name: 'Brain Tumour', icd10: 'D43', profile: 'chronic', weight: 18, age: [10, 70], severeProne: true },
    { name: 'Post-Stroke Recovery', icd10: 'I69', profile: 'winter', weight: 18, age: [40, 85], severeProne: true },
    { name: 'Slipped Disc', icd10: 'M51', profile: 'chronic', weight: 16, age: [25, 70] },
  ],
  'Plastic & Aesthetic Surgery': [
    { name: 'Burn Injury', icd10: 'T30', profile: 'summer', weight: 30, age: [2, 60], severeProne: true },
    { name: 'Cleft Lip Repair Follow-up', icd10: 'Q36', profile: 'chronic', weight: 22, age: [0, 18] },
    { name: 'Skin Graft Review', icd10: 'Z42', profile: 'chronic', weight: 20, age: [10, 65] },
    { name: 'Post-Mastectomy Reconstruction', icd10: 'Z42.1', profile: 'chronic', weight: 14, age: [30, 70], femaleOnly: true },
    { name: 'Facial Trauma', icd10: 'S01', profile: 'chronic', weight: 14, age: [10, 55], severeProne: true },
  ],
  'Orthopedic Surgery': [
    { name: 'Osteoarthritis', icd10: 'M17', profile: 'winter', weight: 26, age: [40, 85] },
    { name: 'Back Pain', icd10: 'M54.9', profile: 'chronic', weight: 22, age: [22, 70] },
    { name: 'Fracture Follow-up', icd10: 'Z04.1', profile: 'summer', weight: 20, age: [8, 75] },
    { name: 'Slipped Disc', icd10: 'M51', profile: 'chronic', weight: 12, age: [25, 65] },
    { name: 'Frozen Shoulder', icd10: 'M75.0', profile: 'winter', weight: 10, age: [40, 70] },
    { name: 'Genu Valgum', icd10: 'M20.2', profile: 'chronic', weight: 10, age: [5, 20] },
  ],
  'General Surgery': [
    { name: 'Hernia', icd10: 'K40', profile: 'chronic', weight: 28, age: [18, 75], maleOnly: true },
    { name: 'Gall Stone', icd10: 'K80.2', profile: 'chronic', weight: 22, age: [25, 70], femaleOnly: true },
    { name: 'Piles', icd10: 'K64', profile: 'monsoon', weight: 20, age: [20, 65] },
    { name: 'Thyroid Nodule', icd10: 'E04.1', profile: 'chronic', weight: 16, age: [20, 60], femaleOnly: true },
    { name: 'Appendicitis Follow-up', icd10: 'K35.8', profile: 'chronic', weight: 14, age: [10, 50] },
  ],
  'Colorectal Surgery': [
    { name: 'Piles', icd10: 'K64', profile: 'monsoon', weight: 28, age: [20, 65] },
    { name: 'Fistula in Ano', icd10: 'K60.3', profile: 'chronic', weight: 24, age: [20, 55] },
    { name: 'Colorectal Cancer', icd10: 'C18.9', profile: 'chronic', weight: 20, age: [35, 80], severeProne: true },
    { name: 'Chronic Constipation', icd10: 'K59.0', profile: 'chronic', weight: 16, age: [25, 75] },
    { name: 'Diverticular Disease', icd10: 'K57.9', profile: 'chronic', weight: 12, age: [40, 80] },
  ],
  Gastroenterology: [
    { name: 'Gastric Ulcer', icd10: 'K25', profile: 'winter', weight: 22, age: [20, 70] },
    { name: 'Jaundice', icd10: 'R10', profile: 'monsoon', weight: 20, age: [8, 70], severeProne: true },
    { name: 'Hepatitis B', icd10: 'B16.9', profile: 'monsoon', weight: 16, age: [18, 65], severeProne: true },
    { name: 'GERD', icd10: 'K21', profile: 'chronic', weight: 14, age: [22, 70] },
    { name: 'Cirrhosis', icd10: 'K74.6', profile: 'chronic', weight: 12, age: [30, 70], severeProne: true },
    { name: 'Gastroenteritis', icd10: 'K52.9', profile: 'monsoon', weight: 12, age: [5, 70] },
    { name: 'Irritable Bowel', icd10: 'K58', profile: 'chronic', weight: 8, age: [18, 55] },
  ],
  Pulmonology: [
    { name: 'Asthma', icd10: 'J45.9', profile: 'winter', weight: 28, age: [8, 70] },
    { name: 'COPD', icd10: 'J44.9', profile: 'winter', weight: 24, age: [45, 85], severeProne: true },
    { name: 'Tuberculosis', icd10: 'A15', profile: 'winter', weight: 20, age: [15, 70], severeProne: true },
    { name: 'Pneumonia', icd10: 'J18.9', profile: 'winter', weight: 16, age: [2, 85], severeProne: true },
    { name: 'Chronic Bronchitis', icd10: 'J41', profile: 'winter', weight: 12, age: [30, 78] },
  ],
  ENT: [
    { name: 'Chronic Sinusitis', icd10: 'J32', profile: 'winter', weight: 24, age: [10, 70] },
    { name: 'Tonsillitis', icd10: 'J03', profile: 'winter', weight: 22, age: [4, 40] },
    { name: 'Allergic Rhinitis', icd10: 'J30.1', profile: 'winter', weight: 20, age: [8, 60] },
    { name: 'Hearing Loss', icd10: 'H91.9', profile: 'chronic', weight: 14, age: [20, 80] },
    { name: 'Vertigo', icd10: 'H81.1', profile: 'chronic', weight: 10, age: [25, 75] },
    { name: 'Adenoid Hypertrophy', icd10: 'J35.2', profile: 'winter', weight: 10, age: [3, 15] },
  ],
  Eye: [
    { name: 'Cataract', icd10: 'H26.9', profile: 'summer', weight: 30, age: [50, 88] },
    { name: 'Diabetic Retinopathy', icd10: 'H36.0', profile: 'chronic', weight: 22, age: [30, 75] },
    { name: 'Refractive Error', icd10: 'H52', profile: 'chronic', weight: 20, age: [8, 55] },
    { name: 'Conjunctivitis', icd10: 'H10', profile: 'summer', weight: 16, age: [4, 70] },
    { name: 'Glaucoma', icd10: 'H40', profile: 'chronic', weight: 12, age: [40, 85], severeProne: true },
  ],
  'Dermatology & VD': [
    { name: 'Fungal Infection', icd10: 'B35', profile: 'summer', weight: 28, age: [12, 60] },
    { name: 'Scabies', icd10: 'B86', profile: 'summer', weight: 20, age: [5, 60] },
    { name: 'Acne Vulgaris', icd10: 'L70', profile: 'summer', weight: 20, age: [13, 35] },
    { name: 'Eczema', icd10: 'L30', profile: 'winter', weight: 18, age: [3, 65] },
    { name: 'Psoriasis', icd10: 'L40', profile: 'winter', weight: 14, age: [15, 70] },
  ],
  Child: [
    { name: 'Acute Watery Diarrhea', icd10: 'A09', profile: 'monsoon', weight: 26, age: [1, 12], severeProne: true },
    { name: 'Pneumonia', icd10: 'J18.9', profile: 'winter', weight: 24, age: [1, 12], severeProne: true },
    { name: 'Acute Asthma', icd10: 'J45.0', profile: 'winter', weight: 16, age: [3, 14] },
    { name: 'Measles', icd10: 'B05', profile: 'monsoon', weight: 12, age: [1, 10], severeProne: true },
    { name: 'Malnutrition', icd10: 'E46', profile: 'chronic', weight: 12, age: [1, 12], severeProne: true },
    { name: 'Fever with Rash', icd10: 'R50.9', profile: 'monsoon', weight: 10, age: [1, 12] },
  ],
  'Pediatric Surgery': [
    { name: 'Congenital Heart Disease', icd10: 'Q24.9', profile: 'chronic', weight: 20, age: [0, 14], severeProne: true },
    { name: 'Intussusception', icd10: 'K56.1', profile: 'monsoon', weight: 20, age: [0, 6], severeProne: true },
    { name: 'Hydrocele', icd10: 'N43', profile: 'chronic', weight: 20, age: [1, 15], maleOnly: true },
    { name: 'Pediatric Hernia', icd10: 'K40.9', profile: 'chronic', weight: 20, age: [1, 14], maleOnly: true },
    { name: 'Circumcision Review', icd10: 'N48', profile: 'chronic', weight: 20, age: [2, 16], maleOnly: true },
  ],
  'Gynae & Obs': [
    { name: 'Anemia in Pregnancy', icd10: 'O99.0', profile: 'chronic', weight: 26, age: [18, 42], femaleOnly: true, severeProne: true },
    { name: 'Ante-natal Check-up', icd10: 'Z34', profile: 'chronic', weight: 24, age: [18, 40], femaleOnly: true },
    { name: 'PCOS', icd10: 'E28.2', profile: 'chronic', weight: 18, age: [16, 40], femaleOnly: true },
    { name: 'Menstrual Disorder', icd10: 'N91', profile: 'chronic', weight: 16, age: [15, 50], femaleOnly: true },
    { name: 'Uterine Fibroid', icd10: 'D25', profile: 'chronic', weight: 10, age: [25, 55], femaleOnly: true },
    { name: 'Ovarian Cyst', icd10: 'N83', profile: 'chronic', weight: 6, age: [18, 55], femaleOnly: true },
  ],
  Psychiatry: [
    { name: 'Depressive Disorder', icd10: 'F32', profile: 'winter', weight: 32, age: [16, 65] },
    { name: 'Generalized Anxiety', icd10: 'F41.1', profile: 'chronic', weight: 26, age: [16, 60] },
    { name: 'Insomnia', icd10: 'F51.0', profile: 'chronic', weight: 20, age: [20, 70] },
    { name: 'Panic Disorder', icd10: 'F41.0', profile: 'chronic', weight: 12, age: [18, 50] },
    { name: 'Substance Use Disorder', icd10: 'F19', profile: 'chronic', weight: 10, age: [18, 55], severeProne: true },
  ],
  'Anesthesia & Pain Medicine': [
    { name: 'Low Back Pain', icd10: 'M54.5', profile: 'chronic', weight: 30, age: [25, 75] },
    { name: 'Neuropathic Pain', icd10: 'G89', profile: 'chronic', weight: 22, age: [30, 80] },
    { name: 'Migraine', icd10: 'G43', profile: 'winter', weight: 20, age: [14, 60], femaleOnly: true },
    { name: 'Frozen Shoulder', icd10: 'M75.0', profile: 'winter', weight: 14, age: [40, 70] },
    { name: 'Pre-Ananaesthesia Check-up', icd10: 'Z01.8', profile: 'chronic', weight: 14, age: [18, 75] },
  ],
};

/** Conditions a general-medicine register sees, used when a specialty has no table. */
export const FALLBACK_CONDITIONS: readonly Condition[] = [
  { name: 'Hypertension', icd10: 'I10', profile: 'chronic', weight: 26, age: [30, 85] },
  { name: 'Type 2 Diabetes', icd10: 'E11.9', profile: 'chronic', weight: 24, age: [25, 80] },
  { name: 'Dengue Fever', icd10: 'A90', profile: 'monsoon', weight: 20, age: [8, 70], severeProne: true },
  { name: 'Typhoid', icd10: 'A01.0', profile: 'monsoon', weight: 14, age: [8, 50], severeProne: true },
  { name: 'Gastroenteritis', icd10: 'K52.9', profile: 'monsoon', weight: 10, age: [3, 70] },
  { name: 'Iron Deficiency Anemia', icd10: 'D50.9', profile: 'chronic', weight: 6, age: [12, 60], femaleOnly: true },
];
