# Convex Snapshot Import Process Documentation

## Overview

Successfully imported data from a Convex snapshot from a different organization into the current deployment.

## Import Summary

### Successfully Imported Tables:

1. **categories** - 183 records imported
   - Hierarchical category structure with proper parent-child relationships
   - Categories span multiple levels (e.g., BBQ Seasoning, Cookies & Macaroons)
2. **categoryLevelDefinitions** - 5 records imported
   - Defines the hierarchy levels for categories

### Tables Not Imported (as per requirements):

- **users** - Preserved existing user data
- **projects** - Preserved existing project data
- **organizations** - Preserved existing organization data

### Tables Skipped Due to Issues:

- **auditLogs** - 13 records (conflict with existing entries from partial import)
- **organizationMemberships** - 1 record (would need to be manually recreated if needed)

## Import Process

### 1. Initial Backup

Created a backup of existing data before import:

```bash
npx convex export --path ./backup_before_import_20250716_195722
```

### 2. Data Preparation

Since the snapshot was from a different organization, ID references needed to be transformed:

**Old IDs → New IDs Mapping:**

- Organization: `k57adbwt1jy2t9yp0kc0nc56vd7j2kr0` → `kd717wy14v03szcf28w18s976s7kt2gw`
- Project: `kh72zvb6xajs2cfgq5kay20v0h7j24pb` → `ks7ezf7nfa1fmjyh9wp8277b397kthr6`
- User: `kn7et0vnqk8hsx57mr0psg1m6n7j2g1v` → `kx781fy13hzs071zs20gprjpsh7kvnw4`

### 3. Data Transformation Script

Created `scripts/transform-import-ids.js` to:

- Map old organization/project/user IDs to current deployment IDs
- Remove \_id fields from tables that might have conflicts
- Transform nested objects and arrays recursively

### 4. Import Execution

Due to ID conflicts when importing as a complete snapshot, imported tables individually:

```bash
# Import categories
npx convex import --table categories transformed_import/categories/documents.jsonl --replace -y

# Import category level definitions
npx convex import --table categoryLevelDefinitions transformed_import/categoryLevelDefinitions/documents.jsonl --replace -y
```

## Technical Challenges & Solutions

### Challenge 1: Cross-Organization ID References

**Issue:** Data contained ID references to organizations, projects, and users from the source deployment.
**Solution:** Created a transformation script to map old IDs to new IDs in the current deployment.

### Challenge 2: ID Format Conflicts

**Issue:** Convex detected that imported IDs came from a different deployment.
**Solution:** Removed \_id and \_creationTime fields from certain tables to let Convex generate new IDs.

### Challenge 3: Partial Import Conflicts

**Issue:** Initial failed import attempts left some data in tables, causing conflicts.
**Solution:** Used individual table imports with --replace flag for clean imports.

## Verification

The import was successful as evidenced by:

1. Import command output showing 183 categories and 5 category level definitions imported
2. No error messages during the final import commands
3. Categories maintain their hierarchical structure with proper parent-child relationships

## Next Steps

If additional data needs to be imported:

1. Use the transformation script to prepare the data
2. Import tables individually to avoid conflicts
3. Verify data integrity after each import

## Files Created

1. `/scripts/transform-import-ids.js` - ID transformation script
2. `/backup_before_import_20250716_195722` - Backup of data before import
3. `/filtered_snapshot_for_import/` - Filtered snapshot without users/projects/organizations
4. `/transformed_import/` - Transformed data with corrected IDs
5. `/docs/IMPORT_PROCESS.md` - This documentation

## Important Notes

- Always create a backup before importing data
- When importing from different organizations, ID mapping is essential
- Individual table imports provide more control than full snapshot imports
- Some tables may need manual data entry if they have complex relationships
