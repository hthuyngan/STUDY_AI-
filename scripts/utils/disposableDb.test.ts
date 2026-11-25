import { describe, it, expect } from 'bun:test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  isOwnerProcessAlive,
  parseValidatedSqlConnection,
  recoverInterruptedOwnedDatabases,
} from './disposableDb'

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
    const tmpDir = path.join(os.tmpdir(), `studyai-test-runs-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })
    const dbName = 'StudyAIDb_Clean_11111111222233334444555566667777'
    const runId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    fs.writeFileSync(
      path.join(tmpDir, `${runId}.json`),
      JSON.stringify({
        runId,
        databaseName: dbName,
        ownershipToken: 'tok1',
        pid: process.pid,
        processStartTimeUtc: new Date().toISOString(),
        machineName: os.hostname(),
        status: 'active',
        callerContext: 'bun-test',
        server: '.\\SQLEXPRESS',
        createdAtUtc: new Date().toISOString(),
        updatedAtUtc: new Date().toISOString(),
      })
    )
    try {
      const res = await recoverInterruptedOwnedDatabases(tmpDir, '', () => true)
      expect(res.recovered).toEqual([])
      expect(res.skipped).toEqual([dbName])
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})
