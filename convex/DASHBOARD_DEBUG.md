# Dashboard Debug Guide

This guide helps troubleshoot dashboard-related issues in the Convex backend.

## Dashboard Diagnostic Logging

The dashboard functions now include comprehensive diagnostic logging to help identify and resolve issues.

### Log Format

```
[timestamp] [DASHBOARD] [level] [component] message {data}
```

- **timestamp**: ISO 8601 format (e.g., 2025-07-16T10:30:45.123Z)
- **level**: INFO, WARN, or ERROR
- **component**: getDashboardStats or getRecentActivity
- **message**: Descriptive message about the operation
- **data**: JSON object with relevant context (optional)

### What's Logged

#### getDashboardStats

1. **Start**: Organization ID and function entry
2. **Authentication**: User ID, role, and organization verification
3. **Each Query**:
   - Query type (projects, products, AI jobs, team members, imports)
   - Time taken for each query
   - Result count
4. **Calculations**: Product status breakdown, categorization stats
5. **Success**: Total execution time and summary
6. **Errors**: Full error details with stack trace

#### getRecentActivity

1. **Start**: Organization ID and limit
2. **Input Validation**: Warnings for invalid limits
3. **Authentication**: User verification
4. **Audit Log Query**: Time and count
5. **User Lookup**: Time to fetch user details
6. **Warnings**: Missing user records
7. **Success**: Total time, event types summary
8. **Errors**: Full error context

### How to Use the Logs

1. **Enable Convex Logs**:

   ```bash
   npx convex logs --follow
   ```

2. **Filter Dashboard Logs**:

   ```bash
   npx convex logs --follow | grep DASHBOARD
   ```

3. **View Errors Only**:
   ```bash
   npx convex logs --follow | grep "DASHBOARD.*ERROR"
   ```

### Common Issues and Solutions

#### Issue: "Could not find public function"

**Log Pattern**: Function not deployed
**Solution**: Run `npx convex dev` to deploy functions

#### Issue: Authentication Failures

**Log Pattern**: `[ERROR] [getDashboardStats] User not found`
**Solution**:

- Verify Clerk JWT configuration
- Check user exists in database
- Ensure organization membership is active

#### Issue: Slow Dashboard Load

**Log Pattern**: Query times > 1000ms
**Solution**:

- Check database indexes
- Review data volume
- Consider pagination for large datasets

#### Issue: Missing Data

**Log Pattern**: `count: 0` for expected data
**Solution**:

- Verify organization ID is correct
- Check data exists in database
- Review index configurations

### Performance Benchmarks

Expected query times (with moderate data):

- Projects query: < 50ms
- Products query: < 100ms
- AI jobs query: < 50ms
- Team members query: < 50ms
- Import jobs query: < 50ms
- Total dashboard load: < 500ms

### Debugging Steps

1. **Check Deployment**:

   ```bash
   npx convex function-spec | grep dashboard
   ```

2. **Monitor Logs**:

   ```bash
   npx convex logs --follow | grep DASHBOARD
   ```

3. **Test Queries**:

   ```bash
   npx convex run functions/dashboard:getDashboardStats '{"organizationId": "YOUR_ORG_ID"}'
   ```

4. **Review Timing**:
   Look for queries taking > 200ms as optimization candidates

### Log Examples

**Successful Query**:

```
[2025-07-16T10:30:45.123Z] [DASHBOARD] [INFO] [getDashboardStats] Starting dashboard stats query {
  "organizationId": "j97..."
}
[2025-07-16T10:30:45.234Z] [DASHBOARD] [INFO] [getDashboardStats] Projects query completed in 45ms {
  "count": 3
}
[2025-07-16T10:30:45.567Z] [DASHBOARD] [INFO] [getDashboardStats] Dashboard stats query completed successfully in 444ms
```

**Error Case**:

```
[2025-07-16T10:30:45.123Z] [DASHBOARD] [ERROR] [getDashboardStats] Dashboard stats query failed {
  "error": "Not authenticated",
  "stack": "Error: Not authenticated\n    at ...",
  "organizationId": "j97...",
  "timeElapsed": 123
}
```

### Support

If issues persist after reviewing logs:

1. Check Convex status page
2. Review recent code changes
3. Verify environment variables
4. Contact support with log excerpts
