import crypto from 'crypto'
import { execFileSync } from 'child_process'
import { assertSafeTestDatabase } from './databaseSafetyGuard'

export interface DisposableTestDatabase {
  dbName: string
  connectionString: string
  cleanup: () => Promise<void>
}

function extractConnPart(connStr: string, keyPattern: RegExp): string | undefined {
  const m = connStr.match(keyPattern)
  return m?.[1]?.trim()
}

function runSqlCmd(server: string, userId: string | undefined, password: string | undefined, query: string) {
  const args = ['-S', server, '-C', '-b']
  if (userId && password) {
    args.push('-U', userId, '-P', password)
  } else {
    args.push('-E')
  }
  args.push('-Q', query)
  execFileSync('sqlcmd', args, { stdio: 'pipe' })
}

/**
 * Creates a fresh disposable SQL Server database named `StudyAIDb_Clean_{Guid:N}`
 * for isolated Playwright/E2E runs, validates it via `assertSafeTestDatabase`,
 * and returns a `cleanup()` callback to drop it in `finally`.
 */
export function createDisposableTestDatabase(callerContext = 'Playwright E2E'): DisposableTestDatabase {
  const template = process.env.E2E_SQL_SERVER_CONNECTION || process.env.ConnectionStrings__DefaultConnection || ''
  const server = extractConnPart(template, /(?:Server|Data\s+Source)\s*=\s*([^;]+)/i) || '.\\SQLEXPRESS'
  const userId = extractConnPart(template, /(?:User\s+Id|UID)\s*=\s*([^;]+)/i)
  const password = extractConnPart(template, /(?:Password|PWD)\s*=\s*([^;]+)/i)

  const guidN = crypto.randomUUID().replace(/-/g, '')
  const dbName = `StudyAIDb_Clean_${guidN}`

  const connectionString =
    userId && password
      ? `Server=${server};Database=${dbName};User Id=${userId};Password=${password};MultipleActiveResultSets=true;TrustServerCertificate=True`
      : `Server=${server};Database=${dbName};Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True`

  assertSafeTestDatabase(connectionString, callerContext)
  runSqlCmd(server, userId, password, `CREATE DATABASE [${dbName}];`)

  return {
    dbName,
    connectionString,
    cleanup: async () => {
      try {
        runSqlCmd(
          server,
          userId,
          password,
          `IF DB_ID('${dbName}') IS NOT NULL BEGIN ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${dbName}]; END`
        )
      } catch (err) {
        console.error(`[Warning] Failed to drop disposable database ${dbName}:`, err)
      }
    },
  }
}
