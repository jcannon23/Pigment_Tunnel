import WorkdayLogo from './logos/WorkdayLogo';
import SAPLogo from './logos/SAPLogo';
import OracleLogo from './logos/OracleLogo';
import SnowflakeLogo from './logos/SnowflakeLogo';

export const SOURCE_SYSTEMS = [
  {
    id: 'workday',
    name: 'Workday',
    Logo: WorkdayLogo,
    brandColor: '#F98B1F',
    cardBg: 'bg-orange-50 dark:bg-orange-950/30',
    cardBorder: 'border-orange-100 dark:border-orange-900/40',
    iconBg: 'bg-orange-50 dark:bg-orange-900/30',
    description: 'HR, Finance & Planning data from Workday',
    fields: [
      { key: 'tenant_url', label: 'Tenant URL', placeholder: 'https://wd2.myworkday.com/tenant', type: 'url', required: true, help: 'Your Workday tenant URL' },
      { key: 'client_id', label: 'Client ID', placeholder: 'Client ID from Workday API Client', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', placeholder: '••••••••', type: 'password', required: true, sensitive: true },
      { key: 'report_url', label: 'Report URL (RaaS)', placeholder: 'https://wd2.myworkday.com/.../Report_Name', type: 'url', required: true, help: 'Workday Report as a Service (RaaS) URL' },
      { key: 'username', label: 'ISU Username', placeholder: 'INT_API_User', type: 'text', required: false },
      { key: 'password', label: 'ISU Password', placeholder: '••••••••', type: 'password', required: false, sensitive: true },
    ],
  },
  {
    id: 'sap_bdc',
    name: 'SAP BDC',
    Logo: SAPLogo,
    brandColor: '#0070F2',
    cardBg: 'bg-blue-50 dark:bg-blue-950/30',
    cardBorder: 'border-blue-100 dark:border-blue-900/40',
    iconBg: 'bg-blue-50 dark:bg-blue-900/30',
    description: 'Business Data Cloud — SAP analytics & ERP data',
    fields: [
      { key: 'host', label: 'SAP Host / URL', placeholder: 'https://your-tenant.eu10.hanacloud.ondemand.com', type: 'url', required: true },
      { key: 'client', label: 'Client ID (Mandt)', placeholder: '100', type: 'text', required: true },
      { key: 'username', label: 'Username', placeholder: 'api_user', type: 'text', required: true },
      { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password', required: true, sensitive: true },
      { key: 'entity_set', label: 'OData Entity Set / Table', placeholder: 'ProfitCenterSet', type: 'text', required: true, help: 'OData entity set name to read from' },
      { key: 'filter', label: 'OData Filter (optional)', placeholder: "FiscalYear eq '2024'", type: 'text', required: false },
    ],
  },
  {
    id: 'oracle',
    name: 'Oracle',
    Logo: OracleLogo,
    brandColor: '#C74634',
    cardBg: 'bg-red-50 dark:bg-red-950/30',
    cardBorder: 'border-red-100 dark:border-red-900/40',
    iconBg: 'bg-red-50 dark:bg-red-900/30',
    description: 'Oracle Database or Oracle Fusion Cloud data',
    fields: [
      { key: 'host', label: 'Host', placeholder: 'db.example.com or oracle.cloud.com', type: 'text', required: true },
      { key: 'port', label: 'Port', placeholder: '1521', type: 'number', required: true },
      { key: 'service_name', label: 'Service Name / SID', placeholder: 'ORCLPDB1', type: 'text', required: true },
      { key: 'username', label: 'Username', placeholder: 'api_user', type: 'text', required: true },
      { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password', required: true, sensitive: true },
      { key: 'query', label: 'SQL Query', placeholder: 'SELECT * FROM GL_BALANCES WHERE PERIOD_NAME = :period', type: 'textarea', required: true, help: 'SQL query to extract data' },
    ],
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    Logo: SnowflakeLogo,
    brandColor: '#29B5E8',
    cardBg: 'bg-sky-50 dark:bg-sky-950/30',
    cardBorder: 'border-sky-100 dark:border-sky-900/40',
    iconBg: 'bg-sky-50 dark:bg-sky-900/30',
    description: 'Cloud data warehouse — tables, views & queries',
    fields: [
      { key: 'account', label: 'Account Identifier', placeholder: 'myorg-myaccount', type: 'text', required: true, help: 'e.g. myorg-myaccount (from your Snowflake URL)' },
      { key: 'username', label: 'Username', placeholder: 'PIGMENT_USER', type: 'text', required: true },
      { key: 'password', label: 'Password', placeholder: '••••••••', type: 'password', required: true, sensitive: true },
      { key: 'warehouse', label: 'Warehouse', placeholder: 'COMPUTE_WH', type: 'text', required: true },
      { key: 'database', label: 'Database', placeholder: 'ANALYTICS', type: 'text', required: true },
      { key: 'schema', label: 'Schema', placeholder: 'PUBLIC', type: 'text', required: true },
      { key: 'query', label: 'SQL Query', placeholder: 'SELECT * FROM BUDGET_ACTUALS WHERE YEAR = 2024', type: 'textarea', required: true },
    ],
  },
];

export const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 6 AM', value: '0 6 * * *' },
  { label: 'Weekly (Mon 6 AM)', value: '0 6 * * 1' },
  { label: 'Monthly (1st at 6 AM)', value: '0 6 1 * *' },
];
