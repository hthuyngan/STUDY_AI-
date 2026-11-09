import { describe, it, expect } from 'vitest'
import {
  assertSafeTestDatabase,
  isAuthorizedTestDatabase,
  sanitizeConnectionString,
} from '../../../scripts/utils/databaseSafetyGuard'

describe('Hardened Fail-Closed Database Safety Guard (TypeScript / E2E)', () => {
  it('throws when connection string is undefined or empty', () => {
    expect(() => assertSafeTestDatabase(undefined)).toThrowError(
      /CRITICAL DATABASE SAFETY GUARD TRIGGERED.*empty or undefined/i
    )
    expect(() => assertSafeTestDatabase('')).toThrowError(
      /CRITICAL DATABASE SAFETY GUARD TRIGGERED.*empty or undefined/i
    )
    expect(() => assertSafeTestDatabase('   ')).toThrowError(
      /CRITICAL DATABASE SAFETY GUARD TRIGGERED.*empty or undefined/i
    )
  })

  it('throws when Database or Initial Catalog is missing from connection string', () => {
    expect(() =>
      assertSafeTestDatabase('Server=.\\SQLEXPRESS;Trusted_Connection=True;')
    ).toThrowError(/Could not extract Database or Initial Catalog/i)
  })

  it('never leaks cleartext password when connection string is missing database', () => {
    const rawSecret = 'MySuperSensitiveCleartextP@ssw0rd'
    try {
      assertSafeTestDatabase(
        `Server=localhost;User Id=sa;Password=${rawSecret};MultipleActiveResultSets=true;`
      )
      expect.fail('Should have thrown an error')
    } catch (err: unknown) {
      const msg = (err as Error).message
      expect(msg).not.toContain(rawSecret)
      expect(msg).toContain('Password=***')
    }
  })

  it('masks sensitive credentials in sanitizeConnectionString', () => {
    const rawSecret = 'ConfidentialPassword123'
    const rawUser = 'admin_user'
    const result = sanitizeConnectionString(
      `Server=db.example.internal;Database=StudyAIDb_E2E;User Id=${rawUser};Password=${rawSecret};`
    )
    expect(result).not.toContain(rawSecret)
    expect(result).toContain('Password=***')
    expect(result).toContain('User Id=***')
    expect(result).toContain('StudyAIDb_E2E')
  })

  it('strictly blocks primary database StudyAIDb in all formats and casing', () => {
    const forbiddenVariations = [
      'Server=.\\SQLEXPRESS;Database=StudyAIDb;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=studyaidb;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=STUDYAIDB;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Initial Catalog=StudyAIDb;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=[StudyAIDb];Trusted_Connection=True;',
      'Server=localhost;Database=  StudyAIDb  ;User Id=sa;Password=secret;',
    ]

    for (const forbidden of forbiddenVariations) {
      expect(() => assertSafeTestDatabase(forbidden)).toThrowError(
        /strictly FORBIDDEN from connecting to or modifying 'StudyAIDb'/i
      )
    }
  })

  it('strictly rejects spoofed and substring databases that contain test or e2e', () => {
    const spoofedDatabases = [
      'Server=.\\SQLEXPRESS;Database=StudyAIDb_test;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=MyTestProdDb;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=contest_prod;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=testament_db;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=e2e_live_production;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=StudyAIDb_e2e_fake;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=StudyAIDb_IntegrationTests;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=ProductionDb;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=CustomerDb;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_12345;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_not_a_valid_guid;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ;Trusted_Connection=True;',
    ]

    for (const spoofed of spoofedDatabases) {
      expect(() => assertSafeTestDatabase(spoofed)).toThrowError(
        /is NOT an authorized test database/i
      )
    }
  })

  it('allows only exact authorized test databases', () => {
    expect(
      assertSafeTestDatabase(
        'Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;'
      )
    ).toBe('StudyAIDb_E2E')

    expect(
      assertSafeTestDatabase(
        'Server=.\\SQLEXPRESS;Database=studyaidb_e2e;Trusted_Connection=True;'
      )
    ).toBe('studyaidb_e2e')

    expect(
      assertSafeTestDatabase(
        'Server=.\\SQLEXPRESS;Initial Catalog=[StudyAIDb_E2E];Trusted_Connection=True;'
      )
    ).toBe('StudyAIDb_E2E')

    expect(
      assertSafeTestDatabase(
        'Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_a1b2c3d4e5f60718293a4b5c6d7e8f90;Trusted_Connection=True;'
      )
    ).toBe('StudyAIDb_Clean_a1b2c3d4e5f60718293a4b5c6d7e8f90')

    expect(
      assertSafeTestDatabase(
        'Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_12345678-1234-1234-1234-1234567890ab;Trusted_Connection=True;'
      )
    ).toBe('StudyAIDb_Clean_12345678-1234-1234-1234-1234567890ab')
  })

  it('isAuthorizedTestDatabase returns expected boolean values', () => {
    expect(isAuthorizedTestDatabase(undefined)).toBe(false)
    expect(isAuthorizedTestDatabase('')).toBe(false)
    expect(isAuthorizedTestDatabase('StudyAIDb')).toBe(false)
    expect(isAuthorizedTestDatabase('studyaidb')).toBe(false)
    expect(isAuthorizedTestDatabase('StudyAIDb_E2E')).toBe(true)
    expect(isAuthorizedTestDatabase('studyaidb_e2e')).toBe(true)
    expect(isAuthorizedTestDatabase('StudyAIDb_Clean_d8a1f16decc8ea1a5c35119cb5b0a748')).toBe(true)
    expect(isAuthorizedTestDatabase('StudyAIDb_Clean_invalid')).toBe(false)
    expect(isAuthorizedTestDatabase('MyTestProdDb')).toBe(false)
    expect(isAuthorizedTestDatabase('StudyAIDb_test')).toBe(false)
  })
})
