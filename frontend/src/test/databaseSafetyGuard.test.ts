import { describe, it, expect } from 'vitest'
import {
  assertSafeTestDatabase,
  isAuthorizedTestDatabase,
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
    ).toThrowError(/Could not extract Database or Initial Catalog from connection string syntax/i)
  })

  it('never leaks cleartext password, access token, or secrets in message or stack trace', () => {
    const rawSecret = 'MySuperSensitiveCleartextP@ssw0rd'
    const rawAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sometoken.sig'
    const rawApiKey = 'dummy_test_api_key_sample_1234567890'

    const malformed = `Server=localhost;User Id=sa;Password=${rawSecret};Token=${rawAccessToken};ApiKey=${rawApiKey};NoDbHere`

    try {
      assertSafeTestDatabase(malformed)
      expect.fail('Should have thrown an error')
    } catch (err: unknown) {
      const errorObj = err as Error
      const fullDump = `${errorObj.message}\n${errorObj.stack ?? ''}`

      // Zero credentials or tokens anywhere in error dump
      expect(fullDump).not.toContain(rawSecret)
      expect(fullDump).not.toContain(rawAccessToken)
      expect(fullDump).not.toContain(rawApiKey)

      // Fixed constant message emitted
      expect(errorObj.message).toContain(
        'Could not extract Database or Initial Catalog from connection string syntax. Execution is blocked for security reasons.'
      )
    }
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

  it('strictly rejects non-N/D GUID formats B, P, and X', () => {
    const nonNDGuidDatabases = [
      // Format B: braces around GUID
      'Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_{a1b2c3d4-e5f6-0718-293a-4b5c6d7e8f90};Trusted_Connection=True;',
      // Format P: parentheses around GUID
      'Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_(a1b2c3d4-e5f6-0718-293a-4b5c6d7e8f90);Trusted_Connection=True;',
      // Format X: hexadecimal array structure
      'Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_{0x12345678,0x1234,0x1234,{0x12,0x34,0x56,0x78,0x90,0xab,0xcd,0xef}};Trusted_Connection=True;',
    ]

    for (const nonND of nonNDGuidDatabases) {
      expect(() => assertSafeTestDatabase(nonND)).toThrowError(
        /is NOT an authorized test database/i
      )
    }
  })

  it('allows only exact authorized test databases (StudyAIDb_E2E and Guid:N/Guid:D)', () => {
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

    // Guid:N (32 hex characters)
    expect(
      assertSafeTestDatabase(
        'Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_a1b2c3d4e5f60718293a4b5c6d7e8f90;Trusted_Connection=True;'
      )
    ).toBe('StudyAIDb_Clean_a1b2c3d4e5f60718293a4b5c6d7e8f90')

    // Guid:D (36 characters 8-4-4-4-12)
    expect(
      assertSafeTestDatabase(
        'Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_12345678-1234-1234-1234-1234567890ab;Trusted_Connection=True;'
      )
    ).toBe('StudyAIDb_Clean_12345678-1234-1234-1234-1234567890ab')
  })

  it('isAuthorizedTestDatabase correctly rejects B, P, X and validates N and D', () => {
    expect(isAuthorizedTestDatabase(undefined)).toBe(false)
    expect(isAuthorizedTestDatabase('')).toBe(false)
    expect(isAuthorizedTestDatabase('StudyAIDb')).toBe(false)
    expect(isAuthorizedTestDatabase('studyaidb')).toBe(false)
    expect(isAuthorizedTestDatabase('StudyAIDb_E2E')).toBe(true)
    expect(isAuthorizedTestDatabase('studyaidb_e2e')).toBe(true)

    // Guid:N (32 hex)
    expect(isAuthorizedTestDatabase('StudyAIDb_Clean_d8a1f16decc8ea1a5c35119cb5b0a748')).toBe(true)
    // Guid:D (36 chars)
    expect(isAuthorizedTestDatabase('StudyAIDb_Clean_d8a1f16d-ecc8-ea1a-5c35-119cb5b0a748')).toBe(true)

    // Format B ({...}) -> false
    expect(isAuthorizedTestDatabase('StudyAIDb_Clean_{d8a1f16d-ecc8-ea1a-5c35-119cb5b0a748}')).toBe(false)
    // Format P ((...)) -> false
    expect(isAuthorizedTestDatabase('StudyAIDb_Clean_(d8a1f16d-ecc8-ea1a-5c35-119cb5b0a748)')).toBe(false)
    // Format X -> false
    expect(isAuthorizedTestDatabase('StudyAIDb_Clean_{0x12,0x34}')).toBe(false)

    // Substrings
    expect(isAuthorizedTestDatabase('StudyAIDb_Clean_invalid')).toBe(false)
    expect(isAuthorizedTestDatabase('MyTestProdDb')).toBe(false)
    expect(isAuthorizedTestDatabase('StudyAIDb_test')).toBe(false)
  })
})
