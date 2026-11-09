/**
 * Fail-Closed Database Safety Guard for E2E and Test Scripts.
 * Strictly prevents any execution against production / primary database 'StudyAIDb'.
 */
export function assertSafeTestDatabase(connectionString: string | undefined, callerContext = 'E2E Script'): string {
  if (!connectionString || connectionString.trim() === '') {
    const errorMsg = `CRITICAL DATABASE SAFETY GUARD TRIGGERED [${callerContext}]: Connection string is empty or undefined. E2E tests must target an isolated test database.`
    console.error(`\n[CRITICAL ERROR] ${errorMsg}\n`)
    throw new Error(errorMsg)
  }

  // Parse Initial Catalog or Database name from connection string
  const dbMatch = connectionString.match(/(?:Database|Initial\s+Catalog)\s*=\s*([^;]+)/i)
  if (!dbMatch || !dbMatch[1]) {
    const errorMsg = `CRITICAL DATABASE SAFETY GUARD TRIGGERED [${callerContext}]: Could not extract Database or Initial Catalog from connection string: '${connectionString}'. Execution is blocked.`
    console.error(`\n[CRITICAL ERROR] ${errorMsg}\n`)
    throw new Error(errorMsg)
  }

  const dbName = dbMatch[1].trim().replace(/^\[|\]$/g, '')

  // 1. Explicit Fail-Closed Block: "StudyAIDb" in any casing or whitespace format
  if (dbName.toLowerCase() === 'studyaidb') {
    const errorMsg = `CRITICAL DATABASE SAFETY GUARD TRIGGERED [${callerContext}]: Operation BLOCKED! Target database resolved to primary database '${dbName}'. E2E tests are strictly FORBIDDEN from connecting to or modifying 'StudyAIDb'.`
    console.error('\n====================================================================')
    console.error(' [CRITICAL DATABASE SAFETY GUARD TRIGGERED]')
    console.error(` ${errorMsg}`)
    console.error(' Execution is terminated immediately to protect data integrity.')
    console.error('====================================================================\n')
    throw new Error(errorMsg)
  }

  // 2. Strict Whitelist Check: Must match authorized test database patterns
  const isAuthorizedTestDb =
    dbName.toLowerCase() === 'studyaidb_e2e' ||
    /^studyaidb_clean_/i.test(dbName) ||
    /(?:^|[_\.-])(?:test|e2e)(?:$|[_\.-])/i.test(dbName) ||
    /test/i.test(dbName) ||
    /e2e/i.test(dbName)

  if (!isAuthorizedTestDb) {
    const errorMsg = `CRITICAL DATABASE SAFETY GUARD TRIGGERED [${callerContext}]: Database '${dbName}' is NOT an authorized test database. E2E executions must explicitly target isolated test databases (e.g. 'StudyAIDb_E2E', 'StudyAIDb_Clean_*', or contain 'test'/'e2e').`
    console.error(`\n[CRITICAL ERROR] ${errorMsg}\n`)
    throw new Error(errorMsg)
  }

  return dbName
}
