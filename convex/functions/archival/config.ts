/**
 * Data Archival Configuration
 * Based on issue #70 - Implement Data Archival Strategy for Audit Logs
 * 
 * Manages data lifecycle to prevent unbounded growth and maintain performance
 */

/**
 * Archival policies by data type
 */
export const ARCHIVAL_POLICIES = {
  // Audit logs - highest volume, archive aggressively
  auditLogs: {
    hotStorageDays: 90, // 3 months in hot storage
    coldStorageDays: 730, // 2 years in cold storage
    compressionEnabled: true,
    compressionType: 'gzip' as const,
    partitionBy: 'month' as const,
    priority: 'high' as const,
  },
  
  // Activity logs - moderate volume
  activityLogs: {
    hotStorageDays: 60, // 2 months in hot storage
    coldStorageDays: 365, // 1 year in cold storage
    compressionEnabled: true,
    compressionType: 'gzip' as const,
    partitionBy: 'month' as const,
    priority: 'medium' as const,
  },
  
  // Trash/deleted items - expire after retention period
  trashItems: {
    hotStorageDays: 30, // Match trash retention period
    coldStorageDays: 90, // 3 months for compliance
    compressionEnabled: true,
    compressionType: 'gzip' as const,
    partitionBy: 'week' as const,
    priority: 'low' as const,
  },
  
  // Performance metrics - high volume, low value over time
  performanceMetrics: {
    hotStorageDays: 30, // 1 month for analysis
    coldStorageDays: 180, // 6 months for trends
    compressionEnabled: true,
    compressionType: 'gzip' as const,
    partitionBy: 'week' as const,
    priority: 'low' as const,
  },
  
  // AI job history - keep for analysis
  aiJobHistory: {
    hotStorageDays: 180, // 6 months
    coldStorageDays: 365, // 1 year
    compressionEnabled: true,
    compressionType: 'gzip' as const,
    partitionBy: 'quarter' as const,
    priority: 'low' as const,
  },
  
  // Migration history - keep indefinitely
  migrationHistory: {
    hotStorageDays: 365, // 1 year
    coldStorageDays: -1, // Indefinite
    compressionEnabled: true,
    compressionType: 'gzip' as const,
    partitionBy: 'year' as const,
    priority: 'low' as const,
  },
} as const;

/**
 * S3 bucket configuration
 */
export const S3_CONFIG = {
  bucketName: process.env.ARCHIVE_S3_BUCKET || 'bulk-grillers-pride-archives',
  region: process.env.ARCHIVE_S3_REGION || 'us-east-1',
  storageClasses: {
    hot: 'STANDARD',
    cold: 'GLACIER_FLEXIBLE_RETRIEVAL',
    deep: 'DEEP_ARCHIVE',
  },
  encryption: {
    type: 'AES256',
    kmsKeyId: process.env.ARCHIVE_KMS_KEY_ID,
  },
  lifecycle: {
    transitionToColdDays: 90,
    transitionToDeepDays: 365,
    expireAfterDays: 2555, // 7 years for compliance
  },
} as const;

/**
 * Archive file structure
 */
export interface ArchiveMetadata {
  version: string;
  createdAt: number;
  organizationId: string;
  dataType: keyof typeof ARCHIVAL_POLICIES;
  dateRange: {
    start: string; // ISO date
    end: string; // ISO date
  };
  recordCount: number;
  originalSize: number;
  compressedSize: number;
  checksum: string;
  schema: {
    version: string;
    fields: string[];
  };
}

/**
 * Generate S3 key for archive
 */
export function generateArchiveKey(
  organizationId: string,
  dataType: keyof typeof ARCHIVAL_POLICIES,
  dateRange: { start: string; end: string }
): string {
  const policy = ARCHIVAL_POLICIES[dataType];
  const year = dateRange.start.substring(0, 4);
  const month = dateRange.start.substring(5, 7);
  
  let partition = '';
  switch (policy.partitionBy) {
    case 'month':
      partition = `${year}/${month}`;
      break;
    case 'quarter':
      const quarter = Math.ceil(parseInt(month) / 3);
      partition = `${year}/Q${quarter}`;
      break;
    case 'year':
      partition = year;
      break;
    case 'week':
      // Calculate week number
      const date = new Date(dateRange.start);
      const week = getWeekNumber(date);
      partition = `${year}/W${week.toString().padStart(2, '0')}`;
      break;
  }
  
  return `${organizationId}/${dataType}/${partition}/${dateRange.start}_${dateRange.end}.jsonl.gz`;
}

/**
 * Get week number for a date
 */
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Restoration SLA by storage class
 */
export const RESTORATION_SLA = {
  STANDARD: {
    time: 0, // Immediate
    cost: 'standard',
  },
  GLACIER_FLEXIBLE_RETRIEVAL: {
    time: 240, // 4 hours
    cost: 'expedited',
  },
  DEEP_ARCHIVE: {
    time: 720, // 12 hours
    cost: 'standard',
  },
} as const;

/**
 * Batch configuration for archival operations
 */
export const BATCH_CONFIG = {
  maxRecordsPerBatch: 10000,
  maxSizePerBatch: 50 * 1024 * 1024, // 50MB uncompressed
  parallelUploads: 3,
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
} as const;

/**
 * Archive status tracking
 */
export interface ArchiveStatus {
  dataType: keyof typeof ARCHIVAL_POLICIES;
  lastArchivalRun: number;
  lastArchivalSuccess: number;
  recordsArchived: number;
  sizeArchived: number;
  nextScheduledRun: number;
  status: 'idle' | 'running' | 'failed' | 'scheduled';
  error?: string;
}

/**
 * Calculate next archival run time
 */
export function calculateNextArchivalRun(
  dataType: keyof typeof ARCHIVAL_POLICIES,
  lastRun: number
): number {
  const policy = ARCHIVAL_POLICIES[dataType];
  
  // Run daily for high priority, weekly for medium, monthly for low
  const intervalDays = policy.priority === 'high' ? 1 : 
                      policy.priority === 'medium' ? 7 : 30;
  
  return lastRun + (intervalDays * 24 * 60 * 60 * 1000);
}

/**
 * Determine if data should be archived
 */
export function shouldArchive(
  createdAt: number,
  dataType: keyof typeof ARCHIVAL_POLICIES
): boolean {
  const policy = ARCHIVAL_POLICIES[dataType];
  const ageInDays = (Date.now() - createdAt) / (24 * 60 * 60 * 1000);
  
  return ageInDays > policy.hotStorageDays;
}

/**
 * Determine if archived data can be deleted
 */
export function canDeleteArchived(
  archivedAt: number,
  dataType: keyof typeof ARCHIVAL_POLICIES
): boolean {
  const policy = ARCHIVAL_POLICIES[dataType];
  
  // Never delete if coldStorageDays is -1 (indefinite)
  if (policy.coldStorageDays === -1) {
    return false;
  }
  
  const ageInDays = (Date.now() - archivedAt) / (24 * 60 * 60 * 1000);
  return ageInDays > policy.coldStorageDays;
}