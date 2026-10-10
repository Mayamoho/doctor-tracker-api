import type { Request, Response } from 'express';
import * as doctorService from '../services/doctorService';
import * as patientService from '../services/patientService';
import { listDoctorsQuerySchema } from '../validation/doctor.schema';
import { listPatientsQuerySchema } from '../validation/patient.schema';

/**
 * `Request<{ id: string }>` rather than the default, whose params are typed
 * `string | string[]` because Express tolerates repeated keys. Every `:id` here
 * is validated as a single ObjectId by the route's `validate` middleware first.
 *
 * Query strings are parsed in the controller rather than by `validate`, because
 * `req.query` is a read-only getter in Express 5.
 */
type IdRequest = Request<{ id: string }>;

export async function list(req: Request, res: Response): Promise<void> {
  const query = listDoctorsQuerySchema.parse(req.query);
  const { items, meta } = await doctorService.listDoctors(query);
  res.json({ success: true, data: items, meta });
}

export async function getById(req: IdRequest, res: Response): Promise<void> {
  res.json({ success: true, data: await doctorService.getDoctor(req.params.id) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const doctor = await doctorService.createDoctor(req.body);
  res.status(201).json({ success: true, data: doctor });
}

export async function update(req: IdRequest, res: Response): Promise<void> {
  const doctor = await doctorService.updateDoctor(req.params.id, req.body);
  res.json({ success: true, data: doctor });
}

export async function remove(req: IdRequest, res: Response): Promise<void> {
  res.json({ success: true, data: await doctorService.deleteDoctor(req.params.id) });
}

/** `doctorId` is taken from the path, so a caller cannot read another doctor's patients. */
export async function listPatients(req: IdRequest, res: Response): Promise<void> {
  const query = listPatientsQuerySchema.parse({ ...req.query, doctorId: req.params.id });
  const { items, meta } = await patientService.listPatients(query);
  res.json({ success: true, data: items, meta });
}

export async function addPatient(req: IdRequest, res: Response): Promise<void> {
  const patient = await patientService.addPatientToDoctor(req.params.id, req.body);
  res.status(201).json({ success: true, data: patient });
}

export async function removePatient(
  req: Request<{ id: string; patientId: string }>,
  res: Response,
): Promise<void> {
  const result = await patientService.removePatientFromDoctor(req.params.id, req.params.patientId);
  res.json({ success: true, data: result });
}
