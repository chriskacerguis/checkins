import { ingestLog, listSessions, listCheckins } from '../services/ingest.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const ingest = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Missing file' });
  const filename = (req.query.filename || req.file.originalname || 'upload.log').toString();
  const data = await ingestLog(req.file.buffer, filename);
  res.json(data);
});

export const sessions = asyncHandler(async (req, res) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 10;
  const data = await listSessions(page, pageSize);
  res.json(data);
});

export const checkins = asyncHandler(async (req, res) => {
  const callsign = req.query.callsign || null;
  const page = req.query.page ? Number(req.query.page) : 1;
  const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 25;
  const data = await listCheckins(callsign, page, pageSize);
  res.json(data);
});
