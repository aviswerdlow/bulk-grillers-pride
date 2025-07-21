import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Schedule daily cleanup of expired trash items at midnight UTC
crons.daily(
  'cleanupExpiredTrash',
  { hourUTC: 0, minuteUTC: 0 },
  internal.functions.products.deletion.cleanupExpiredTrash
);

// Schedule cleanup of expired deletion sessions every 5 minutes
crons.interval(
  'cleanupExpiredDeletionSessions',
  { minutes: 5 },
  internal.functions.accessibility.deletionSessions.cleanupExpiredSessions
);

export default crons;