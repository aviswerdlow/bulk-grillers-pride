import { query } from '../_generated/server';

export const testNewTables = query(async (ctx) => {
  try {
    // Test if new tables exist by attempting to query them
    const tables = [
      'schemaMigrations',
      'categoryAssignmentsTrash', 
      'cascadeTransactions',
      'imageCleanupQueue'
    ];
    
    const results: Record<string, boolean> = {};
    
    for (const table of tables) {
      try {
        await ctx.db.query(table as any).take(1);
        results[table] = true;
      } catch (error) {
        results[table] = false;
      }
    }
    
    return {
      success: true,
      tablesExist: results,
      message: 'Schema test completed'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
});