/**
 * Hardened Fail-Closed Database Safety Guard for E2E and Test Scripts.
 * Strictly prevents any execution against production / primary database 'StudyAIDb',
 * and enforces exact whitelist:
 *   1. 'StudyAIDb_E2E' (case-insensitive)
 *   2. 'StudyAIDb_Clean_{GUID}' where GUID strictly matches Guid:N (32 hex) or Guid:D (36 chars).
 * Fixed constant error messages are used for malformed inputs without reflecting input strings or secrets.
 */

// Exactly Guid:N (32 hex characters) or Guid:D (36 characters 8-4-4-4-12)
const GUID_N_OR_D_REGEX =
  /^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/

/**
 * Checks whether a given database name strictly matches the authorized test whitelist:
 *   - Exactly "StudyAIDb_E2E" (case-insensitive)
 *   - Exactly "StudyAIDb_Clean_{GUID}" where GUID strictly matches Guid:N (32 hex) or Guid:D (36 chars).
 * Formats such as B ({...}), P ((...)), X, or arbitrary substrings are strictly rejected.
 */
export function isAuthorizedTestDatabase(dbName: string | undefined): boolean {
  if (!dbName || !dbName.trim()) {
    return false
  }

  const normalized = dbName.trim().replace(/^\[|\]$/g, '')

  // 1. Explicit Fail-Closed Block: "StudyAIDb" in any casing or format is never authorized
  if (normalized.toLowerCase() === 'studyaidb') {
    return false
  }

  // 2. Exactly StudyAIDb_E2E (case-insensitive)
  if (normalized.toLowerCase() === 'studyaidb_e2e') {
    return true
  }

  // 3. Exactly StudyAIDb_Clean_{GUID} where GUID is strictly Guid:N (32 hex) or Guid:D (36 chars)
  const cleanPrefix = 'studyaidb_clean_'
  if (normalized.toLowerCase().startsWith(cleanPrefix)) {
    const guidPart = normalized.slice(cleanPrefix.length)
    if (GUID_N_OR_D_REGEX.test(guidPart)) {
      return true
    }
  }

  return false
}

/**
 * Validates that an E2E connection string targets an authorized test database.
 * Throws an Error immediately if any violation or security boundary issue is detected.
 * Uses fixed error messages and never reflects raw connection strings, credentials, or secrets.
 */
export function assertSafeTestDatabase(
  connectionString: string | undefined,
  callerContext = 'E2E Script'
): string {
  if (!connectionString || connectionString.trim() === '') {
    const errorMsg = `CRITICAL DATABASE SAFETY GUARD TRIGGERED [${callerContext}]: Connection string is empty or undefined. E2E tests must target an isolated test database ('StudyAIDb_E2E').`
    console.error(`\n[CRITICAL ERROR] ${errorMsg}\n`)
    throw new Error(errorMsg)
  }

  // Parse Initial Catalog or Database name from connection string
  const dbMatch = connectionString.match(/(?:Database|Initial\s+Catalog)\s*=\s*([^;]+)/i)
  if (!dbMatch || !dbMatch[1]) {
    // Fixed generic error message: do not echo the input connection string which may contain secrets
    const errorMsg = `CRITICAL DATABASE SAFETY GUARD TRIGGERED [${callerContext}]: Could not extract Database or Initial Catalog from connection string syntax. Execution is blocked for security reasons.`
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

  // 2. Strict Exact Whitelist Check (StudyAIDb_E2E or StudyAIDb_Clean_{Guid:N|Guid:D})
  if (!isAuthorizedTestDatabase(dbName)) {
    const errorMsg = `CRITICAL DATABASE SAFETY GUARD TRIGGERED [${callerContext}]: Database '${dbName}' is NOT an authorized test database. E2E executions must strictly target 'StudyAIDb_E2E' or 'StudyAIDb_Clean_{GUID}' (Guid:N or Guid:D). Generic databases containing 'test' or 'e2e' substrings, or non-N/D GUID formats are rejected.`
    console.error(`\n[CRITICAL ERROR] ${errorMsg}\n`)
    throw new Error(errorMsg)
  }

  return dbName
}
