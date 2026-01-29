# DATABASE MIGRATION Procedure

## When to Use
- Schema changes needed
- Adding/removing tables or columns
- Data cleanup or transformation
- Index optimization

## Priority: HIGH (impacts production data)

## Steps

### 1. Analysis (TaskCreate: "Analyze database change")
- **Agent:** `database-optimizer` or `postgres-pro`
- Understand current schema
- Document desired changes
- Identify data impact
- Plan migration strategy

### 2. Create Migration (TaskCreate: "Create migration")
- **Agent:** `database-administrator`
- Write Prisma migration
- Include up and down paths
- Add data transformations if needed
- Consider rollback scenario

### 3. Test Locally (TaskCreate: "Test migration locally")
- Run migration on local database
- Verify schema changes
- Test data transformations
- Check application still works
- Verify rollback works

### 4. Update Application Code (TaskCreate: "Update app code")
- **Agent:** Language specialist
- Update Prisma schema
- Modify queries if needed
- Update types
- Fix any breaking changes

### 5. Test Application (TaskCreate: "Test app with new schema")
- **Agent:** `test-automator`
- Run all tests
- Verify CRUD operations
- Check API endpoints
- Test edge cases

### 6. Create Backup Script (TaskCreate: "Create backup")
- **Agent:** `database-administrator`
- Document backup procedure
- Create restore script
- Test backup/restore

### 7. Quality Gate
- [ ] Migration runs successfully
- [ ] Rollback tested
- [ ] All tests pass
- [ ] No data loss
- [ ] Application works with new schema
- [ ] Backup procedure ready

### 8. Deploy
- Commit migration files
- Bump patch version
- Push to master
- Monitor deployment logs
- Verify migration runs in production
- Test production application

### 9. Post-Deployment
- Run verification queries
- Check application health
- Monitor for errors
- Document any issues

## Success Criteria
- Migration applied successfully
- No data loss
- Application works correctly
- Rollback plan ready
- Deployed safely
