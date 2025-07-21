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

// Schedule image cleanup from queue every 5 minutes
crons.interval(
  'processImageCleanupQueue',
  { minutes: 5 },
  internal.migrations.imageCleanupCron.processImageCleanupQueue,
  { batchSize: 100 } // Process up to 100 images per run
);

// Schedule daily maintenance of image cleanup queue at 3 AM UTC
crons.daily(
  'imageCleanupQueueMaintenance',
  { hourUTC: 3, minuteUTC: 0 },
  internal.migrations.imageCleanupCron.cleanupQueueHistory,
  { daysToKeep: 30 }
);

// Schedule hourly consistency validation for cascade deletion system
crons.hourly(
  'cascadeDeletionConsistencyCheck',
  { minuteUTC: 0 },
  internal.migrations.consistencyValidator.runConsistencyValidation,
  { fix: true } // Automatically fix safe issues
);

// Schedule daily comprehensive consistency report at 2 AM UTC
crons.daily(
  'cascadeDeletionConsistencyReport',
  { hourUTC: 2, minuteUTC: 0 },
  internal.migrations.consistencyValidator.generateConsistencyReport
);

export default crons;