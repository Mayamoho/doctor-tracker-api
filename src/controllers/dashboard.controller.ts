import type { Request, Response } from 'express';
import * as dashboardService from '../services/dashboardService';

export async function stats(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await dashboardService.getStats() });
}

export async function filterOptions(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, data: await dashboardService.getFilterOptions() });
}
