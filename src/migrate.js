import fs from 'fs';
import { pool } from './db.js';

async function migrate() {
  const sql = fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf-8');
  await pool.query(sql);
  console.log('Migration complete');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
