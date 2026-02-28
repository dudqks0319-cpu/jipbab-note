#!/usr/bin/env node
// 이 스크립트는 식약처 MFDS 레시피를 SQL 마이그레이션으로 변환해 recipes 테이블에 적재할 수 있게 만듭니다.
import fs from 'node:fs'
import path from 'node:path'

const SERVICE_ID = 'COOKRCP01'
const BASE_URL = 'https://openapi.foodsafetykorea.go.kr/api'
const CHUNK_SIZE = 200
const SPLIT_PATTERN = /[\n,;|/]+/g

function readEnvFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  const env = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    env[key] = value
  }
  return env
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'null'
  const text = String(value)
  return `'${text.replace(/'/g, "''")}'`
}

function sqlJsonb(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`
}

function normalizeIngredient(text) {
  return text
    .replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*}/g, ' ')
    .replace(/[^0-9a-zA-Z가-힣\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractIngredients(raw) {
  if (!raw) return []
  const items = raw
    .split(SPLIT_PATTERN)
    .map((item) => item.replace(/^[-•·*]\s*/, '').trim())
    .map((item) => {
      const idx = item.lastIndexOf(':')
      return idx === -1 ? item : item.slice(idx + 1)
    })
    .map((item) => normalizeIngredient(item))
    .filter((item) => item.length > 0)

  return Array.from(new Set(items)).slice(0, 200)
}

function extractSteps(row) {
  const steps = []
  for (let index = 1; index <= 20; index += 1) {
    const key = String(index).padStart(2, '0')
    const description = row[`MANUAL${key}`]?.trim()
    if (!description) continue
    const imageUrl = row[`MANUAL_IMG${key}`]?.trim() || null
    steps.push({ order: index, description, image_url: imageUrl })
  }
  return steps
}

async function fetchChunk(apiKey, start, end) {
  const endpoint = `${BASE_URL}/${apiKey}/${SERVICE_ID}/json/${start}/${end}`
  const response = await fetch(endpoint, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`MFDS API 호출 실패 (${response.status})`)
  }

  const payload = await response.json()
  const service = payload?.COOKRCP01
  const resultCode = service?.RESULT?.CODE ?? payload?.RESULT?.CODE
  if (resultCode && resultCode !== 'INFO-000') {
    throw new Error(`MFDS API 오류 (${resultCode})`)
  }

  return {
    rows: Array.isArray(service?.row) ? service.row : [],
    totalCount: Number(service?.total_count ?? 0),
  }
}

function buildInsertRow(row) {
  const title = row.RCP_NM?.trim() || '이름 없음'
  const method = row.RCP_WAY2?.trim() || '정보 없음'
  const calories = row.INFO_ENG?.trim() || '-'
  const description = `조리법: ${method} | 열량: ${calories}`
  const category = row.RCP_PAT2?.trim() || '기타'
  const thumbnailUrl = row.ATT_FILE_NO_MK?.trim() || row.ATT_FILE_NO_MAIN?.trim() || null
  const ingredients = extractIngredients(row.RCP_PARTS_DTLS?.trim() || '')
  const steps = extractSteps(row)
  const source = row.RCP_SEQ ? `mfds:${row.RCP_SEQ}` : 'mfds:unknown'

  return `(${[
    sqlLiteral(title),
    sqlLiteral(description),
    sqlLiteral(category),
    'null',
    'null',
    'null',
    sqlLiteral(thumbnailUrl),
    sqlJsonb(ingredients),
    sqlJsonb(steps),
    sqlLiteral(source),
  ].join(', ')})`
}

async function main() {
  const projectRoot = process.cwd()
  const envPath = path.join(projectRoot, '.env.local')
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local 파일을 찾을 수 없습니다.')
  }

  const env = readEnvFile(envPath)
  const apiKey = env.MFDS_API_KEY || env.FOODSAFETY_API_KEY
  if (!apiKey) {
    throw new Error('MFDS_API_KEY(또는 FOODSAFETY_API_KEY)가 설정되어 있지 않습니다.')
  }

  const first = await fetchChunk(apiKey, 1, CHUNK_SIZE)
  const totalCount = first.totalCount || first.rows.length
  const allRows = [...first.rows]

  for (let start = CHUNK_SIZE + 1; start <= totalCount; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, totalCount)
    const chunk = await fetchChunk(apiKey, start, end)
    if (chunk.rows.length === 0) break
    allRows.push(...chunk.rows)
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14)
  const migrationName = `${timestamp}_seed_mfds_recipes.sql`
  const migrationsDir = path.join(projectRoot, 'supabase', 'migrations')
  fs.mkdirSync(migrationsDir, { recursive: true })
  const targetPath = path.join(migrationsDir, migrationName)

  const chunks = []
  for (let i = 0; i < allRows.length; i += 200) {
    chunks.push(allRows.slice(i, i + 200))
  }

  const lines = []
  lines.push('-- MFDS 레시피 전체 데이터를 recipes 테이블에 적재합니다.')
  lines.push('begin;')
  lines.push("delete from public.recipes where source like 'mfds:%';")

  for (const chunk of chunks) {
    const values = chunk.map(buildInsertRow)
    lines.push('insert into public.recipes (title, description, category, difficulty, cooking_time, servings, thumbnail_url, ingredients, steps, source)')
    lines.push('values')
    lines.push(values.join(',\n'))
    lines.push(';')
  }

  lines.push('commit;')
  fs.writeFileSync(targetPath, lines.join('\n') + '\n', 'utf8')

  console.log(`generated_migration=${path.relative(projectRoot, targetPath)}`)
  console.log(`recipe_rows=${allRows.length}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
