import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

const DEMO_ROWS = [
  {
    sheetName: 'LCL',
    poNumber: '4130002916',
    positionNo: '10',
    cargoDetails: '12 PKGS / 1,250 KGS / 3.20 CBM',
    vessel: 'MSC Aurora',
    pickup: 'Shanghai',
    pol: 'Shanghai',
    pod: 'Chennai',
    etd: '2026-03-28',
    eta: '2026-04-16',
    raw: {},
  },
  {
    sheetName: 'FCL+Import',
    poNumber: '4130002916',
    positionNo: '20',
    cargoDetails: '1 x 40HC / 18,940 KGS / 67.50 CBM',
    vessel: 'ONE Harmony',
    pickup: 'Ningbo',
    pol: 'Ningbo',
    pod: 'Ennore',
    etd: '2026-03-31',
    eta: '2026-04-19',
    raw: {},
  },
  {
    sheetName: 'LCL',
    poNumber: '4300012345',
    positionNo: '30',
    cargoDetails: '4 CRATES / 840 KGS / 1.90 CBM',
    vessel: 'HMM Emerald',
    pickup: 'Qingdao',
    pol: 'Qingdao',
    pod: 'Visakhapatnam',
    etd: '2026-04-02',
    eta: '2026-04-21',
    raw: {},
  },
];

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
        setRows(DEMO_ROWS);
        setSource('demo');
        setError(err.message || 'Could not load Excel data. Showing demo data instead.');
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
          <p className="eyebrow">Shipment Tracking</p>
          <h1>Track your air and sea shipments</h1>
          <p className="subtitle">
            Search by <strong>PO Number</strong> or <strong>Position No</strong>. The app reads data from your Excel source and shows the latest shipment details.
          </p>
        </div>
        <div className="status-box">
          <span className={`pill ${source === 'excel' ? 'pill-success' : 'pill-warning'}`}>
            {source === 'excel' ? 'Live Excel Data' : source === 'demo' ? 'Demo Data' : 'Loading'}
          </span>
          <p>
            {source === 'excel'
              ? 'Connected to your Excel source.'
              : 'Demo mode is active because live data could not be loaded.'}
          </p>
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

        {loading && <p className="info-text">Loading shipment data…</p>}
        {!loading && error && <p className="error-text">{error}</p>}
        {!loading && !error && source === 'demo' && (
          <p className="info-text">You can test now with demo PO: 4130002916 or Position No: 10</p>
        )}
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
              <span className="sheet-badge">{row.sheetName}</span>
            </div>

            <div className="grid">
              <Field label="PO Number" value={row.poNumber} />
              <Field label="Position No" value={row.positionNo} />
              <Field label="Cargo Details" value={row.cargoDetails} />
              <Field label="Vessel" value={row.vessel} />
              <Field label="Pickup" value={row.pickup} />
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
