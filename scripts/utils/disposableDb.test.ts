import { describe, it, expect } from 'bun:test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  parseValidatedSqlConnection,
  recoverInterruptedOwnedDatabases,
} from './disposableDb'

describe('Disposable DB Lifecycle & Ownership Guard', () => {
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

  it('parseValidatedSqlConnection parses StudyAIDb_Clean_{GUID} server and credentials safely', () => {
    const dbName = 'StudyAIDb_Clean_a1b2c3d4e5f60718293a4b5c6d7e8f90'
    const parsed = parseValidatedSqlConnection(
      `Server=127.0.0.1,1433;Database=${dbName};User Id=sa;Password=Temp!Pass;TrustServerCertificate=True`
    )
    expect(parsed.dbName).toBe(dbName)
    expect(parsed.server).toBe('127.0.0.1,1433')
    expect(parsed.userId).toBe('sa')
  })

  it('recoverInterruptedOwnedDatabases skips alive PIDs and ignores unmanifested orphan databases', () => {
    const tmpManifest = path.join(os.tmpdir(), `studyai-test-manifest-${Date.now()}.json`)
    const dbName = 'StudyAIDb_Clean_11111111222233334444555566667777'
    fs.writeFileSync(
      tmpManifest,
      JSON.stringify([
        {
          dbName,
          runId: 'run1',
          ownershipToken: 'tok1',
          pid: process.pid,
          server: '.\\SQLEXPRESS',
          callerContext: 'bun-test',
          createdAt: new Date().toISOString(),
        },
      ])
    )
    try {
      const res = recoverInterruptedOwnedDatabases(tmpManifest, '', () => true)
      expect(res.recovered).toEqual([])
      expect(res.skipped).toEqual([dbName])
    } finally {
      if (fs.existsSync(tmpManifest)) fs.unlinkSync(tmpManifest)
    }
  })
})
