# Shipment Tracker App

A simple React app that lets customers search shipment details by **PO Number** or **Position No**.

## What this app does

- Searches shipment data from an Excel workbook
- Reads data from sheets like **LCL** and **FCL+Import**
- Shows:
  - PO Number
  - Position No
  - Cargo Details
  - Vessel
  - Pickup
  - POL
  - POD
  - ETD
  - ETA
- Includes **demo data** so you can test immediately after deploying to GitHub + Vercel

---

## Files to edit

Open `src/App.jsx` and replace this line:

```js
const EXCEL_FILE_URL = 'PASTE_YOUR_PUBLIC_ONEDRIVE_DOWNLOAD_LINK_HERE';
```

with your public OneDrive direct download link.

Example:

```js
const EXCEL_FILE_URL = 'https://yourcompany-my.sharepoint.com/.../file.xlsx?download=1';
```

Important:
- The file must be publicly accessible
- The link should work in an incognito browser window
- Keep `?download=1` at the end

---

## Best way to test without local installation

### Option A: GitHub + Vercel

1. Create a new GitHub repository
2. Upload all files from this project
3. Go to Vercel
4. Import the GitHub repository
5. Deploy
6. Open the website link from Vercel

Vercel will automatically run:
- `npm install`
- `npm run build`

So you do not need to run scripts on your office laptop.

---

## Demo test values

If you deploy without adding your Excel link, the app still works in demo mode.

Use:
- **PO Number:** `4130002916`
- **Position No:** `10`

---

## Notes

- If your Excel column names are slightly different, the app tries to match common variations automatically.
- If the Excel file cannot be loaded, the app falls back to demo data.
- For production scale, later you can move the Excel data into a database or use Microsoft Graph API.
