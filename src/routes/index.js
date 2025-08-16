// src/routes/index.js
import { Router } from 'express';
import ingestRoutes from './ingest.routes.js';
import reportsRoutes from './reports.routes.js';

const api = Router();
api.use(ingestRoutes);
api.use('/reports', reportsRoutes); // <- mount reports under /api/reports

export default api;
