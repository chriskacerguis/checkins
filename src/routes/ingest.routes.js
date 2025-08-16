import { Router } from 'express';
import { upload } from '../middlewares/upload.js';
import { ingest, sessions, checkins } from '../controllers/ingest.controller.js';

const router = Router();
router.post('/ingest', upload.single('file'), ingest);
router.get('/sessions', sessions);
router.get('/checkins', checkins);
export default router;
