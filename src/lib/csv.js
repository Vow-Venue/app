// ── Shared CSV utilities ─────────────────────────────────────────────────────

/**
 * Parse a single CSV line respecting quoted fields.
 */
export function parseLine(line) {
  const result = []
  let cell = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cell += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      result.push(cell.trim()); cell = ''
    } else {
      cell += ch
    }
  }
  result.push(cell.trim())
  return result
}

/**
 * Parse full CSV text into { headers, rows } where rows are string arrays.
 */
export function parseCSVRaw(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, '').trim())
  const rows = lines.slice(1).map(parseLine)
  return { headers, rows }
}

/**
 * Fuzzy column finder — given headers and a row, find the first column whose
 * header matches or includes any of the given names.
 */
export function findColumn(headers, row, ...names) {
  for (const name of names) {
    const i = headers.findIndex(h => h === name || h.includes(name))
    if (i !== -1 && row[i] != null) return row[i].replace(/^"|"$/g, '').trim()
  }
  return ''
}

/**
 * Escape a value for CSV (wrap in quotes if it contains commas, quotes, or newlines).
 */
function escapeCSV(val) {
  const s = String(val ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

/**
 * Convert an array of objects to a CSV string.
 * @param {string[]} columns  - ordered list of { key, label } where key is the object key
 * @param {object[]} data     - array of data objects
 */
export function toCSV(columns, data) {
  const headerLine = columns.map(c => escapeCSV(c.label)).join(',')
  const bodyLines = data.map(row =>
    columns.map(c => escapeCSV(row[c.key])).join(',')
  )
  return [headerLine, ...bodyLines].join('\n')
}

/**
 * Trigger a browser download of a CSV string.
 */
export function downloadCSV(filename, csvString) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
