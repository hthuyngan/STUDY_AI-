import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync, spawn, ChildProcess } from 'child_process'
import { assertSafeTestDatabase, isAuthorizedTestDatabase } from './databaseSafetyGuard'

const GUID_N_OR_D_REGEX =
  /^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/
const VALID_MANIFEST_STATUSES = new Set(['provisioning', 'active', 'cleaning', 'failed_cleanup'])

export type SqlCmdRunner = (
  server: string,
  userId: string | undefined,
  password: string | undefined,
  query: string,
  database?: string
) => string

export interface KillProcessDeps {
  platform?: NodeJS.Platform
  spawnFn?: typeof spawn
  isPidAliveFn?: (pid: number) => boolean
  pollIntervalMs?: number
}

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

function readManifestFile(filePath: string, expectedFileName?: string): DisposableDbManifestEntry | null {
  if (!fs.existsSync(filePath)) return null
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown
    return validateManifestEntry(raw, expectedFileName)
  } catch {
    return null
  }
}

function assertValidatedDbIdentifier(dbName: string, callerContext: string): string {
  if (!isAuthorizedTestDatabase(dbName)) {
    assertSafeTestDatabase(`Server=.\\SQLEXPRESS;Database=${dbName};Trusted_Connection=True;`, callerContext)
  }
  return dbName.trim().replace(/^\[|\]$/g, '')
}

function validateManifestEntry(raw: unknown, expectedFileName?: string): DisposableDbManifestEntry | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const e = raw as Record<string, unknown>

  if (typeof e.runId !== 'string' || !GUID_N_OR_D_REGEX.test(e.runId.trim())) return null
  if (expectedFileName && expectedFileName !== `${e.runId.trim()}.json`) return null
  if (typeof e.ownershipToken !== 'string' || !GUID_N_OR_D_REGEX.test(e.ownershipToken.trim())) return null
  if (typeof e.databaseName !== 'string' || !isAuthorizedTestDatabase(e.databaseName)) return null
  if (typeof e.pid !== 'number' || !Number.isInteger(e.pid) || e.pid <= 0) return null
  if (
    typeof e.processStartTimeUtc !== 'string' ||
    e.processStartTimeUtc.trim().length === 0 ||
    Number.isNaN(Date.parse(e.processStartTimeUtc))
  ) {
    return null
  }
  if (typeof e.machineName !== 'string' || e.machineName.trim().length === 0) return null
  if (typeof e.server !== 'string' || e.server.trim().length === 0) return null
  if (typeof e.status !== 'string' || !VALID_MANIFEST_STATUSES.has(e.status)) return null
  if (typeof e.callerContext !== 'string' || e.callerContext.trim().length === 0) return null
  if (typeof e.createdAtUtc !== 'string' || Number.isNaN(Date.parse(e.createdAtUtc))) return null
  if (typeof e.updatedAtUtc !== 'string' || Number.isNaN(Date.parse(e.updatedAtUtc))) return null

  return raw as DisposableDbManifestEntry
}

function verifyDbOwnershipToken(
  server: string,
  userId: string | undefined,
  password: string | undefined,
  dbName: string,
  expectedToken: string,
  sqlRunner: SqlCmdRunner = runSqlCmd
): boolean {
  if (!expectedToken || !GUID_N_OR_D_REGEX.test(expectedToken.trim())) {
    return false
  }
  const safeDb = assertValidatedDbIdentifier(dbName, 'VerifyDbOwnershipToken')
  const existsOut = sqlRunner(
    server,
    userId,
    password,
    `SET NOCOUNT ON; SELECT CASE WHEN DB_ID('${safeDb}') IS NULL THEN '0' ELSE '1' END;`
  )
  if (existsOut.trim() !== '1') {
    throw new Error(`Disposable database '${safeDb}' does not exist during ownership verification.`)
  }
  const tokenOut = sqlRunner(
    server,
    userId,
    password,
    `SET NOCOUNT ON; SELECT ISNULL(CAST(value AS nvarchar(128)), '') FROM [${safeDb}].sys.extended_properties WHERE class = 0 AND name = N'StudyAI_OwnershipToken';`
  )
  const actual = tokenOut.trim()
  return actual.length > 0 && actual === expectedToken.trim()
}

function countActiveSqlSessions(
  server: string,
  userId: string | undefined,
  password: string | undefined,
  dbName: string,
  sqlRunner: SqlCmdRunner = runSqlCmd
): number {
  const safeDb = assertValidatedDbIdentifier(dbName, 'CountActiveSqlSessions')
  const out = sqlRunner(
    server,
    userId,
    password,
    `SET NOCOUNT ON; SELECT COUNT(*) FROM sys.dm_exec_sessions WHERE database_id = DB_ID('${safeDb}') AND session_id <> @@SPID;`
  )
  const parsed = Number.parseInt(out.trim(), 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

async function safeDropOwnedDatabase(
  manifestDir: string,
  entry: DisposableDbManifestEntry,
  userId: string | undefined,
  password: string | undefined,
  sqlRunner: SqlCmdRunner = runSqlCmd
): Promise<void> {
  const manifestPath = getManifestFilePath(manifestDir, entry.runId)
  const diskEntry = readManifestFile(manifestPath, `${entry.runId}.json`)
  if (
    !diskEntry ||
    diskEntry.databaseName !== entry.databaseName ||
    diskEntry.ownershipToken !== entry.ownershipToken
  ) {
    throw new Error(
      `CRITICAL CLEANUP GUARD: Refusing to drop '${entry.databaseName}' because per-run manifest ownership for run '${entry.runId}' was not verified.`
    )
  }

  const safeDb = assertSafeTestDatabase(
    `Server=${entry.server};Database=${entry.databaseName};Trusted_Connection=True;`,
    'SafeDrop'
  )
  diskEntry.status = 'cleaning'
  writeManifestAtomic(manifestDir, diskEntry)

  try {
    const tokenMatches = verifyDbOwnershipToken(
      entry.server,
      userId,
      password,
      safeDb,
      entry.ownershipToken,
      sqlRunner
    )
    if (!tokenMatches) {
      throw new Error(
        `CRITICAL CLEANUP GUARD: Refusing to drop '${safeDb}' because SQL StudyAI_OwnershipToken does not match run '${entry.runId}'.`
      )
    }

    let activeSessions = countActiveSqlSessions(entry.server, userId, password, safeDb, sqlRunner)
    for (let i = 0; i < 5 && activeSessions > 0; i++) {
      await new Promise((r) => setTimeout(r, 200))
      activeSessions = countActiveSqlSessions(entry.server, userId, password, safeDb, sqlRunner)
    }

    if (activeSessions > 0) {
      throw new Error(
        `CRITICAL CLEANUP GUARD: Refusing to drop '${safeDb}' while ${activeSessions} active SQL session(s) remain open (SINGLE_USER WITH ROLLBACK IMMEDIATE is forbidden).`
      )
    }

    sqlRunner(
      entry.server,
      userId,
      password,
      `SET LOCK_TIMEOUT 3000; DROP DATABASE [${safeDb}];`
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
 * Recovers and drops ONLY disposable databases recorded in per-run manifests whose schema, GUIDs,
 * and server scope are valid, whose owning process is dead (verifying PID + processStartTimeUtc + machineName),
 * whose SQL `StudyAI_OwnershipToken` matches, and that have zero active SQL sessions.
 * Never drops unowned/orphan `StudyAIDb_Clean_*` databases or non-disposable databases.
 */
export async function recoverInterruptedOwnedDatabases(
  manifestDir = DEFAULT_MANIFEST_DIR,
  templateConnection = process.env.E2E_SQL_SERVER_CONNECTION || process.env.ConnectionStrings__DefaultConnection || '',
  pidAliveCheck: (pid: number, expectedStartTimeUtc?: string, machineName?: string) => boolean = isOwnerProcessAlive,
  sqlRunner: SqlCmdRunner = runSqlCmd
): Promise<{ recovered: string[]; skipped: string[] }> {
  if (!fs.existsSync(manifestDir)) {
    return { recovered: [], skipped: [] }
  }

  const expectedServer = (
    extractConnPart(templateConnection, /(?:Server|Data\s+Source)\s*=\s*([^;]+)/i) || '.\\SQLEXPRESS'
  )
    .trim()
    .toLowerCase()
  const userId = extractConnPart(templateConnection, /(?:User\s+Id|UID)\s*=\s*([^;]+)/i)
  const password = extractConnPart(templateConnection, /(?:Password|PWD)\s*=\s*([^;]+)/i)
  const recovered: string[] = []
  const skipped: string[] = []

  for (const fileName of fs.readdirSync(manifestDir)) {
    if (!fileName.endsWith('.json') || fileName.includes('.tmp.')) continue
    const filePath = path.join(manifestDir, fileName)
    const entry = readManifestFile(filePath, fileName)
    if (!entry) {
      skipped.push(fileName)
      continue
    }

    if (entry.server.trim().toLowerCase() !== expectedServer) {
      skipped.push(entry.databaseName)
      continue
    }

    let safeDb: string
    try {
      safeDb = assertSafeTestDatabase(
        `Server=${entry.server};Database=${entry.databaseName};Trusted_Connection=True;`,
        'InterruptedRunRecovery'
      )
    } catch {
      skipped.push(entry.databaseName)
      continue
    }

    if (pidAliveCheck(entry.pid, entry.processStartTimeUtc, entry.machineName)) {
      skipped.push(safeDb)
      continue
    }

    const existsOut = sqlRunner(
      entry.server,
      userId,
      password,
      `SET NOCOUNT ON; SELECT CASE WHEN DB_ID('${safeDb}') IS NULL THEN '0' ELSE '1' END;`
    )
    if (existsOut.trim() !== '1') {
      fs.unlinkSync(filePath)
      continue
    }

    const ownsDb = verifyDbOwnershipToken(
      entry.server,
      userId,
      password,
      safeDb,
      entry.ownershipToken,
      sqlRunner
    )
    if (!ownsDb) {
      skipped.push(safeDb)
      continue
    }

    if (countActiveSqlSessions(entry.server, userId, password, safeDb, sqlRunner) > 0) {
      skipped.push(safeDb)
      continue
    }

    await safeDropOwnedDatabase(manifestDir, entry, userId, password, sqlRunner)
    recovered.push(safeDb)
  }

  return { recovered, skipped }
}

function defaultIsPidAlive(pid: number): boolean {
  if (!pid || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Terminates a spawned child process tree, awaits termination command completion and target process exit,
 * verifies the process is no longer alive, and throws on failure or timeout.
 */
export async function killProcessTreeAndWait(
  proc: ChildProcess | undefined,
  timeoutMs = 5000,
  deps: KillProcessDeps = {}
): Promise<void> {
  if (!proc || !proc.pid) return

  const platform = deps.platform ?? process.platform
  const spawnFn = deps.spawnFn ?? spawn
  const isPidAliveFn = deps.isPidAliveFn ?? defaultIsPidAlive
  const pollIntervalMs = deps.pollIntervalMs ?? 50
  const pid = proc.pid
  const hasExited = () => proc.exitCode !== null || proc.signalCode !== null

  if (hasExited() && !isPidAliveFn(pid)) return

  const deadline = Date.now() + timeoutMs

  const exitPromise = new Promise<void>((resolve, reject) => {
    if (hasExited()) {
      resolve()
      return
    }
    const timer = setTimeout(() => {
      proc.removeListener('exit', onExit)
      proc.removeListener('close', onExit)
      reject(new Error(`Process ${pid} did not exit within ${timeoutMs}ms.`))
    }, timeoutMs)

    const onExit = () => {
      clearTimeout(timer)
      proc.removeListener('exit', onExit)
      proc.removeListener('close', onExit)
      resolve()
    }

    proc.once('exit', onExit)
    proc.once('close', onExit)
  })

  if (platform === 'win32') {
    await new Promise<void>((resolve, reject) => {
      const killer = spawnFn('taskkill', ['/pid', pid.toString(), '/T', '/F'], {
        stdio: 'ignore',
      })
      const killTimer = setTimeout(() => {
        reject(new Error(`taskkill timed out for PID ${pid} after ${timeoutMs}ms.`))
      }, timeoutMs)

      killer.once('error', (err) => {
        clearTimeout(killTimer)
        if (hasExited() && !isPidAliveFn(pid)) {
          resolve()
        } else {
          reject(new Error(`taskkill failed to start for PID ${pid}: ${err.message}`))
        }
      })

      killer.once('exit', (code) => {
        clearTimeout(killTimer)
        if (code === 0 || (hasExited() && !isPidAliveFn(pid))) {
          resolve()
        } else {
          reject(new Error(`taskkill exited with code ${code} for PID ${pid}.`))
        }
      })
    })
  } else {
    try {
      proc.kill('SIGKILL')
    } catch (err) {
      if (!hasExited() || isPidAliveFn(pid)) {
        throw err
      }
    }
  }

  await exitPromise

  while (isPidAliveFn(pid) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollIntervalMs))
  }

  if (!hasExited() || isPidAliveFn(pid)) {
    throw new Error(`Process ${pid} remained alive after termination verification.`)
  }
}

/**
 * Recovers interrupted owned runs via `recoverInterruptedOwnedDatabases()`, creates a fresh disposable
 * `StudyAIDb_Clean_{Guid:N}`, stamps `StudyAI_OwnershipToken` + `StudyAI_RunId`, writes an atomic per-run
 * manifest, and returns a fail-loudly `cleanup()` callback.
 */
export async function createDisposableTestDatabase(
  callerContext = 'Playwright E2E',
  manifestDir = DEFAULT_MANIFEST_DIR,
  skipAutoRecovery = false
): Promise<DisposableTestDatabase> {
  const template = process.env.E2E_SQL_SERVER_CONNECTION || process.env.ConnectionStrings__DefaultConnection || ''
  const server = extractConnPart(template, /(?:Server|Data\s+Source)\s*=\s*([^;]+)/i) || '.\\SQLEXPRESS'
  const userId = extractConnPart(template, /(?:User\s+Id|UID)\s*=\s*([^;]+)/i)
  const password = extractConnPart(template, /(?:Password|PWD)\s*=\s*([^;]+)/i)

  if (!skipAutoRecovery) {
    await recoverInterruptedOwnedDatabases(manifestDir, template)
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
