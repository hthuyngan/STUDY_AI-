import fs from 'fs'
import path from 'path'

function resolveImageUrl(rawImg: string): string | undefined {
  if (!rawImg || !rawImg.trim()) return undefined
  const first = rawImg.split(/[;,]/)[0].trim()
  if (!first) return undefined
  let clean = first.replace(/^eo_(\d+)/i, 'Geo_$1')
  const parts = clean.split(/[/\\]/).map(p => p.trim())
  const folder = parts.length > 1 ? parts[0] : ''
  const filename = parts[parts.length - 1]
  return folder ? `/uploads/vnhsge/${folder}/${filename}` : `/uploads/vnhsge/${filename}`
}

const testStrings = [
  'Geo_18/ Geo_18_32_1.png; Geo_18/ Geo_18_32_2.png',
  'Bio_28_37.jpeg, Bio_28/Bio_28_37_2.jpeg',
  'eo_21/Geo_21_39.png',
  'eo_33/Geo_33_26.png',
  'Geo_1/ Geo_1_22.png',
  'Geo_1/ Geo_1_36.png',
  'Geo_13/ Geo_13_36.png',
  'Geo_18/Geo_18_22.png',
  'Geo_2/ Geo_2_22.png',
  'Geo_20_32_1.png;',
]

const backendWwwroot = 'D:\\TN\\backend\\src\\StudyAI.Api\\wwwroot'

for (const s of testStrings) {
  const url = resolveImageUrl(s)
  const fPath = path.join(backendWwwroot, url!.slice(1))
  const exists = fs.existsSync(fPath)
  console.log(`Raw: "${s}" -> Url: "${url}" -> Exists: ${exists}`)
}
