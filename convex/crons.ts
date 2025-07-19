import { cronJobs } from 'convex/server';
import { cleanupExpiredTrash } from './functions/products/deletion';

const crons = cronJobs();

// Schedule daily cleanup of expired trash items at midnight UTC
crons.daily(
  'cleanupExpiredTrash',
  { hourUTC: 0, minuteUTC: 0 },
  cleanupExpiredTrash
);

export default crons;