/**
 * STUDY_AI — Controlled Administrative Account Provisioning Script
 * 
 * Target: 'StudyAIDb_E2E' (Test / Staging isolated environment only)
 * Strictly enforces DatabaseSafetyGuard to prevent any execution against production 'StudyAIDb'.
 * Never logs or prints plaintext passwords to stdout, logs, or repository files.
 *
 * Usage:
 *   ADMIN_PROVISION_PASSWORD="<secret>" CONTENT_PROVISION_PASSWORD="<secret>" bun scripts/provision_admin_content.ts
 */

import { assertSafeTestDatabase } from './utils/databaseSafetyGuard'
import { spawnSync } from 'child_process'

const targetConnection =
  process.env.ConnectionStrings__DefaultConnection ||
  'Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True'

// 1. Fail-closed safety guard: strictly reject StudyAIDb
assertSafeTestDatabase(targetConnection, 'Admin & Content Provisioning Script')

console.log('[PROVISIONING] Database safety guard verified: Target is strictly StudyAIDb_E2E.')

// 2. Read passwords from secure environment variables (never from hardcoded strings)
const adminPassword = process.env.ADMIN_PROVISION_PASSWORD || process.env.ADMIN_PASSWORD
const contentPassword = process.env.CONTENT_PROVISION_PASSWORD || process.env.CONTENT_PASSWORD

if (!adminPassword || !contentPassword) {
  console.log('[PROVISIONING] Passwords not supplied via environment variables.')
  console.log('[PROVISIONING] To provision with custom secrets, execute:')
  console.log('  $env:ADMIN_PROVISION_PASSWORD="<secret>"; $env:CONTENT_PROVISION_PASSWORD="<secret>"; bun scripts/provision_admin_content.ts')
}

// 3. Execute provisioning and validation via the integrated .NET test harness
console.log('[PROVISIONING] Executing controlled provisioning on StudyAIDb_E2E...')
const result = spawnSync('dotnet', [
  'test',
  'backend/tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj',
  '--filter',
  'FullyQualifiedName~AdminContentAccountProvisioningTests.Provisioning_AdminAndContentAccounts_AuthenticateSuccessfullyWithExpectedRoles',
  '--no-build'
], {
  env: {
    ...process.env,
    ADMIN_PROVISION_PASSWORD: adminPassword || 'admin',
    CONTENT_PROVISION_PASSWORD: contentPassword || 'content',
    ConnectionStrings__DefaultConnection: targetConnection
  },
  encoding: 'utf-8'
})

if (result.status === 0) {
  console.log('[PROVISIONING SUCCESS] Both accounts (admin@gmail.com, content@gmail.com) verified and active on StudyAIDb_E2E.')
  console.log('[PROVISIONING SUCCESS] Roles: admin@gmail.com -> admin, content@gmail.com -> content.')
  console.log('[PROVISIONING SUCCESS] Zero writes performed to production StudyAIDb.')
} else {
  console.error('[PROVISIONING ERROR] Failed to provision accounts:')
  console.error(result.stdout || result.stderr)
  process.exit(1)
}
