import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

const COLUMN_ALIASES = {
  poNumber: ['po_number', 'po number', 'ponumber', 'po no', 'po', 'purchase order'],
  positionNo: ['position_no', 'position no', 'position', 'pos no', 'item no', 'line item'],
  pieces: [
    'pieces',
    'pcs',
    'pkgs',
    'packages',
    'package count',
    'no of boxes',
    'no of packages',
    'boxes',
    'cartons',
    'qty',
  ],
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

    if (
      exactKey &&
      row[exactKey] !== undefined &&
      row[exactKey] !== null &&
      row[exactKey] !== ''
    ) {
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
  const pieces = getMappedValue(row, COLUMN_ALIASES.pieces);
  const grossWeight = getMappedValue(row, COLUMN_ALIASES.grossWeight);

  return [
    pieces ? `${pieces} PKGS` : '',
    grossWeight ? `${grossWeight} KGS` : '',
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

async function loadWorkbookData() {
  const response = await fetch('/data.xlsx');

  if (!response.ok) {
    throw new Error(`Could not load shipment data. Status: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const targetSheets = workbook.SheetNames.filter((name) =>
    ['lcl', 'fcl+import'].includes(name.toLowerCase())
  );

  const sheetsToUse = targetSheets.length ? targetSheets : workbook.SheetNames;

  const rows = sheetsToUse.flatMap((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    return json.map((row) => mapRow(row, sheetName));
  });

  return { rows, source: 'excel' };
}

function App() {
  const [rows, setRows] = useState([]);
  const [source, setSource] = useState('loading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchMode, setSearchMode] = useState('po');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError('');
        const result = await loadWorkbookData();
        if (!active) return;
        setRows(result.rows || []);
        setSource(result.source || 'excel');
      } catch (err) {
        if (!active) return;
        setRows([]);
        setSource('error');
        setError(err.message || 'Could not load Excel data.');
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return [];

    return rows.filter((row) => {
      const value = searchMode === 'po' ? row.poNumber : row.positionNo;
      return String(value || '').toLowerCase().includes(query);
    });
  }, [rows, searchMode, searchText]);

  const hasSearch = searchText.trim().length > 0;

  return (
    <div className="page">
      <div className="hero-card">
        <div>
          <p className="eyebrow">SHIPMENT TRACKING</p>
          <h1>Track your air and sea shipments</h1>
          <p className="subtitle">
            Search by <strong>PO Number</strong> or <strong>Position No.</strong> The app reads data from your Excel source
            and shows the latest shipment details.
          </p>
        </div>

        <div className="logo-box">
          <img src="/tkm-logo.jpg" alt="TKM Logo" className="tkm-logo" />
        </div>
      </div>

      <div className="search-card">
        <div className="toggle-row">
          <button
            className={searchMode === 'po' ? 'toggle active' : 'toggle'}
            onClick={() => setSearchMode('po')}
          >
            Search by PO Number
          </button>
          <button
            className={searchMode === 'position' ? 'toggle active' : 'toggle'}
            onClick={() => setSearchMode('position')}
          >
            Search by Position No
          </button>
        </div>

        <input
          className="search-input"
          type="text"
          placeholder={searchMode === 'po' ? 'Enter PO Number' : 'Enter Position No'}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        {loading && <p className="info-text">Loading shipment data...</p>}
        {!loading && error && <p className="error-text">{error}</p>}
      </div>

      <div className="results-section">
        {hasSearch && filteredRows.length === 0 && !loading && (
          <div className="empty-card">No shipment found for this search.</div>
        )}

        {!hasSearch && !loading && (
          <div className="empty-card">Enter a value above to search shipments.</div>
        )}

        {filteredRows.map((row, index) => (
          <div className="result-card" key={`${row.poNumber}-${row.positionNo}-${index}`}>
            <div className="result-header">
              <h2>Shipment Details</h2>
            </div>

            <div className="grid">
              <Field label="PO Number" value={row.poNumber} />
              <Field label="Position No" value={row.positionNo} />
              <Field label="Cargo Details" value={row.cargoDetails} />
              <Field label="Vessel" value={row.vessel} />
              <Field label="POL" value={row.pol} />
              <Field label="POD" value={row.pod} />
              <Field label="ETD" value={row.etd} />
              <Field label="ETA" value={row.eta} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <span className="field-value">{value || '—'}</span>
    </div>
  );
}

export default App;
