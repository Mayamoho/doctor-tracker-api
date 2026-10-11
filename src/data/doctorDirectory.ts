/**
 * Real doctors, copied from two public Bangladeshi medical directories.
 *
 * Every row below was read off a rendered page — nothing here is generated. Where a
 * source did not print a field the record is omitted rather than filled in, which is
 * why this list is shorter than the sites it came from: only entries with name,
 * degrees, specialty, institution, district *and* BMDC number are seedable, because
 * `Doctor` requires all six and `bmdcRegistration` is unique.
 *
 * Normalisations applied, and nothing else:
 *  - BMDC spacing: the sites print `A - 36364`, `A34625`, `-A 53953`. Stored in the
 *    canonical `A-36364` form the API's `bmdcSchema` expects.
 *  - District spellings follow the current official ones: Comilla → Cumilla,
 *    Chittagong → Chattogram, Jessore → Jashore, Bogra → Bogura.
 *  - Degrees printed without separators (`MBBS BCS MCPS FCPS`) are comma-separated.
 *  - Trailing designations inside the degrees string (`; Registrar (Medicine)`) are
 *    dropped — they describe the post, not the qualification.
 *  - A handful of cards print no district. It is filled in only where the named
 *    institution has one fixed site (NIDCH, BSMMU, AKMCH, ShSMC, NINCAS are in
 *    Dhaka), never where it could plausibly be a chamber the doctor shares.
 *  - Mixed-script rows are dropped: two entries published their degrees in Bangla
 *    and transliterating them would be inventing text.
 *
 * Deliberately NOT copied: phone numbers and emails. Both directories publish
 * chamber and personal contact details for these doctors on public pages;
 * re-publishing them against a demo register would route spam to real people, and
 * inventing substitute numbers would put false contact data on real names. Contacts
 * are seeded as `NOT_PUBLISHED` so the UI can say so honestly.
 */

export const NOT_PUBLISHED = 'not published';

export interface DirectoryDoctor {
  name: string;
  degrees: string;
  specialization: string;
  hospital: string;
  district: string;
  bmdc: string;
  /** Which directory the row came from, for the provenance note in the README. */
  source: 'bddoctorsdirectory.com' | 'doctorbangladesh.com';
}

export const DIRECTORY_DOCTORS: readonly DirectoryDoctor[] = [
  // ── Cardiology ────────────────────────────────────────────────────────────────
  {
    name: 'Prof. Dr. Md. Sahabuddin Khan',
    degrees:
      'MBBS (DMC), MCPS (Medicine), MD (Cardiology), PhD, MRCP (Ireland), FRCP (Ireland), FRCP (Glasgow), DSC (Cardiology), Fellow-Interventional Cardiology (India)',
    specialization: 'Cardiology',
    hospital: 'Al-Helal Specialized Hospital Ltd.',
    district: 'Dhaka',
    bmdc: 'A-11606',
    source: 'doctorbangladesh.com',
  },
  {
    name: 'Dr. Kaiser Nasrullah Khan',
    degrees: 'MBBS, FCPS (Medicine), MD (Cardiology), Fellow Interventional Cardiology',
    specialization: 'Cardiology',
    hospital: 'United Hospital Limited',
    district: 'Dhaka',
    bmdc: 'A-21955',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. S Chakrabarty',
    degrees: 'MBBS (DMC), MD Cardiology (Ukraine), FSCAI',
    specialization: 'Cardiology',
    hospital: 'Delta Hospital Ltd.',
    district: 'Dhaka',
    bmdc: 'A-32276',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Mehedi Hassan',
    degrees: 'MBBS, BCS (Health), FCPS (Medicine), MD (Cardiology)',
    specialization: 'Cardiology',
    hospital: 'National Institute of Cardiovascular Diseases (NICVD)',
    district: 'Dhaka',
    bmdc: 'A-50145',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Nasir Uddin Sagar',
    degrees: 'MBBS, MD (Cardiology), BCS (Health), MACP (USA), CCD',
    specialization: 'Cardiology',
    hospital: 'Dhaka Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-63780',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Mohasin Uddin',
    degrees: 'MBBS, D-CARD (BMU), MRCP (UK), MACC (USA), FSCAI (USA)',
    specialization: 'Cardiology',
    hospital: 'Labaid Cardiac Hospital',
    district: 'Dhaka',
    bmdc: 'A-70827',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Tarikul Islam',
    degrees: 'MBBS (DMC), BCS (Health), CCD (BIRDEM), FCPS (Cardiology, FP)',
    specialization: 'Cardiology',
    hospital: 'Dhaka Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-106506',
    source: 'doctorbangladesh.com',
  },
  {
    name: 'Dr. Bishnu Pada Saha',
    degrees: 'MBBS, BCS (Health), MD (Cardiology), MACC (USA), MACP (USA)',
    specialization: 'Cardiology',
    hospital: 'Khulna Specialized Hospital',
    district: 'Khulna',
    bmdc: 'A-43026',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Md. Asifudduza Asif',
    degrees: 'MBBS, MD (Cardiology)',
    specialization: 'Cardiology',
    hospital: 'Labaid Cardiac Hospital',
    district: 'Dhaka',
    bmdc: 'A-57930',
    source: 'bddoctorsdirectory.com',
  },

  // ── Cardiac surgery ───────────────────────────────────────────────────────────
  {
    name: 'Professor Dr. Istiaq Ahmed Dipu',
    degrees: 'MBBS (DMC), BCS (Health), MS (CVTS)',
    specialization: 'Cardiac Surgery',
    hospital: 'Dhaka Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-29076',
    source: 'bddoctorsdirectory.com',
  },

  // ── Nephrology ────────────────────────────────────────────────────────────────
  {
    name: 'Dr. Zayeed Ahsan',
    degrees: 'MBBS, FCPS (Nephrology)',
    specialization: 'Nephrology',
    hospital: 'National Institute of Kidney Disease and Urology (NIKDU)',
    district: 'Dhaka',
    bmdc: 'A-43004',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. A S M Julfekar Helal',
    degrees: 'MBBS (CMC), MD (Nephrology)',
    specialization: 'Nephrology',
    hospital: 'Labaid Specialized Hospital',
    district: 'Dhaka',
    bmdc: 'A-43039',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Abdus Salam Osmani',
    degrees: 'MBBS, MD (Nephrology)',
    specialization: 'Nephrology',
    hospital: 'National Institute of Kidney Disease and Urology (NIKDU)',
    district: 'Dhaka',
    bmdc: 'A-28914',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Azizur Rahman',
    degrees: 'MBBS, MD (Pediatric Nephrology)',
    specialization: 'Nephrology',
    hospital: 'Combined Military Hospital (CMH)',
    district: 'Dhaka',
    bmdc: 'A-51337',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Bilash Kumar Saha',
    degrees: 'MBBS (CMC), BCS (30th Health), MD (Nephrology) (BMU)',
    specialization: 'Nephrology',
    hospital: 'Upazila Health Complex, Bogura',
    district: 'Bogura',
    bmdc: 'A-55473',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Prof. Dr. Tridip Kanti Barman',
    degrees: 'MBBS, FCPS (Medicine), MD (Nephrology)',
    specialization: 'Nephrology',
    hospital: 'Mymensingh Medical College Hospital',
    district: 'Mymensingh',
    bmdc: 'A-35419',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Zobaida Khanam Chowdhury',
    degrees: 'MBBS (AFMC), MD (Nephrology)',
    specialization: 'Nephrology',
    hospital: 'Shaheed Monsur Ali Medical College',
    district: 'Dhaka',
    bmdc: 'A-47781',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Rafi Nazrul Islam',
    degrees: 'MBBS, MRCP (Medicine), MD (Nephrology)',
    specialization: 'Nephrology',
    hospital: 'BIRDEM General Hospital',
    district: 'Dhaka',
    bmdc: 'A-46855',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Masudul Karim',
    degrees: 'MBBS, MRCP, MD (Nephrology)',
    specialization: 'Nephrology',
    hospital: 'Bangabandhu Medical University (BMU)',
    district: 'Dhaka',
    bmdc: 'A-71512',
    source: 'bddoctorsdirectory.com',
  },

  // ── Urology ───────────────────────────────────────────────────────────────────
  {
    name: 'Dr. A. H. M. Afzalul Haque Rana',
    degrees: 'MBBS (DMC), MS (Urology), Diploma Endourology',
    specialization: 'Urology',
    hospital: 'M.H. Samorita Hospital & Medical College',
    district: 'Dhaka',
    bmdc: 'A-37023',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Arafat Hossain',
    degrees: 'MBBS, BCS (Health), MS (Urology)',
    specialization: 'Urology',
    hospital: 'Dhaka Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-45181',
    source: 'bddoctorsdirectory.com',
  },

  // ── Neurosurgery & neurology ──────────────────────────────────────────────────
  {
    name: 'Prof. Dr. Md. Shafiqul Islam',
    degrees: 'MBBS (DMC), MS, PhD (Japan)',
    specialization: 'Neurosurgery',
    hospital: 'Dhaka Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-22578',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Prof. Dr. A. F. M. Momtazul Haque',
    degrees: 'MBBS (DMC), BCS (Health), MS (Neurosurgery)',
    specialization: 'Neurosurgery',
    hospital: 'Dhaka Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-32045',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Professor Dr. Md. Zahid Raihan',
    degrees: 'MBBS, MS (Neurosurgery), Academic Fellow (Oxford)',
    specialization: 'Neurosurgery',
    hospital: 'Directorate General of Health Services (DGHS)',
    district: 'Dhaka',
    bmdc: 'A-23247',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. M M Hasan Shiplu',
    degrees: 'MBBS, MS (Neurosurgery)',
    specialization: 'Neurosurgery',
    hospital: 'Dhaka Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-36364',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Shahnawas Biswas',
    degrees: 'MBBS (DMC), MS (Neurosurgery), BCS (Health)',
    specialization: 'Neurosurgery',
    hospital: 'Dhaka Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-66694',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Md. Mahbub Hasan Amil',
    degrees: 'MBBS (DU), BCS (Health), MS (Neurosurgery)',
    specialization: 'Neurosurgery',
    hospital: 'Sir Salimullah Medical College (Mitford Hospital)',
    district: 'Dhaka',
    bmdc: 'A-62966',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Tauhidur Rahman',
    degrees: 'MBBS, BCS (Health), MS (Neurosurgery)',
    specialization: 'Neurosurgery',
    hospital: 'Sylhet MAG Osmani Medical College and Hospital',
    district: 'Sylhet',
    bmdc: 'A-69483',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Ziauddin',
    degrees: 'MBBS, BCS (Health), MS (Neurosurgery)',
    specialization: 'Neurosurgery',
    hospital: 'National Institute of Neurosciences and Hospital',
    district: 'Dhaka',
    bmdc: 'A-51033',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Tanvir Hasan Mojumdar',
    degrees: 'MBBS, BCS (Health), MS (Neurosurgery)',
    specialization: 'Neurosurgery',
    hospital: 'Dhaka Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-59716',
    source: 'bddoctorsdirectory.com',
  },

  // ── Plastic, orthopedic and general surgery ───────────────────────────────────
  {
    name: 'Professor Dr. Sayeed Ahmed Siddiky',
    degrees: 'MBBS, FRCS (Glasgow), FCPS (Surgery), FACS (USA)',
    specialization: 'Plastic & Aesthetic Surgery',
    hospital: 'Bangladesh Specialized Hospital',
    district: 'Dhaka',
    bmdc: 'A-10762',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Prof. Dr. Mohammad Nashir Uddin',
    degrees: 'MBBS, FCPS (Surgery), MS (Plastic Surgery), FRCS (Glasgow), FACS (USA)',
    specialization: 'Plastic & Aesthetic Surgery',
    hospital: 'National Institute of Burn and Plastic Surgery',
    district: 'Dhaka',
    bmdc: 'A-23801',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Prof. Dr. Bijoy Krishna Das',
    degrees: 'MBBS, MCPS, MS, FICS, FACS (USA)',
    specialization: 'Plastic & Aesthetic Surgery',
    hospital: 'Evercare Hospital Dhaka',
    district: 'Dhaka',
    bmdc: 'A-16886',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Chowdhury Rashedul Mughni',
    degrees: 'MBBS (AFMC), MRCS (England), MRCSEd, FCPS (Plastic & Reconstructive Surgery)',
    specialization: 'Plastic & Aesthetic Surgery',
    hospital: 'Ekagra Health, Dhanmondi',
    district: 'Dhaka',
    bmdc: 'A-41174',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Mohammad Yousuf Ali',
    degrees: 'MBBS, BCS (Health), FCPS (Surgery), MS (Plastic Surgery)',
    specialization: 'Plastic & Aesthetic Surgery',
    hospital: 'Rajshahi Medical College Hospital',
    district: 'Rajshahi',
    bmdc: 'A-48305',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Alamgir Hossain Jony',
    degrees: 'MBBS, BCS (Health), MS (Ortho)',
    specialization: 'Orthopedic Surgery',
    hospital: 'National Institute of Traumatology and Orthopaedic Rehabilitation (NITOR)',
    district: 'Dhaka',
    bmdc: 'A-32769',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Kh. Nafiz Rahman',
    degrees: 'MBBS, BCS (Health), D-Ortho, FCPS (Ortho), FACS, AO Trauma',
    specialization: 'Orthopedic Surgery',
    hospital: 'National Institute of Traumatology and Orthopaedic Rehabilitation (NITOR)',
    district: 'Dhaka',
    bmdc: 'A-56244',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Faridul Islam',
    degrees: 'MBBS, BCS (Health), MS (Orthopedics), PhD (Spine Surgery), FICS, FACS',
    specialization: 'Orthopedic Surgery',
    hospital: 'Noakhali Medical College',
    district: 'Noakhali',
    bmdc: 'A-36060',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. S. M. Mostafa Sarwar Sadek',
    degrees: 'MBBS, D-Ortho, CCD (BIRDEM), AO Trauma',
    specialization: 'Orthopedic Surgery',
    hospital: 'Combined Military Hospital, Ramu Cantonment',
    district: "Cox's Bazar",
    bmdc: 'A-63547',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. A K M Lutful Haque',
    degrees: 'BMBS, BCS (Health), MS (Surgery)',
    specialization: 'General Surgery',
    hospital: 'Kurmitola Multicare Specialized Hospital',
    district: 'Dhaka',
    bmdc: 'A-50481',
    source: 'doctorbangladesh.com',
  },

  // ── Colorectal surgery ────────────────────────────────────────────────────────
  {
    name: 'Dr. Golam Mustafa',
    degrees: 'MBBS, MRCS (UK), FCPS (Surgery), MS (Colorectal Surgery)',
    specialization: 'Colorectal Surgery',
    hospital: 'Dhaka Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-40792',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Professor Dr. Md. Abdul Wohab Khan',
    degrees: 'MBBS, FCPS (Surgery), MMed (Gold Medalist)',
    specialization: 'Colorectal Surgery',
    hospital: 'Bangladesh Medical University (PG Hospital)',
    district: 'Dhaka',
    bmdc: 'A-15918',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Ishtiaq Alam',
    degrees: 'MBBS, BCS (Health), FCPS (Surgery), FACS (USA), MS (Colorectal Surgery)',
    specialization: 'Colorectal Surgery',
    hospital: 'Sylhet MAG Osmani Medical College and Hospital',
    district: 'Sylhet',
    bmdc: 'A-37370',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Mohammad Wazibullaha',
    degrees: 'MBBS, BCS (Health), MCPS (Surgery), MRCS, MS (Colorectal Surgery)',
    specialization: 'Colorectal Surgery',
    hospital: 'Sir Salimullah Medical College (Mitford Hospital)',
    district: 'Dhaka',
    bmdc: 'A-62212',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. A. K. M. Shamsul Haque',
    degrees: 'MBBS, FCPS (Surgery)',
    specialization: 'Colorectal Surgery',
    hospital: 'Pabna Medical College',
    district: 'Pabna',
    bmdc: 'A-29389',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Mohd. Mejbahul Bahar',
    degrees: 'MBBS, FCPS (General Surgery), FCPS (Colorectal), MRCS, FRCS (Edinburgh)',
    specialization: 'Colorectal Surgery',
    hospital: 'Shaheed Suhrawardy Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-31029',
    source: 'bddoctorsdirectory.com',
  },

  // ── Gastroenterology & hepatology ─────────────────────────────────────────────
  {
    name: 'Dr. Farhad Hossain Md. Shahed',
    degrees: 'MBBS, BCS (Health), MACP (USA), MRCP (UK), MD (Hepatology), PhD (USA)',
    specialization: 'Gastroenterology',
    hospital: 'Dhaka Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-26972',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Shahin Dhali',
    degrees: 'MBBS, BCS (Health), MD (Gastroenterology), MACP, CCD',
    specialization: 'Gastroenterology',
    hospital: '250 Bedded General Hospital, Jhenaidah',
    district: 'Jhenaidah',
    bmdc: 'A-68372',
    source: 'bddoctorsdirectory.com',
  },

  // ── Chest, asthma and allergy ─────────────────────────────────────────────────
  {
    name: 'Dr. Md. Shafiqul Islam Dewan',
    degrees: 'MBBS, BCS (Health), MD (Pulmonology), MACP (USA)',
    specialization: 'Pulmonology',
    hospital: 'National Institute of Diseases of the Chest & Hospital (NIDCH)',
    district: 'Dhaka',
    bmdc: 'A-63752',
    source: 'bddoctorsdirectory.com',
  },

  // ── ENT ───────────────────────────────────────────────────────────────────────
  {
    name: 'Prof. (Brig. Gen.) Dr. Md. Bashir Ahmed',
    degrees: 'MBBS, MCPS, DLO, FCPS, FACS',
    specialization: 'ENT',
    hospital: 'Combined Military Hospital (CMH)',
    district: 'Dhaka',
    bmdc: 'A-26999',
    source: 'doctorbangladesh.com',
  },
  {
    name: 'Professor Dr. Ahmed Rakib',
    degrees: 'MBBS, DLO, MS (ENT)',
    specialization: 'ENT',
    hospital: 'Popular Medical College & Hospital',
    district: 'Dhaka',
    bmdc: 'A-22358',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. K. M. Nurul Alam',
    degrees: 'MBBS (DMC), FCPS, MS (ENT & Head-Neck Cancer Surgery)',
    specialization: 'ENT',
    hospital: 'Sir Salimullah Medical College (Mitford Hospital)',
    district: 'Dhaka',
    bmdc: 'A-30478',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Prof. Dr. A. H. M. Delwar',
    degrees: 'MBBS, MCPS, DLO, FICS, MRCP (ENT), MD (Audiology)',
    specialization: 'ENT',
    hospital: 'Cumilla Medical College',
    district: 'Cumilla',
    bmdc: 'A-21122',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Jahid Hussain',
    degrees: 'MBBS, BCS (Health), CCD, DLO',
    specialization: 'ENT',
    hospital: 'Noorjahan Hospital',
    district: 'Sylhet',
    bmdc: 'A-50480',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Mahedi Mannan',
    degrees: 'MBBS, FCPS (ENT & Head Neck Surgery)',
    specialization: 'ENT',
    hospital: 'ENT and Head Neck Cancer Hospital & Institute',
    district: 'Dhaka',
    bmdc: 'A-53953',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Hasan Hafijur Rahman',
    degrees: 'MBBS (KMC), DLO, MRCS',
    specialization: 'ENT',
    hospital: 'Dhaka Community Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-71446',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. S. M. Saadat Rabbani',
    degrees: 'MBBS, BCS (Health), DLO (ENT)',
    specialization: 'ENT',
    hospital: 'Bangabandhu Medical University (BMU)',
    district: 'Dhaka',
    bmdc: 'A-70226',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Tahsin Ahmed Nafi',
    degrees: 'MBBS (DMC), BCS (Health), DLO (BMU)',
    specialization: 'ENT',
    hospital: 'Bangabandhu Medical University (BMU)',
    district: 'Dhaka',
    bmdc: 'A-101328',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Razib Hossain Raju',
    degrees: 'MBBS (DU), BCS (Health), DLO, FCPS (ENT)',
    specialization: 'ENT',
    hospital: 'Shaheed Tajuddin Ahmad Medical College Hospital',
    district: 'Gazipur',
    bmdc: 'A-87461',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Md. Akimul Islam Mohon',
    degrees: 'MBBS, BCS (Health), MS (ENT)',
    specialization: 'ENT',
    hospital: 'Rangpur Medical College Hospital',
    district: 'Rangpur',
    bmdc: 'A-65857',
    source: 'bddoctorsdirectory.com',
  },

  // ── Ophthalmology ─────────────────────────────────────────────────────────────
  {
    name: 'Dr. Jamsed Faridi Jami',
    degrees: 'MBBS (DU), D-OPHTH (BSMMU), CCD (BIRDEM)',
    specialization: 'Eye',
    hospital: 'Vision Eye Hospital',
    district: 'Dhaka',
    bmdc: 'A-54187',
    source: 'doctorbangladesh.com',
  },

  // ── Dermatology & VD ──────────────────────────────────────────────────────────
  {
    name: 'Dr. Iftekhar Shwapan',
    degrees: 'MBBS, MD (Dermatology)',
    specialization: 'Dermatology & VD',
    hospital: 'Sir Salimullah Medical College (Mitford Hospital)',
    district: 'Dhaka',
    bmdc: 'A-17385',
    source: 'bddoctorsdirectory.com',
  },

  // ── Paediatrics ───────────────────────────────────────────────────────────────
  {
    name: 'Dr. Monzurul Karim',
    degrees: 'MBBS, DCH, IPPC (Australia), MD (Pediatrics)',
    specialization: 'Child',
    hospital: 'Institute of Child & Mother Health (ICMH)',
    district: 'Dhaka',
    bmdc: 'A-39843',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. A K M Khairul Basher',
    degrees: 'MBBS, BCS (Health), MS (Pediatric Surgery)',
    specialization: 'Pediatric Surgery',
    hospital: 'Dhaka Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-39305',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Kuntal Roy',
    degrees: 'MBBS, DCH, FCPS (Pediatrics)',
    specialization: 'Child',
    hospital: 'Anwer Khan Modern Medical College and Hospital',
    district: 'Dhaka',
    bmdc: 'A-44243',
    source: 'bddoctorsdirectory.com',
  },

  // ── Gynaecology & obstetrics ──────────────────────────────────────────────────
  {
    name: 'Dr. Taslima Akter',
    degrees: 'MBBS, BCS (Health), FCPS, MS, MRCOG, DMU, CCD, FACS',
    specialization: 'Gynae & Obs',
    hospital: 'Dhaka Medical College Hospital',
    district: 'Dhaka',
    bmdc: 'A-59481',
    source: 'doctorbangladesh.com',
  },
  {
    name: 'Dr. Sabrina Islam',
    degrees: 'MBBS, BCS (Health), FCPS (Obs & Gynae)',
    specialization: 'Gynae & Obs',
    hospital: 'Chattogram Medical College & Hospital',
    district: 'Chattogram',
    bmdc: 'A-61486',
    source: 'doctorbangladesh.com',
  },
  {
    name: 'Dr. Sabiha Sultana',
    degrees: 'MBBS, MS (Obs & Gynae), Training in Infertility & USG',
    specialization: 'Gynae & Obs',
    hospital: 'Habib Hospital, Ashulia',
    district: 'Dhaka',
    bmdc: 'A-37678',
    source: 'bddoctorsdirectory.com',
  },
  {
    name: 'Dr. Himangshu Das Soumya',
    degrees: 'MBBS, FCPS (Gynae & Obs)',
    specialization: 'Gynae & Obs',
    hospital: 'Parkview Medical College & Hospital',
    district: 'Sylhet',
    bmdc: 'A-54531',
    source: 'doctorbangladesh.com',
  },

  // ── Psychiatry ────────────────────────────────────────────────────────────────
  {
    name: 'Dr. Mohammad Shahadath Hossain',
    degrees: 'MBBS, BCS (Health), MCPS, FCPS',
    specialization: 'Psychiatry',
    hospital: 'National Institute of Mental Health (NIMH)',
    district: 'Dhaka',
    bmdc: 'A-71348',
    source: 'doctorbangladesh.com',
  },
  {
    name: 'Dr. Kakon Kumar Dey',
    degrees: 'MBBS, BCS (Health), MD (Psychiatry)',
    specialization: 'Psychiatry',
    hospital: 'Modern Hospital Private Limited',
    district: 'Cumilla',
    bmdc: 'A-72307',
    source: 'doctorbangladesh.com',
  },

  // ── Anaesthesia and pain medicine ─────────────────────────────────────────────
  {
    name: 'Dr. Md. Anisur Rahman',
    degrees: 'MBBS, MD, FIPM (India)',
    specialization: 'Anesthesia & Pain Medicine',
    hospital: 'Dhaka Pain and Spine Center',
    district: 'Dhaka',
    bmdc: 'A-42294',
    source: 'bddoctorsdirectory.com',
  },
];
