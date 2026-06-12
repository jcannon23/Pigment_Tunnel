// Generates realistic sample data per source system, simulating an API extract.

const FIRST = ['Ava', 'Liam', 'Noah', 'Emma', 'Mia', 'Lucas', 'Sofia', 'Ethan', 'Isla', 'Mateo', 'Priya', 'Chen', 'Yuki', 'Omar', 'Lena'];
const LAST = ['Smith', 'Garcia', 'Chen', 'Patel', 'Müller', 'Kim', 'Okafor', 'Rossi', 'Dubois', 'Tanaka', 'Novak', 'Silva'];
const DEPTS = ['Finance', 'Engineering', 'Sales', 'Marketing', 'Operations', 'HR', 'Product'];
const REGIONS = ['AMER', 'EMEA', 'APAC'];
const COST_CENTERS = ['CC-1001', 'CC-1002', 'CC-2001', 'CC-2002', 'CC-3001'];
const ACCOUNTS = ['4000 - Revenue', '5000 - COGS', '6000 - Opex', '6100 - Salaries', '6200 - Travel', '6300 - Software'];
const PRODUCTS = ['Platform', 'Analytics', 'Connect', 'Enterprise', 'Starter'];
const PERIODS = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const money = (min, max) => Math.round((min + Math.random() * (max - min)) * 100) / 100;
const int = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

const GENERATORS = {
  workday: {
    columns: ['Employee ID', 'First Name', 'Last Name', 'Department', 'Region', 'Cost Center', 'Base Salary', 'Bonus Target %', 'FTE', 'Hire Date'],
    row: i => ({
      'Employee ID': `EMP-${String(10000 + i)}`,
      'First Name': pick(FIRST),
      'Last Name': pick(LAST),
      'Department': pick(DEPTS),
      'Region': pick(REGIONS),
      'Cost Center': pick(COST_CENTERS),
      'Base Salary': money(55000, 220000),
      'Bonus Target %': pick([5, 10, 15, 20, 25]),
      'FTE': pick([1, 1, 1, 1, 0.8, 0.5]),
      'Hire Date': `20${int(15, 24)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
    }),
  },
  sap_bdc: {
    columns: ['Document No', 'Company Code', 'GL Account', 'Cost Center', 'Period', 'Amount', 'Currency', 'Profit Center'],
    row: i => ({
      'Document No': `DOC-${String(900000 + i)}`,
      'Company Code': pick(['1000', '2000', '3000']),
      'GL Account': pick(ACCOUNTS),
      'Cost Center': pick(COST_CENTERS),
      'Period': pick(PERIODS),
      'Amount': money(-50000, 250000),
      'Currency': pick(['USD', 'EUR', 'GBP']),
      'Profit Center': pick(['PC-100', 'PC-200', 'PC-300']),
    }),
  },
  oracle: {
    columns: ['Ledger', 'Account', 'Cost Center', 'Period', 'Actual Amount', 'Budget Amount', 'Currency'],
    row: () => {
      const actual = money(1000, 500000);
      return {
        'Ledger': pick(['US Primary', 'EU Primary']),
        'Account': pick(ACCOUNTS),
        'Cost Center': pick(COST_CENTERS),
        'Period': pick(PERIODS),
        'Actual Amount': actual,
        'Budget Amount': Math.round(actual * (0.85 + Math.random() * 0.3) * 100) / 100,
        'Currency': pick(['USD', 'EUR']),
      };
    },
  },
  snowflake: {
    columns: ['Order ID', 'Product', 'Region', 'Period', 'Quantity', 'Unit Price', 'Revenue', 'Customer Segment'],
    row: i => {
      const qty = int(1, 500);
      const price = money(20, 1200);
      return {
        'Order ID': `ORD-${String(50000 + i)}`,
        'Product': pick(PRODUCTS),
        'Region': pick(REGIONS),
        'Period': pick(PERIODS),
        'Quantity': qty,
        'Unit Price': price,
        'Revenue': Math.round(qty * price * 100) / 100,
        'Customer Segment': pick(['Enterprise', 'Mid-Market', 'SMB']),
      };
    },
  },
};

function generateSampleData(sourceSystem, rowCount = 50) {
  const gen = GENERATORS[sourceSystem] || GENERATORS.snowflake;
  const rows = Array.from({ length: rowCount }, (_, i) => gen.row(i));
  return { columns: gen.columns, rows };
}

module.exports = { generateSampleData };
