// src/controllers/reports.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { getInactiveOperators } from '../services/reports.service.js';

export const inactive = asyncHandler(async (req, res) => {
  const weeks = req.query.weeks ? Number(req.query.weeks) : 6;
  const data = await getInactiveOperators(weeks);
  res.json(data);
});
