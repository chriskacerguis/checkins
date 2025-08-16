// src/routes/reports.routes.js
import { Router } from 'express';
import { inactive } from '../controllers/reports.controller.js';

const router = Router();

// GET /api/reports/inactive?weeks=6
router.get('/inactive', inactive);

export default router;
