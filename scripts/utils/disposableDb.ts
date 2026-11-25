import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'child_process'
import { assertSafeTestDatabase } from './databaseSafetyGuard'

export interface DisposableDbManifestEntry {
  dbName: string
  runId: string
  ownershipToken: string
  pid: number
  server: string
  callerContext: string
  createdAt: string
}

export interface DisposableTestDatabase {
  dbName: string
  runId: string
  ownershipToken: string
  connectionString: string
  cleanup: () => Promise<void>
}

export const DEFAULT_MANIFEST_PATH = path.join(os.tmpdir(), 'studyai-disposable-db-manifest.json')

function extractConnPart(connStr: string, keyPattern: RegExp): string | undefined {
  const m = connStr.match(keyPattern)
  return m?.[1]?.trim()
}

export function parseValidatedSqlConnection(connectionString: string, callerContext = 'E2E SQL'): {
  server: string
  dbName: string
  userId?: string
  password?: string
} {
  const dbName = assertSafeTestDatabase(connectionString, callerContext)
  const server = extractConnPart(connectionString, /(?:Server|Data\s+Source)\s*=\s*([^;]+)/i) || '.\\SQLEXPRESS'
  const userId = extractConnPart(connectionString, /(?:User\s+Id|UID)\s*=\s*([^;]+)/i)
  const password = extractConnPart(connectionString, /(?:Password|PWD)\s*=\s*([^;]+)/i)
  return { server, dbName, userId, password }
}

function runSqlCmd(
  server: string,
  userId: string | undefined,
  password: string | undefined,
  query: string,
  database?: string
): string {
  const args = ['-S', server]
  if (database) {
    args.push('-d', database)
  }
  args.push('-C', '-b', '-h', '-1', '-W')
  if (userId && password) {
    args.push('-U', userId, '-P', password)
  } else {
    args.push('-E')
  }
  args.push('-Q', query)
  return execFileSync('sqlcmd', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

export function queryValidatedDisposableDatabase(
  connectionString: string,
  query: string,
  callerContext = 'Playwright SQL Assertion'
): string {
  const { server, dbName, userId, password } = parseValidatedSqlConnection(connectionString, callerContext)
  return runSqlCmd(server, userId, password, query, dbName)
}

function readManifest(manifestPath: string): DisposableDbManifestEntry[] {
  if (!fs.existsSync(manifestPath)) return []
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeManifest(manifestPath: string, entries: DisposableDbManifestEntry[]) {
  fs.writeFileSync(manifestPath, JSON.stringify(entries, null, 2), 'utf8')
}

function verifyDbOwnershipToken(
  server: string,
  userId: string | undefined,
  password: string | undefined,
  dbName: string,
  expectedToken: string
): boolean {
  const existsOut = runSqlCmd(
    server,
    userId,
    password,
    `SET NOCOUNT ON; SELECT CASE WHEN DB_ID('${dbName}') IS NULL THEN '0' ELSE '1' END;`
  )
  if (existsOut.trim() !== '1') {
    throw new Error(`Disposable database '${dbName}' does not exist during ownership verification.`)
  }
  const tokenOut = runSqlCmd(
    server,
    userId,
    password,
    `SET NOCOUNT ON; SELECT ISNULL(CAST(value AS nvarchar(128)), '') FROM [${dbName}].sys.extended_properties WHERE class = 0 AND name = N'StudyAI_OwnershipToken';`
  )
  return tokenOut.trim() === expectedToken
}

function isProcessAlive(pid: number): boolean {
  if (!pid || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Recovers and drops ONLY disposable databases recorded in the ownership manifest whose owning PID is dead
 * AND whose SQL extended property `StudyAI_OwnershipToken` matches the manifest token.
 * Never drops unowned or orphan `StudyAIDb_Clean_*` databases.
 */
export function recoverInterruptedOwnedDatabases(
  manifestPath = DEFAULT_MANIFEST_PATH,
  templateConnection = process.env.E2E_SQL_SERVER_CONNECTION || process.env.ConnectionStrings__DefaultConnection || '',
  pidAliveCheck: (pid: number) => boolean = isProcessAlive
): { recovered: string[]; skipped: string[] } {
  const entries = readManifest(manifestPath)
  const remaining: DisposableDbManifestEntry[] = []
  const recovered: string[] = []
  const skipped: string[] = []

  const userId = extractConnPart(templateConnection, /(?:User\s+Id|UID)\s*=\s*([^;]+)/i)
  const password = extractConnPart(templateConnection, /(?:Password|PWD)\s*=\s*([^;]+)/i)

  for (const entry of entries) {
    if (pidAliveCheck(entry.pid)) {
      remaining.push(entry)
      skipped.push(entry.dbName)
      continue
    }

    assertSafeTestDatabase(`Server=${entry.server};Database=${entry.dbName};Trusted_Connection=True;`, 'InterruptedRunRecovery')
    const existsOut = runSqlCmd(
      entry.server,
      userId,
      password,
      `SET NOCOUNT ON; SELECT CASE WHEN DB_ID('${entry.dbName}') IS NULL THEN '0' ELSE '1' END;`
    )
    if (existsOut.trim() !== '1') {
      continue
    }

    const ownsDb = verifyDbOwnershipToken(entry.server, userId, password, entry.dbName, entry.ownershipToken)
    if (!ownsDb) {
      remaining.push(entry)
      skipped.push(entry.dbName)
      continue
    }

    runSqlCmd(
      entry.server,
      userId,
      password,
      `ALTER DATABASE [${entry.dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${entry.dbName}];`
    )
    recovered.push(entry.dbName)
  }

  writeManifest(manifestPath, remaining)
  return { recovered, skipped }
}

/**
 * Creates a fresh disposable SQL Server database named `StudyAIDb_Clean_{Guid:N}`,
 * stamps a per-run `StudyAI_OwnershipToken`, records it in the run manifest,
 * and returns a fail-loudly `cleanup()` callback that verifies exact name + ownership before dropping.
 */
export function createDisposableTestDatabase(
  callerContext = 'Playwright E2E',
  manifestPath = DEFAULT_MANIFEST_PATH
): DisposableTestDatabase {
  const template = process.env.E2E_SQL_SERVER_CONNECTION || process.env.ConnectionStrings__DefaultConnection || ''
  const server = extractConnPart(template, /(?:Server|Data\s+Source)\s*=\s*([^;]+)/i) || '.\\SQLEXPRESS'
  const userId = extractConnPart(template, /(?:User\s+Id|UID)\s*=\s*([^;]+)/i)
  const password = extractConnPart(template, /(?:Password|PWD)\s*=\s*([^;]+)/i)

  const guidN = crypto.randomUUID().replace(/-/g, '')
  const runId = crypto.randomUUID().replace(/-/g, '')
  const ownershipToken = crypto.randomUUID().replace(/-/g, '')
  const dbName = `StudyAIDb_Clean_${guidN}`

  const connectionString =
    userId && password
      ? `Server=${server};Database=${dbName};User Id=${userId};Password=${password};MultipleActiveResultSets=true;TrustServerCertificate=True`
      : `Server=${server};Database=${dbName};Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True`

  assertSafeTestDatabase(connectionString, callerContext)

  // Strict CREATE DATABASE (no IF NOT EXISTS) guarantees fresh ownership
  runSqlCmd(server, userId, password, `CREATE DATABASE [${dbName}];`)
  runSqlCmd(
    server,
    userId,
    password,
    `EXEC [${dbName}].sys.sp_addextendedproperty @name = N'StudyAI_OwnershipToken', @value = N'${ownershipToken}'; EXEC [${dbName}].sys.sp_addextendedproperty @name = N'StudyAI_RunId', @value = N'${runId}';`
  )

  const entries = readManifest(manifestPath)
  entries.push({
    dbName,
    runId,
    ownershipToken,
    pid: process.pid,
    server,
    callerContext,
    createdAt: new Date().toISOString(),
  })
  writeManifest(manifestPath, entries)

  let cleaned = false
  const cleanup = async () => {
    if (cleaned) return
    const currentEntries = readManifest(manifestPath)
    const ownedEntry = currentEntries.find(
      (e) => e.dbName === dbName && e.runId === runId && e.ownershipToken === ownershipToken
    )
    if (!ownedEntry) {
      throw new Error(
        `CRITICAL CLEANUP GUARD: Refusing to drop '${dbName}' because ownership manifest entry for run '${runId}' was not found.`
      )
    }

    const tokenMatches = verifyDbOwnershipToken(server, userId, password, dbName, ownershipToken)
    if (!tokenMatches) {
      throw new Error(
        `CRITICAL CLEANUP GUARD: Refusing to drop '${dbName}' because SQL StudyAI_OwnershipToken does not match run '${runId}'.`
      )
    }

    runSqlCmd(
      server,
      userId,
      password,
      `ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${dbName}];`
    )
    cleaned = true
    writeManifest(
      manifestPath,
      readManifest(manifestPath).filter((e) => !(e.dbName === dbName && e.ownershipToken === ownershipToken))
    )
  }

  return {
    dbName,
    runId,
    ownershipToken,
    connectionString,
    cleanup,
  }
}
