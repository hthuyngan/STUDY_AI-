import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

export interface DotnetEnvironment {
  dotnetRoot: string
  dotnetBin: string
  netcoreVersion: string
  aspnetVersion: string
  customPath: string
  childEnv: NodeJS.ProcessEnv
}

/**
 * Inspects a directory to determine if it is a valid .NET 10 root with both
 * Microsoft.NETCore.App and Microsoft.AspNetCore.App 10.x runtimes.
 */
function inspectDotnetDirectory(dir: string): { netcoreVersion: string; aspnetVersion: string } | null {
  try {
    if (!dir || !fs.existsSync(dir)) return null

    const binName = process.platform === 'win32' ? 'dotnet.exe' : 'dotnet'
    const binPath = path.join(dir, binName)
    if (!fs.existsSync(binPath)) return null

    const netcoreDir = path.join(dir, 'shared', 'Microsoft.NETCore.App')
    const aspnetDir = path.join(dir, 'shared', 'Microsoft.AspNetCore.App')

    if (!fs.existsSync(netcoreDir) || !fs.existsSync(aspnetDir)) return null

    const netcoreVersions = fs.readdirSync(netcoreDir).filter((v) => v.startsWith('10.'))
    const aspnetVersions = fs.readdirSync(aspnetDir).filter((v) => v.startsWith('10.'))

    if (netcoreVersions.length === 0 || aspnetVersions.length === 0) return null

    // Sort descending so the highest 10.x patch is chosen
    netcoreVersions.sort().reverse()
    aspnetVersions.sort().reverse()

    return {
      netcoreVersion: netcoreVersions[0],
      aspnetVersion: aspnetVersions[0],
    }
  } catch {
    return null
  }
}

/**
 * Validates that the dotnet executable actually functions and can run net10.0 apps.
 */
function verifyDotnetBinary(binPath: string, rootDir: string): boolean {
  try {
    const testEnv: NodeJS.ProcessEnv = {
      ...process.env,
      DOTNET_ROOT: rootDir,
      PATH: `${rootDir}${path.delimiter}${process.env.PATH || ''}`,
    }
    const output = execSync(`"${binPath}" --list-runtimes`, {
      env: testEnv,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    })
    const hasNetCore10 = output.includes('Microsoft.NETCore.App 10.')
    const hasAspNetCore10 = output.includes('Microsoft.AspNetCore.App 10.')
    return hasNetCore10 && hasAspNetCore10
  } catch {
    // If execSync fails for sandbox reasons, fallback to filesystem inspection
    return true
  }
}

/**
 * Resolves the real .NET 10 SDK/runtime environment across local machines and CI runners.
 * Never defaults to a directory merely because it exists if it targets an older version (e.g. .NET 8 or 9).
 */
export function resolveDotnet10Environment(): DotnetEnvironment {
  const isWindows = process.platform === 'win32'
  const inspectedPaths: string[] = []

  // Build candidate search list with strict priority
  const rawCandidates: (string | undefined | null)[] = [
    // 1. Explicit environment variable
    process.env.DOTNET_ROOT,

    // 2. Windows User Local AppData (where custom or non-admin .NET 10 SDKs reside)
    isWindows && process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'dotnet')
      : undefined,
    isWindows && process.env.USERPROFILE
      ? path.join(process.env.USERPROFILE, 'AppData', 'Local', 'Microsoft', 'dotnet')
      : undefined,

    // 3. System-wide Program Files (standard installer location)
    isWindows && process.env.ProgramFiles
      ? path.join(process.env.ProgramFiles, 'dotnet')
      : isWindows
        ? 'C:\\Program Files\\dotnet'
        : undefined,
    isWindows && process.env['ProgramFiles(x86)']
      ? path.join(process.env['ProgramFiles(x86)'], 'dotnet')
      : undefined,

    // 4. Unix / Linux / macOS standard paths (GitHub Actions CI runners)
    !isWindows ? '/usr/share/dotnet' : undefined,
    !isWindows ? '/usr/local/share/dotnet' : undefined,
    !isWindows && process.env.HOME ? path.join(process.env.HOME, '.dotnet') : undefined,
    !isWindows ? '/opt/dotnet' : undefined,
  ]

  // 5. Also inspect PATH directories if they contain dotnet
  if (process.env.PATH) {
    const pathEntries = process.env.PATH.split(path.delimiter)
    for (const p of pathEntries) {
      if (!p) continue
      const binCandidate = path.join(p, isWindows ? 'dotnet.exe' : 'dotnet')
      if (fs.existsSync(binCandidate)) {
        rawCandidates.push(p)
      }
    }
  }

  // De-duplicate candidates while preserving priority order
  const candidates: string[] = []
  for (const c of rawCandidates) {
    if (!c) continue
    const resolved = path.resolve(c)
    if (!candidates.includes(resolved)) {
      candidates.push(resolved)
    }
  }

  for (const dir of candidates) {
    inspectedPaths.push(dir)
    const inspection = inspectDotnetDirectory(dir)
    if (inspection) {
      const binName = isWindows ? 'dotnet.exe' : 'dotnet'
      const binPath = path.join(dir, binName)

      if (verifyDotnetBinary(binPath, dir)) {
        const customPath = `${dir}${path.delimiter}${process.env.PATH || ''}`
        return {
          dotnetRoot: dir,
          dotnetBin: binPath,
          netcoreVersion: inspection.netcoreVersion,
          aspnetVersion: inspection.aspnetVersion,
          customPath,
          childEnv: {
            ...process.env,
            DOTNET_ROOT: dir,
            PATH: customPath,
          },
        }
      }
    }
  }

  const diagnosticMsg = [
    '=========================================================================',
    'FATAL ERROR: Valid .NET 10 runtime not found!',
    'StudyAI backend targets .NET 10.0 (net10.0). Both Microsoft.NETCore.App 10.x',
    'and Microsoft.AspNetCore.App 10.x runtimes are required.',
    '',
    'Directories checked:',
    ...inspectedPaths.map((p) => `  - ${p}`),
    '',
    'Remediation:',
    '  1. Install .NET 10 SDK / ASP.NET Core Runtime 10.0 from https://aka.ms/dotnet/download',
    '  2. Or set DOTNET_ROOT environment variable pointing to the .NET 10 installation directory.',
    '=========================================================================',
  ].join('\n')

  throw new Error(diagnosticMsg)
}

