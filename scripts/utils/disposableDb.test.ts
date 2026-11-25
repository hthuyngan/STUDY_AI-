import { describe, it, expect } from 'bun:test'
import { EventEmitter } from 'events'
import type { ChildProcess } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  createDisposableTestDatabase,
  isOwnerProcessAlive,
  killProcessTreeAndWait,
  parseValidatedSqlConnection,
  recoverInterruptedOwnedDatabases,
  type SqlCmdRunner,
} from './disposableDb'

function makeManifest(overrides: Record<string, unknown> = {}) {
  const runId = (overrides.runId as string) ?? '11111111111111111111111111111111'
  return {
    runId,
    databaseName: 'StudyAIDb_Clean_11111111222233334444555566667777',
    ownershipToken: '22222222222222222222222222222222',
    pid: 999999,
    processStartTimeUtc: '2020-01-01T00:00:00.000Z',
    machineName: os.hostname(),
    status: 'active',
    callerContext: 'bun-test',
    server: '.\\SQLEXPRESS',
    createdAtUtc: new Date().toISOString(),
    updatedAtUtc: new Date().toISOString(),
    ...overrides,
  }
}

class FakeChildProcess extends EventEmitter {
  pid: number
  exitCode: number | null = null
  signalCode: NodeJS.Signals | null = null
  killCalled = false

  constructor(pid = 43210) {
    super()
    this.pid = pid
  }

  kill(signal?: NodeJS.Signals): boolean {
    this.killCalled = true
    this.signalCode = signal ?? 'SIGKILL'
    return true
  }
}

describe('Disposable DB Lifecycle, PID Reuse & Per-Run Manifest Guard', () => {
  it('parseValidatedSqlConnection rejects StudyAIDb, StudyAIDb_E2E, and StudyAIDb_Dev', () => {
    expect(() =>
      parseValidatedSqlConnection('Server=.\\SQLEXPRESS;Database=StudyAIDb;Trusted_Connection=True;')
    ).toThrow(/strictly FORBIDDEN/i)

    expect(() =>
      parseValidatedSqlConnection('Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;')
    ).toThrow(/NOT an authorized test database/i)

    expect(() =>
      parseValidatedSqlConnection('Server=.\\SQLEXPRESS;Database=StudyAIDb_Dev;Trusted_Connection=True;')
    ).toThrow(/NOT an authorized test database/i)
  })

  it('isOwnerProcessAlive detects PID reuse when process start time differs by > 2s', () => {
    const alive = isOwnerProcessAlive(
      process.pid,
      '2020-01-01T00:00:00.000Z',
      os.hostname(),
      () => new Date().toISOString()
    )
    expect(alive).toBe(false)

    const nowIso = new Date().toISOString()
    const matching = isOwnerProcessAlive(process.pid, nowIso, os.hostname(), () => nowIso)
    expect(matching).toBe(true)
  })

  it('recoverInterruptedOwnedDatabases skips live PIDs using per-run manifest dir', async () => {
    const tmpDir = path.join(os.tmpdir(), `studyai-test-runs-live-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })
    const entry = makeManifest({
      pid: process.pid,
      processStartTimeUtc: new Date().toISOString(),
    })
    fs.writeFileSync(path.join(tmpDir, `${entry.runId}.json`), JSON.stringify(entry))
    try {
      const queries: string[] = []
      const sqlSpy: SqlCmdRunner = (_s, _u, _p, q) => {
        queries.push(q)
        return ''
      }
      const res = await recoverInterruptedOwnedDatabases(tmpDir, '', () => true, sqlSpy)
      expect(res.recovered).toEqual([])
      expect(res.skipped).toEqual([entry.databaseName])
      expect(queries.some((q) => /DROP\s+DATABASE/i.test(q))).toBe(false)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  it('recoverInterruptedOwnedDatabases rejects all negative manifest/ownership cases without executing DROP DATABASE', async () => {
    const cases: Array<{ name: string; fileName: string; rawContent: string; sqlPropertyValue?: string }> = [
      {
        name: 'StudyAIDb',
        fileName: '11111111111111111111111111111111.json',
        rawContent: JSON.stringify(makeManifest({ databaseName: 'StudyAIDb' })),
      },
      {
        name: 'StudyAIDb_E2E',
        fileName: '11111111111111111111111111111111.json',
        rawContent: JSON.stringify(makeManifest({ databaseName: 'StudyAIDb_E2E' })),
      },
      {
        name: 'Arbitrary database',
        fileName: '11111111111111111111111111111111.json',
        rawContent: JSON.stringify(makeManifest({ databaseName: 'master' })),
      },
      {
        name: 'Empty ownership token',
        fileName: '11111111111111111111111111111111.json',
        rawContent: JSON.stringify(makeManifest({ ownershipToken: '' })),
      },
      {
        name: 'Missing SQL ownership property',
        fileName: '11111111111111111111111111111111.json',
        rawContent: JSON.stringify(makeManifest()),
        sqlPropertyValue: '',
      },
      {
        name: 'Invalid GUID in databaseName',
        fileName: '11111111111111111111111111111111.json',
        rawContent: JSON.stringify(makeManifest({ databaseName: 'StudyAIDb_Clean_not-a-valid-guid' })),
      },
      {
        name: 'Malformed manifest JSON',
        fileName: '11111111111111111111111111111111.json',
        rawContent: '{bad json',
      },
      {
        name: 'Legacy manifest schema',
        fileName: '11111111111111111111111111111111.json',
        rawContent: JSON.stringify({
          dbName: 'StudyAIDb_Clean_11111111222233334444555566667777',
          token: '22222222222222222222222222222222',
        }),
      },
      {
        name: 'Server scope mismatch',
        fileName: '11111111111111111111111111111111.json',
        rawContent: JSON.stringify(makeManifest({ server: 'OTHER_HOST\\SQLEXPRESS' })),
      },
    ]

    for (const tc of cases) {
      const tmpDir = path.join(os.tmpdir(), `studyai-neg-${Date.now()}-${Math.random().toString(16).slice(2)}`)
      fs.mkdirSync(tmpDir, { recursive: true })
      fs.writeFileSync(path.join(tmpDir, tc.fileName), tc.rawContent, 'utf8')

      const queries: string[] = []
      const sqlSpy: SqlCmdRunner = (_server, _u, _p, query) => {
        queries.push(query)
        if (/SELECT CASE WHEN DB_ID/i.test(query)) return '1'
        if (/StudyAI_OwnershipToken/i.test(query)) return tc.sqlPropertyValue ?? ''
        if (/dm_exec_sessions/i.test(query)) return '0'
        return ''
      }

      try {
        const res = await recoverInterruptedOwnedDatabases(
          tmpDir,
          'Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_11111111222233334444555566667777;Trusted_Connection=True;',
          () => false,
          sqlSpy
        )
        expect(res.recovered, `Case '${tc.name}' must not recover`).toEqual([])
        expect(
          queries.some((q) => /DROP\s+DATABASE/i.test(q)),
          `Case '${tc.name}' must never execute DROP DATABASE`
        ).toBe(false)
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      }
    }
  })

  it('createDisposableTestDatabase invokes single recovery path and cleans up both dead and new DBs', async () => {
    const tmpDir = path.join(os.tmpdir(), `studyai-prov-rec-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })

    // 1. Provision an owned DB, then simulate abrupt crash by leaving its manifest with a dead PID
    const crashedDb = await createDisposableTestDatabase('crashed-run', tmpDir, true)
    const crashedManifest = JSON.parse(fs.readFileSync(crashedDb.manifestPath, 'utf8'))
    crashedManifest.pid = 999999
    crashedManifest.processStartTimeUtc = '2020-01-01T00:00:00.000Z'
    fs.writeFileSync(crashedDb.manifestPath, JSON.stringify(crashedManifest, null, 2), 'utf8')

    // 2. Provision a second DB with auto-recovery enabled -> must recover crashedDb via recoverInterruptedOwnedDatabases
    const freshDb = await createDisposableTestDatabase('fresh-run', tmpDir, false)
    try {
      expect(fs.existsSync(crashedDb.manifestPath)).toBe(false)
      expect(fs.existsSync(freshDb.manifestPath)).toBe(true)
    } finally {
      await freshDb.cleanup()
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})

describe('killProcessTreeAndWait Verified Process Termination', () => {
  it('resolves when taskkill exits 0, process emits exit, and PID is no longer alive', async () => {
    const proc = new FakeChildProcess(50001)
    let alive = true

    const fakeSpawn = (() => {
      const killer = new EventEmitter()
      setTimeout(() => {
        alive = false
        proc.exitCode = 0
        proc.emit('exit', 0, null)
        killer.emit('exit', 0, null)
      }, 10)
      return killer as unknown as ChildProcess
    }) as unknown as typeof import('child_process').spawn

    await expect(
      killProcessTreeAndWait(proc as unknown as ChildProcess, 1000, {
        platform: 'win32',
        spawnFn: fakeSpawn,
        isPidAliveFn: () => alive,
        pollIntervalMs: 5,
      })
    ).resolves.toBeUndefined()
  })

  it('throws when termination command fails while process is still alive', async () => {
    const proc = new FakeChildProcess(50002)

    const fakeSpawn = (() => {
      const killer = new EventEmitter()
      setTimeout(() => {
        killer.emit('exit', 1, null)
      }, 10)
      return killer as unknown as ChildProcess
    }) as unknown as typeof import('child_process').spawn

    await expect(
      killProcessTreeAndWait(proc as unknown as ChildProcess, 500, {
        platform: 'win32',
        spawnFn: fakeSpawn,
        isPidAliveFn: () => true,
        pollIntervalMs: 5,
      })
    ).rejects.toThrow(/taskkill exited with code 1/i)
  })

  it('throws on termination timeout instead of resolving silently', async () => {
    const proc = new FakeChildProcess(50003)

    const fakeSpawn = (() => {
      const killer = new EventEmitter()
      setTimeout(() => killer.emit('exit', 0, null), 5)
      return killer as unknown as ChildProcess
    }) as unknown as typeof import('child_process').spawn

    await expect(
      killProcessTreeAndWait(proc as unknown as ChildProcess, 50, {
        platform: 'win32',
        spawnFn: fakeSpawn,
        isPidAliveFn: () => true,
        pollIntervalMs: 5,
      })
    ).rejects.toThrow(/did not exit within 50ms/i)
  })

  it('throws when process remains alive at OS level after exit event', async () => {
    const proc = new FakeChildProcess(50004)

    const fakeSpawn = (() => {
      const killer = new EventEmitter()
      setTimeout(() => {
        proc.exitCode = 0
        proc.emit('exit', 0, null)
        killer.emit('exit', 0, null)
      }, 5)
      return killer as unknown as ChildProcess
    }) as unknown as typeof import('child_process').spawn

    await expect(
      killProcessTreeAndWait(proc as unknown as ChildProcess, 60, {
        platform: 'win32',
        spawnFn: fakeSpawn,
        isPidAliveFn: () => true,
        pollIntervalMs: 10,
      })
    ).rejects.toThrow(/remained alive/i)
  })

  it('prevents database cleanup from being attempted when termination is unverified', async () => {
    const proc = new FakeChildProcess(50005)
    let cleanupCalled = false
    const fakeCleanup = async () => {
      cleanupCalled = true
    }

    const fakeSpawn = (() => {
      const killer = new EventEmitter()
      setTimeout(() => killer.emit('exit', 128, null), 5)
      return killer as unknown as ChildProcess
    }) as unknown as typeof import('child_process').spawn

    await expect(
      (async () => {
        await killProcessTreeAndWait(proc as unknown as ChildProcess, 200, {
          platform: 'win32',
          spawnFn: fakeSpawn,
          isPidAliveFn: () => true,
          pollIntervalMs: 5,
        })
        await fakeCleanup()
      })()
    ).rejects.toThrow(/taskkill exited with code 128/i)

    expect(cleanupCalled).toBe(false)
  })
})
