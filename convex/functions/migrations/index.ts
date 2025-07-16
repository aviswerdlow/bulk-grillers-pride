// Migration functions for data import and rollback
export { importLegacyCategories } from './importCategories';
export { rollbackCategoryImport, getImportHistory } from './rollbackCategoryImport';
export { validateCategoryImport, previewCategoryImport } from './validateCategoryImport';
export {
  getMigrationHistory,
  canRunMigration,
  trackedMigration,
  startMigration,
  updateMigrationProgress,
  completeMigration,
} from './migrationTracking';
export {
  CURRENT_SCHEMA_VERSION,
  SCHEMA_VERSION_HISTORY,
  getSchemaVersion,
  updateSchemaVersion,
  checkSchemaCompatibility,
  planSchemaMigration,
} from './schemaVersion';
