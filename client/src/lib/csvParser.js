// RFC 4180-style CSV parser with quoted fields, escaped quotes ("") and CRLF support.
// Returns { columns, rows } where rows are objects keyed by column name,
// with numeric values converted to numbers.

function parseCSVText(text) {
  const records = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { record.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { record.push(field); records.push(record); field = ''; record = []; i++; continue; }
    field += ch; i++;
  }
  // Trailing record (file may not end with newline)
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

function inferValue(raw) {
  const s = raw.trim();
  if (s === '') return '';
  // Numeric (allows thousands separators and currency-free decimals)
  const cleaned = s.replace(/,/g, '');
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    const n = parseFloat(cleaned);
    if (Number.isFinite(n)) return n;
  }
  return s;
}

export function parseCSV(text) {
  const records = parseCSVText(text).filter(r => !(r.length === 1 && r[0].trim() === ''));
  if (records.length < 1) throw new Error('The file is empty.');
  if (records.length < 2) throw new Error('The file has a header row but no data rows.');

  // Header: trim, ensure non-empty + unique names
  const seen = new Map();
  const columns = records[0].map((h, idx) => {
    let name = h.trim() || `Column ${idx + 1}`;
    const count = seen.get(name) || 0;
    seen.set(name, count + 1);
    if (count > 0) name = `${name} (${count + 1})`;
    return name;
  });

  const rows = records.slice(1).map(rec => {
    const row = {};
    columns.forEach((c, idx) => { row[c] = inferValue(rec[idx] ?? ''); });
    return row;
  });

  return { columns, rows };
}
