import { describe, it, expect } from 'vitest'
import { assertSafeTestDatabase } from '../../../scripts/utils/databaseSafetyGuard'

describe('Fail-Closed Database Safety Guard (TypeScript / E2E)', () => {
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

  it('blocks non-test databases outside whitelist', () => {
    const unauthorizedList = [
      'Server=.\\SQLEXPRESS;Database=ProductionDb;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=CustomerDb;Trusted_Connection=True;',
      'Server=.\\SQLEXPRESS;Database=AccountingDB;Trusted_Connection=True;',
    ]

    for (const unauthorized of unauthorizedList) {
      expect(() => assertSafeTestDatabase(unauthorized)).toThrowError(
        /is NOT an authorized test database/i
      )
    }
  })

  it('allows explicitly authorized test databases', () => {
    expect(
      assertSafeTestDatabase(
        'Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;'
      )
    ).toBe('StudyAIDb_E2E')

    expect(
      assertSafeTestDatabase(
        'Server=.\\SQLEXPRESS;Database=StudyAIDb_Clean_42502404234;Trusted_Connection=True;'
      )
    ).toBe('StudyAIDb_Clean_42502404234')

    expect(
      assertSafeTestDatabase(
        'Server=.\\SQLEXPRESS;Database=StudyAIDb_IntegrationTests;Trusted_Connection=True;'
      )
    ).toBe('StudyAIDb_IntegrationTests')

    expect(
      assertSafeTestDatabase(
        'Server=.\\SQLEXPRESS;Initial Catalog=[StudyAIDb_E2E];Trusted_Connection=True;'
      )
    ).toBe('StudyAIDb_E2E')
  })
})
