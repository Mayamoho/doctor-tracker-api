import { Router } from 'express';
import * as patientController from '../controllers/patient.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createPatientSchema,
  patientIdSchema,
  updatePatientSchema,
} from '../validation/patient.schema';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/', patientController.list);
router.post('/', validate(createPatientSchema), patientController.create);

router.get('/:id', validate(patientIdSchema), patientController.getById);
router.patch('/:id', validate(updatePatientSchema), patientController.update);
router.delete('/:id', validate(patientIdSchema), patientController.remove);

export default router;
