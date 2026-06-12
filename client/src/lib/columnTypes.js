// Column type/format definitions for data tables — database-style column schemas.
// Types are formatting metadata: the underlying stored values are never mutated.

const toNumber = v => {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v ?? '').replace(/[^0-9.eE+-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const toDate = v => {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export const COLUMN_TYPES = {
  auto: {
    label: 'Auto',
    abbr: 'auto',
    align: v => (typeof v === 'number' ? 'right' : 'left'),
    format: v => {
      if (v === null || v === undefined || v === '') return '';
      if (typeof v === 'number') return v.toLocaleString('en-US', { maximumFractionDigits: 4 });
      return String(v);
    },
  },
  text: {
    label: 'Text',
    abbr: 'Abc',
    align: () => 'left',
    format: v => (v === null || v === undefined ? '' : String(v)),
  },
  integer: {
    label: 'Integer',
    abbr: '123',
    align: () => 'right',
    format: v => {
      const n = toNumber(v);
      return n === null ? (v ? String(v) : '') : Math.round(n).toLocaleString('en-US');
    },
  },
  decimal: {
    label: 'Decimal',
    abbr: '1.23',
    align: () => 'right',
    format: v => {
      const n = toNumber(v);
      return n === null ? (v ? String(v) : '') : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
  },
  currency: {
    label: 'Currency (USD)',
    abbr: '$',
    align: () => 'right',
    format: v => {
      const n = toNumber(v);
      return n === null ? (v ? String(v) : '') : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    },
  },
  percent: {
    label: 'Percentage',
    abbr: '%',
    align: () => 'right',
    format: v => {
      const n = toNumber(v);
      return n === null ? (v ? String(v) : '') : `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
    },
  },
  date: {
    label: 'Date',
    abbr: '📅',
    align: () => 'left',
    format: v => {
      const d = toDate(v);
      return d === null ? (v ? String(v) : '') : d.toISOString().slice(0, 10);
    },
  },
  datetime: {
    label: 'Date & Time',
    abbr: '🕐',
    align: () => 'left',
    format: v => {
      const d = toDate(v);
      return d === null ? (v ? String(v) : '')
        : d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
  },
  boolean: {
    label: 'Boolean',
    abbr: 'T/F',
    align: () => 'center',
    format: v => {
      if (v === null || v === undefined || v === '') return '';
      const s = String(v).toLowerCase();
      if (v === true || s === 'true' || s === '1' || s === 'yes' || s === 'y') return 'TRUE';
      if (v === false || s === 'false' || s === '0' || s === 'no' || s === 'n') return 'FALSE';
      return String(v);
    },
  },
};

export const TYPE_ORDER = ['auto', 'text', 'integer', 'decimal', 'currency', 'percent', 'date', 'datetime', 'boolean'];

export function formatCell(value, type) {
  const def = COLUMN_TYPES[type] || COLUMN_TYPES.auto;
  return def.format(value);
}

export function cellAlign(value, type) {
  const def = COLUMN_TYPES[type] || COLUMN_TYPES.auto;
  return def.align(value);
}
