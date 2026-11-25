import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync, spawn, ChildProcess } from 'child_process'
import { assertSafeTestDatabase } from './databaseSafetyGuard'

export interface DisposableDbManifestEntry {
  runId: string
  databaseName: string
  ownershipToken: string
  pid: number
  processStartTimeUtc: string
  machineName: string
  status: 'provisioning' | 'active' | 'cleaning' | 'failed_cleanup'
  callerContext: string
  server: string
  createdAtUtc: string
  updatedAtUtc: string
}

export interface DisposableTestDatabase {
  dbName: string
  runId: string
  ownershipToken: string
  manifestPath: string
  connectionString: string
  cleanup: () => Promise<void>
}

export const DEFAULT_MANIFEST_DIR = path.join(os.tmpdir(), 'studyai-disposable-runs')

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

export function getProcessStartTimeUtcIso(pid: number): string | null {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync(
        'powershell',
        ['-NoProfile', '-Command', `(Get-Process -Id ${pid} -ErrorAction Stop).StartTime.ToUniversalTime().ToString('o')`],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      ).trim()
      return out || null
    }
    const out = execFileSync('ps', ['-p', String(pid), '-o', 'lstart='], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    return out ? new Date(out).toISOString() : null
  } catch {
    return null
  }
}

export function isOwnerProcessAlive(
  pid: number,
  expectedStartTimeUtc?: string,
  machineName?: string,
  startTimeLookup: (p: number) => string | null = getProcessStartTimeUtcIso
): boolean {
  if (machineName && machineName.toLowerCase() !== os.hostname().toLowerCase()) {
    return true
  }
  if (!pid || pid <= 0) return false
  try {
    process.kill(pid, 0)
  } catch {
    return false
  }

  if (expectedStartTimeUtc) {
    const actualIso = startTimeLookup(pid)
    if (!actualIso) return false
    const diffMs = Math.abs(Date.parse(actualIso) - Date.parse(expectedStartTimeUtc))
    if (!Number.isNaN(diffMs) && diffMs > 2000) {
      // PID was reused by a newer process -> original owner is dead
      return false
    }
  }
  return true
}

function getManifestFilePath(manifestDir: string, runId: string): string {
  return path.join(manifestDir, `${runId}.json`)
}

function writeManifestAtomic(manifestDir: string, entry: DisposableDbManifestEntry): string {
  fs.mkdirSync(manifestDir, { recursive: true })
  entry.updatedAtUtc = new Date().toISOString()
  const targetPath = getManifestFilePath(manifestDir, entry.runId)
  const tempPath = `${targetPath}.tmp.${process.pid}.${crypto.randomUUID().replace(/-/g, '')}`
  fs.writeFileSync(tempPath, JSON.stringify(entry, null, 2), 'utf8')
  fs.renameSync(tempPath, targetPath)
  return targetPath
}

function readManifestFile(filePath: string): DisposableDbManifestEntry | null {
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as DisposableDbManifestEntry
  } catch {
    return null
  }
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

function countActiveSqlSessions(
  server: string,
  userId: string | undefined,
  password: string | undefined,
  dbName: string
): number {
  const out = runSqlCmd(
    server,
    userId,
    password,
    `SET NOCOUNT ON; SELECT COUNT(*) FROM sys.dm_exec_sessions WHERE database_id = DB_ID('${dbName}') AND session_id <> @@SPID;`
  )
  const parsed = Number.parseInt(out.trim(), 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

async function safeDropOwnedDatabase(
  manifestDir: string,
  entry: DisposableDbManifestEntry,
  userId: string | undefined,
  password: string | undefined
): Promise<void> {
  const manifestPath = getManifestFilePath(manifestDir, entry.runId)
  const diskEntry = readManifestFile(manifestPath)
  if (
    !diskEntry ||
    diskEntry.databaseName !== entry.databaseName ||
    diskEntry.ownershipToken !== entry.ownershipToken
  ) {
    throw new Error(
      `CRITICAL CLEANUP GUARD: Refusing to drop '${entry.databaseName}' because per-run manifest ownership for run '${entry.runId}' was not verified.`
    )
  }

  assertSafeTestDatabase(`Server=${entry.server};Database=${entry.databaseName};Trusted_Connection=True;`, 'SafeDrop')
  diskEntry.status = 'cleaning'
  writeManifestAtomic(manifestDir, diskEntry)

  try {
    const tokenMatches = verifyDbOwnershipToken(entry.server, userId, password, entry.databaseName, entry.ownershipToken)
    if (!tokenMatches) {
      throw new Error(
        `CRITICAL CLEANUP GUARD: Refusing to drop '${entry.databaseName}' because SQL StudyAI_OwnershipToken does not match run '${entry.runId}'.`
      )
    }

    let activeSessions = countActiveSqlSessions(entry.server, userId, password, entry.databaseName)
    for (let i = 0; i < 5 && activeSessions > 0; i++) {
      await new Promise((r) => setTimeout(r, 200))
      activeSessions = countActiveSqlSessions(entry.server, userId, password, entry.databaseName)
    }

    if (activeSessions > 0) {
      throw new Error(
        `CRITICAL CLEANUP GUARD: Refusing to drop '${entry.databaseName}' while ${activeSessions} active SQL session(s) remain open (SINGLE_USER WITH ROLLBACK IMMEDIATE is forbidden).`
      )
    }

    runSqlCmd(
      entry.server,
      userId,
      password,
      `SET LOCK_TIMEOUT 3000; DROP DATABASE [${entry.databaseName}];`
    )

    if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath)
    }
  } catch (err) {
    diskEntry.status = 'failed_cleanup'
    writeManifestAtomic(manifestDir, diskEntry)
    throw err
  }
}

/**
 * Recovers and drops ONLY disposable databases recorded in per-run manifests whose owning process is dead
 * (verifying PID + processStartTimeUtc + machineName), whose SQL `StudyAI_OwnershipToken` matches,
 * and that have zero active SQL sessions. Never drops unowned/orphan `StudyAIDb_Clean_*` databases.
 */
export async function recoverInterruptedOwnedDatabases(
  manifestDir = DEFAULT_MANIFEST_DIR,
  templateConnection = process.env.E2E_SQL_SERVER_CONNECTION || process.env.ConnectionStrings__DefaultConnection || '',
  pidAliveCheck: (pid: number, expectedStartTimeUtc?: string, machineName?: string) => boolean = isOwnerProcessAlive
): Promise<{ recovered: string[]; skipped: string[] }> {
  if (!fs.existsSync(manifestDir)) {
    return { recovered: [], skipped: [] }
  }

  const userId = extractConnPart(templateConnection, /(?:User\s+Id|UID)\s*=\s*([^;]+)/i)
  const password = extractConnPart(templateConnection, /(?:Password|PWD)\s*=\s*([^;]+)/i)
  const recovered: string[] = []
  const skipped: string[] = []

  for (const fileName of fs.readdirSync(manifestDir)) {
    if (!fileName.endsWith('.json') || fileName.includes('.tmp.')) continue
    const filePath = path.join(manifestDir, fileName)
    const entry = readManifestFile(filePath)
    if (!entry || !entry.databaseName || !entry.ownershipToken) continue

    try {
      assertSafeTestDatabase(`Server=${entry.server};Database=${entry.databaseName};Trusted_Connection=True;`, 'InterruptedRunRecovery')
    } catch {
      skipped.push(entry.databaseName)
      continue
    }

    if (pidAliveCheck(entry.pid, entry.processStartTimeUtc, entry.machineName)) {
      skipped.push(entry.databaseName)
      continue
    }

    const existsOut = runSqlCmd(
      entry.server,
      userId,
      password,
      `SET NOCOUNT ON; SELECT CASE WHEN DB_ID('${entry.databaseName}') IS NULL THEN '0' ELSE '1' END;`
    )
    if (existsOut.trim() !== '1') {
      fs.unlinkSync(filePath)
      continue
    }

    const ownsDb = verifyDbOwnershipToken(entry.server, userId, password, entry.databaseName, entry.ownershipToken)
    if (!ownsDb) {
      skipped.push(entry.databaseName)
      continue
    }

    if (countActiveSqlSessions(entry.server, userId, password, entry.databaseName) > 0) {
      skipped.push(entry.databaseName)
      continue
    }

    await safeDropOwnedDatabase(manifestDir, entry, userId, password)
    recovered.push(entry.databaseName)
  }

  return { recovered, skipped }
}

/**
 * Terminates a spawned child process tree and awaits process exit before SQL cleanup.
 */
export async function killProcessTreeAndWait(proc: ChildProcess | undefined, timeoutMs = 5000): Promise<void> {
  if (!proc || !proc.pid) return
  if (proc.exitCode !== null) return

  const exitPromise = new Promise<void>((resolve) => {
    proc.once('exit', () => resolve())
    setTimeout(() => resolve(), timeoutMs)
  })

  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', proc.pid.toString(), '/T', '/F'])
    } else {
      proc.kill('SIGKILL')
    }
  } catch {
    // ignore if already exited
  }

  await exitPromise
}

/**
 * Recovers interrupted owned runs, creates a fresh disposable `StudyAIDb_Clean_{Guid:N}`,
 * stamps `StudyAI_OwnershipToken` + `StudyAI_RunId`, writes an atomic per-run manifest,
 * and returns a fail-loudly `cleanup()` callback.
 */
export function createDisposableTestDatabase(
  callerContext = 'Playwright E2E',
  manifestDir = DEFAULT_MANIFEST_DIR,
  skipAutoRecovery = false
): DisposableTestDatabase {
  const template = process.env.E2E_SQL_SERVER_CONNECTION || process.env.ConnectionStrings__DefaultConnection || ''
  const server = extractConnPart(template, /(?:Server|Data\s+Source)\s*=\s*([^;]+)/i) || '.\\SQLEXPRESS'
  const userId = extractConnPart(template, /(?:User\s+Id|UID)\s*=\s*([^;]+)/i)
  const password = extractConnPart(template, /(?:Password|PWD)\s*=\s*([^;]+)/i)

  if (!skipAutoRecovery) {
    // Best-effort pre-provisioning recovery of dead owned runs only
    try {
      const recoveredRuns = fs.existsSync(manifestDir) ? fs.readdirSync(manifestDir).filter((f) => f.endsWith('.json') && !f.includes('.tmp.')) : []
      for (const fileName of recoveredRuns) {
        const entry = readManifestFile(path.join(manifestDir, fileName))
        if (!entry || isOwnerProcessAlive(entry.pid, entry.processStartTimeUtc, entry.machineName)) continue
        const existsOut = runSqlCmd(
          entry.server,
          userId,
          password,
          `SET NOCOUNT ON; SELECT CASE WHEN DB_ID('${entry.databaseName}') IS NULL THEN '0' ELSE '1' END;`
        )
        if (existsOut.trim() !== '1') {
          fs.unlinkSync(path.join(manifestDir, fileName))
          continue
        }
        if (
          verifyDbOwnershipToken(entry.server, userId, password, entry.databaseName, entry.ownershipToken) &&
          countActiveSqlSessions(entry.server, userId, password, entry.databaseName) === 0
        ) {
          runSqlCmd(entry.server, userId, password, `SET LOCK_TIMEOUT 3000; DROP DATABASE [${entry.databaseName}];`)
          fs.unlinkSync(path.join(manifestDir, fileName))
        }
      }
    } catch {
      // Do not silently drop anything if verification fails
    }
  }

  const guidN = crypto.randomUUID().replace(/-/g, '')
  const runId = crypto.randomUUID().replace(/-/g, '')
  const ownershipToken = crypto.randomUUID().replace(/-/g, '')
  const dbName = `StudyAIDb_Clean_${guidN}`

  const connectionString =
    userId && password
      ? `Server=${server};Database=${dbName};User Id=${userId};Password=${password};MultipleActiveResultSets=true;TrustServerCertificate=True`
      : `Server=${server};Database=${dbName};Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True`

  assertSafeTestDatabase(connectionString, callerContext)

  const entry: DisposableDbManifestEntry = {
    runId,
    databaseName: dbName,
    ownershipToken,
    pid: process.pid,
    processStartTimeUtc: getProcessStartTimeUtcIso(process.pid) || new Date().toISOString(),
    machineName: os.hostname(),
    status: 'provisioning',
    callerContext,
    server,
    createdAtUtc: new Date().toISOString(),
    updatedAtUtc: new Date().toISOString(),
  }

  const manifestPath = writeManifestAtomic(manifestDir, entry)

  runSqlCmd(server, userId, password, `CREATE DATABASE [${dbName}];`)
  runSqlCmd(
    server,
    userId,
    password,
    `EXEC [${dbName}].sys.sp_addextendedproperty @name = N'StudyAI_OwnershipToken', @value = N'${ownershipToken}'; EXEC [${dbName}].sys.sp_addextendedproperty @name = N'StudyAI_RunId', @value = N'${runId}';`
  )

  entry.status = 'active'
  writeManifestAtomic(manifestDir, entry)

  let cleaned = false
  const cleanup = async () => {
    if (cleaned) return
    await safeDropOwnedDatabase(manifestDir, entry, userId, password)
    cleaned = true
  }

  return {
    dbName,
    runId,
    ownershipToken,
    manifestPath,
    connectionString,
    cleanup,
  }
}
