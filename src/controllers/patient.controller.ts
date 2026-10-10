import type { Request, Response } from 'express';
import * as patientService from '../services/patientService';
import { listPatientsQuerySchema } from '../validation/patient.schema';

type IdRequest = Request<{ id: string }>;

export async function list(req: Request, res: Response): Promise<void> {
  const query = listPatientsQuerySchema.parse(req.query);
  const { items, meta } = await patientService.listPatients(query);
  res.json({ success: true, data: items, meta });
}

export async function getById(req: IdRequest, res: Response): Promise<void> {
  res.json({ success: true, data: await patientService.getPatient(req.params.id) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const patient = await patientService.createPatient(req.body);
  res.status(201).json({ success: true, data: patient });
}

export async function update(req: IdRequest, res: Response): Promise<void> {
  const patient = await patientService.updatePatient(req.params.id, req.body);
  res.json({ success: true, data: patient });
}

export async function remove(req: IdRequest, res: Response): Promise<void> {
  res.json({ success: true, data: await patientService.deletePatient(req.params.id) });
}
