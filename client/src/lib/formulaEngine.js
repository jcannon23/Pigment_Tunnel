// Excel-style formula engine for column transformations.
// Columns are referenced by name in square brackets: [Revenue] * 1.1
// Supported functions: IF, AND, OR, NOT, UPPER, LOWER, TRIM, CONCAT, LEFT, RIGHT,
// MID, LEN, ROUND, ABS, MIN, MAX, SUBSTITUTE, VALUE, TEXT, ISBLANK

const FUNCTIONS = {
  IF: (cond, a, b) => (cond ? a : b),
  AND: (...args) => args.every(Boolean),
  OR: (...args) => args.some(Boolean),
  NOT: a => !a,
  UPPER: s => String(s ?? '').toUpperCase(),
  LOWER: s => String(s ?? '').toLowerCase(),
  TRIM: s => String(s ?? '').trim(),
  CONCAT: (...args) => args.map(a => a ?? '').join(''),
  LEFT: (s, n) => String(s ?? '').slice(0, n),
  RIGHT: (s, n) => String(s ?? '').slice(-n),
  MID: (s, start, n) => String(s ?? '').substr(start - 1, n),
  LEN: s => String(s ?? '').length,
  ROUND: (n, d = 0) => { const m = 10 ** d; return Math.round(Number(n) * m) / m; },
  ABS: n => Math.abs(Number(n)),
  MIN: (...args) => Math.min(...args.map(Number)),
  MAX: (...args) => Math.max(...args.map(Number)),
  SUBSTITUTE: (s, find, repl) => String(s ?? '').split(String(find)).join(String(repl)),
  VALUE: s => { const n = parseFloat(String(s ?? '').replace(/[^0-9.eE+-]/g, '')); return isNaN(n) ? 0 : n; },
  TEXT: n => String(n ?? ''),
  ISBLANK: v => v === null || v === undefined || v === '',
};

// Tokenizer → validates the expression only contains safe constructs,
// then compiles to a JS function. No access to globals.
function tokenize(formula) {
  const tokens = [];
  let i = 0;
  const src = formula;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '[') {
      const end = src.indexOf(']', i);
      if (end === -1) throw new Error('Unclosed column reference — missing "]"');
      tokens.push({ type: 'column', name: src.slice(i + 1, end).trim() });
      i = end + 1;
    } else if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1, str = '';
      while (j < src.length && src[j] !== quote) { str += src[j]; j++; }
      if (j >= src.length) throw new Error('Unclosed string literal');
      tokens.push({ type: 'string', value: str });
      i = j + 1;
    } else if (/[0-9.]/.test(ch)) {
      let j = i, num = '';
      while (j < src.length && /[0-9.]/.test(src[j])) { num += src[j]; j++; }
      tokens.push({ type: 'number', value: parseFloat(num) });
      i = j;
    } else if (/[A-Za-z_]/.test(ch)) {
      let j = i, word = '';
      while (j < src.length && /[A-Za-z_0-9]/.test(src[j])) { word += src[j]; j++; }
      const upper = word.toUpperCase();
      if (upper === 'TRUE') tokens.push({ type: 'boolean', value: true });
      else if (upper === 'FALSE') tokens.push({ type: 'boolean', value: false });
      else if (FUNCTIONS[upper]) tokens.push({ type: 'function', name: upper });
      else throw new Error(`Unknown function or name: ${word}`);
      i = j;
    } else if (ch === '<' && src[i + 1] === '>') {
      tokens.push({ type: 'op', value: '!=' }); i += 2;
    } else if ((ch === '<' || ch === '>') && src[i + 1] === '=') {
      tokens.push({ type: 'op', value: ch + '=' }); i += 2;
    } else if (ch === '=') {
      tokens.push({ type: 'op', value: '==' }); i += (src[i + 1] === '=' ? 2 : 1);
    } else if (ch === '&') {
      tokens.push({ type: 'op', value: 'CONCAT_OP' }); i++;
    } else if ('+-*/%<>(),'.includes(ch)) {
      tokens.push({ type: 'op', value: ch }); i++;
    } else {
      throw new Error(`Unexpected character: ${ch}`);
    }
  }
  return tokens;
}

export function compileFormula(formula, columns) {
  const tokens = tokenize(formula);
  let js = '';
  for (const t of tokens) {
    switch (t.type) {
      case 'column': {
        const idx = columns.indexOf(t.name);
        if (idx === -1) throw new Error(`Unknown column: [${t.name}]`);
        js += `row[${JSON.stringify(t.name)}]`;
        break;
      }
      case 'string': js += JSON.stringify(t.value); break;
      case 'number': js += t.value; break;
      case 'boolean': js += t.value; break;
      case 'function': js += `F.${t.name}`; break;
      case 'op': js += t.value === 'CONCAT_OP' ? `+''+` : t.value; break;
      default: throw new Error('Bad token');
    }
  }
  // eslint-disable-next-line no-new-func
  const fn = new Function('row', 'F', `"use strict"; return (${js});`);
  return row => {
    try {
      const result = fn(row, FUNCTIONS);
      if (typeof result === 'number' && !Number.isFinite(result)) return null;
      return result;
    } catch {
      return '#ERROR';
    }
  };
}

// Validate without evaluating — returns null if OK, or an error message
export function validateFormula(formula, columns) {
  try {
    compileFormula(formula, columns);
    return null;
  } catch (err) {
    return err.message;
  }
}

// Apply a list of formula columns to rows.
// formulas: [{ name: 'New Col', formula: '[Revenue] * 1.1' }]
export function applyFormulas(columns, rows, formulas) {
  const outColumns = [...columns];
  const compiled = [];
  for (const f of formulas) {
    if (!outColumns.includes(f.name)) outColumns.push(f.name);
    compiled.push({ name: f.name, fn: compileFormula(f.formula, outColumns) });
  }
  const outRows = rows.map(row => {
    const out = { ...row };
    for (const c of compiled) {
      const v = c.fn(out);
      out[c.name] = typeof v === 'number' ? Math.round(v * 10000) / 10000 : v;
    }
    return out;
  });
  return { columns: outColumns, rows: outRows };
}

export const FORMULA_HELP = [
  { fn: '[Column Name]', desc: 'Reference a column by its name' },
  { fn: 'IF(test, then, else)', desc: 'IF([Region]="EMEA", [Amount]*1.1, [Amount])' },
  { fn: 'CONCAT(a, b, ...) or &', desc: 'CONCAT([First Name], " ", [Last Name])' },
  { fn: 'ROUND(n, digits)', desc: 'ROUND([Revenue] * 0.21, 2)' },
  { fn: 'UPPER / LOWER / TRIM', desc: 'UPPER([Department])' },
  { fn: 'LEFT / RIGHT / MID / LEN', desc: 'LEFT([Cost Center], 2)' },
  { fn: 'ABS / MIN / MAX', desc: 'MAX([Actual], [Budget])' },
  { fn: 'AND / OR / NOT', desc: 'IF(AND([FTE]=1, [Salary]>100000), "Senior", "Standard")' },
  { fn: 'SUBSTITUTE(text, find, replace)', desc: 'SUBSTITUTE([Account], " - ", "_")' },
  { fn: 'Operators', desc: '+ - * / % = <> < > <= >= &' },
];
