import * as XLSX from 'xlsx';

const EXCEL_FILE_URL =
  'https://tkmglobal-my.sharepoint.com/:x:/g/personal/kkannan_tkmglobal_net/IQAEQUPfAHgYS4Nv3gcKJT5vAYLuJ4BjFb5zmEwSzBfmkPs?download=1';

const COLUMN_ALIASES = {
  poNumber: ['po_number', 'po number', 'ponumber', 'po no', 'po', 'purchase order'],
  positionNo: ['position_no', 'position no', 'position', 'pos no', 'item no', 'line item'],
  pieces: ['pieces', 'pcs', 'pkgs', 'packages', 'package count'],
  grossWeight: ['gross wt', 'gross weight', 'gw', 'weight', 'g.wt'],
  cbm: ['cbm', 'volume', 'm3', 'cube'],
  vessel: ['vessel', 'carrier / vessel', 'mother vessel'],
  pickup: ['pickup', 'pick up', 'place of pickup', 'origin', 'pickup location'],
  pol: ['pol', 'port of loading', 'load port'],
  pod: ['pod', 'port of discharge', 'destination port'],
  etd: ['etd', 'estimated time of departure', 'departure'],
  eta: ['eta', 'estimated time of arrival', 'arrival'],
  cargoDetails: ['cargo details', 'cargo', 'description', 'goods description'],
};

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getMappedValue(row, aliases) {
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const normalizedAlias = normalizeKey(alias);
    const exactKey = rowKeys.find((key) => normalizeKey(key) === normalizedAlias);
    if (exactKey && row[exactKey] !== undefined && row[exactKey] !== null && row[exactKey] !== '') {
      return row[exactKey];
    }
  }
  return '';
}

function formatExcelDate(value) {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return String(value);
    const date = new Date(parsed.y, parsed.m - 1, parsed.d);
    return date.toISOString().slice(0, 10);
  }

  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime())) {
    return asDate.toISOString().slice(0, 10);
  }

  return String(value);
}

function buildCargoDetails(row) {
  const direct = getMappedValue(row, COLUMN_ALIASES.cargoDetails);
  if (direct) return String(direct);

  const pieces = getMappedValue(row, COLUMN_ALIASES.pieces);
  const grossWeight = getMappedValue(row, COLUMN_ALIASES.grossWeight);
  const cbm = getMappedValue(row, COLUMN_ALIASES.cbm);

  return [
    pieces ? `${pieces} PCS/PKGS` : '',
    grossWeight ? `${grossWeight} KGS` : '',
    cbm ? `${cbm} CBM` : '',
  ]
    .filter(Boolean)
    .join(' / ');
}

function mapRow(row, sheetName) {
  return {
    sheetName,
    poNumber: String(getMappedValue(row, COLUMN_ALIASES.poNumber) || '').trim(),
    positionNo: String(getMappedValue(row, COLUMN_ALIASES.positionNo) || '').trim(),
    cargoDetails: buildCargoDetails(row),
    vessel: String(getMappedValue(row, COLUMN_ALIASES.vessel) || '').trim(),
    pickup: String(getMappedValue(row, COLUMN_ALIASES.pickup) || '').trim(),
    pol: String(getMappedValue(row, COLUMN_ALIASES.pol) || '').trim(),
    pod: String(getMappedValue(row, COLUMN_ALIASES.pod) || '').trim(),
    etd: formatExcelDate(getMappedValue(row, COLUMN_ALIASES.etd)),
    eta: formatExcelDate(getMappedValue(row, COLUMN_ALIASES.eta)),
    raw: row,
  };
}

export default async function handler(req, res) {
  try {
    const response = await fetch(EXCEL_FILE_URL);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Could not download Excel file. Status: ${response.status}`,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer' });

    const targetSheets = workbook.SheetNames.filter((name) =>
      ['lcl', 'fcl+import'].includes(name.toLowerCase())
    );

    const sheetsToUse = targetSheets.length ? targetSheets : workbook.SheetNames;

    const rows = sheetsToUse.flatMap((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      return json.map((row) => mapRow(row, sheetName));
    });

    return res.status(200).json({ rows, source: 'excel' });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Server failed to load Excel data.',
    });
  }
}
