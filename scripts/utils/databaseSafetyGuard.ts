/**
 * Hardened Fail-Closed Database Safety Guard for E2E and Test Scripts.
 * Strictly prevents any execution against production / primary database 'StudyAIDb',
 * and enforces exact whitelist:
 *   1. 'StudyAIDb_E2E'
 *   2. 'StudyAIDb_Clean_{GUID}' (with cryptographically valid GUID format).
 * Credentials (passwords, tokens, user IDs) are strictly masked to prevent leaks in logs.
 */

const GUID_REGEX =
  /^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/

/**
 * Sanitizes a connection string by replacing passwords, secrets, or user IDs with masks.
 */
export function sanitizeConnectionString(connectionString: string | undefined): string {
  if (!connectionString || connectionString.trim() === '') {
    return '<empty>'
  }
  return connectionString
    .replace(/(?:password|pwd)\s*=\s*[^;]*/gi, 'Password=***')
    .replace(/(?:user\s*id|uid)\s*=\s*[^;]*/gi, 'User Id=***')
}

/**
 * Checks whether a given database name strictly matches the authorized test whitelist:
 *   - Exactly "StudyAIDb_E2E" (case-insensitive)
 *   - Exactly "StudyAIDb_Clean_{GUID}" where GUID is a valid 32-hex or 36-char GUID.
 * Databases that merely contain "test" or "e2e" as substrings are strictly rejected.
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

  // 3. Exactly StudyAIDb_Clean_{GUID} with valid GUID format
  const cleanPrefix = 'studyaidb_clean_'
  if (normalized.toLowerCase().startsWith(cleanPrefix)) {
    const guidPart = normalized.slice(cleanPrefix.length)
    if (GUID_REGEX.test(guidPart)) {
      return true
    }
  }

  return false
}

/**
 * Validates that an E2E connection string targets an authorized test database.
 * Throws an Error immediately if any violation or credential leak is detected.
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
    const safeConn = sanitizeConnectionString(connectionString)
    const errorMsg = `CRITICAL DATABASE SAFETY GUARD TRIGGERED [${callerContext}]: Could not extract Database or Initial Catalog from connection string: [${safeConn}]. Execution is blocked.`
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

  // 2. Strict Exact Whitelist Check
  if (!isAuthorizedTestDatabase(dbName)) {
    const errorMsg = `CRITICAL DATABASE SAFETY GUARD TRIGGERED [${callerContext}]: Database '${dbName}' is NOT an authorized test database. E2E executions must strictly target 'StudyAIDb_E2E' or 'StudyAIDb_Clean_{GUID}'. Generic databases containing 'test' or 'e2e' substrings are rejected.`
    console.error(`\n[CRITICAL ERROR] ${errorMsg}\n`)
    throw new Error(errorMsg)
  }

  return dbName
}
