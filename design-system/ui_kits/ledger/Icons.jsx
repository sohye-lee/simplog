// Ledger iconography — Lucide (MIT) path data, rendered inline so the
// kit has no runtime icon dependency. Stroke 2, 24×24, currentColor.
const PATHS = {
  plus: ['M5 12h14', 'M12 5v14'],
  minus: ['M5 12h14'],
  'chevron-left': ['m15 18-6-6 6-6'],
  'chevron-right': ['m9 18 6-6-6-6'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  'trash-2': ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6'],
  search: ['m21 21-4.34-4.34'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  calendar: ['M8 2v4', 'M16 2v4', 'M3 10h18'],
  check: ['M20 6 9 17l-5-5'],
  'arrow-up-right': ['M7 7h10v10', 'M7 17 17 7'],
  home: ['M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8', 'M3 10.2a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6a2 2 0 0 1 .7 1.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  sliders: ['M21 4h-7', 'M10 4H3', 'M21 12h-9', 'M8 12H3', 'M21 20h-5', 'M12 20H3', 'M14 2v4', 'M8 10v4', 'M16 18v4'],
  chart: ['M3 3v16a2 2 0 0 0 2 2h16', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
  filter: ['M22 3H2l8 9.46V19l4 2v-8.54z'],
  wallet: ['M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2', 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4'],
  'file-down': ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z', 'M14 2v5h5', 'M12 12v6', 'm9 15 3 3 3-3'],
};
const CIRCLES = { search: [{ cx: 11, cy: 11, r: 8 }] };
const RECTS = { calendar: [{ x: 3, y: 4, width: 18, height: 18, rx: 2 }] };

function Icon({ name, size = 18, strokeWidth = 2, style = {}, ...rest }) {
  const paths = PATHS[name] || [];
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} {...rest}
    >
      {(RECTS[name] || []).map((r, i) => <rect key={'r' + i} {...r} />)}
      {(CIRCLES[name] || []).map((c, i) => <circle key={'c' + i} {...c} />)}
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

window.LedgerIcon = Icon;
