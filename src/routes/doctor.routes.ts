import { Router } from 'express';
import * as doctorController from '../controllers/doctor.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createDoctorSchema,
  doctorIdSchema,
  updateDoctorSchema,
} from '../validation/doctor.schema';
import {
  addPatientToDoctorSchema,
  removePatientFromDoctorSchema,
} from '../validation/patient.schema';

const router = Router();

// Every doctor route requires a valid session and the admin role.
router.use(requireAuth, requireRole('admin'));

router.get('/', doctorController.list);
router.post('/', validate(createDoctorSchema), doctorController.create);

router.get('/:id', validate(doctorIdSchema), doctorController.getById);
router.patch('/:id', validate(updateDoctorSchema), doctorController.update);
router.delete('/:id', validate(doctorIdSchema), doctorController.remove);

router.get('/:id/patients', validate(doctorIdSchema), doctorController.listPatients);
router.post(
  '/:id/patients',
  validate(addPatientToDoctorSchema),
  doctorController.addPatient,
);
router.delete(
  '/:id/patients/:patientId',
  validate(removePatientFromDoctorSchema),
  doctorController.removePatient,
);

export default router;
