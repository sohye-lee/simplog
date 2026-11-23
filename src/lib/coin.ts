// SimplyLog mark — a thin teal coin standing on its edge, drawn for any
// rotation angle around its vertical axis. Pure string output so the same
// geometry feeds the animated header logo (React) and the static
// favicon / app icons (scripts/gen-logo.ts).
//
// Projection: the coin spins about the vertical axis by `theta` (radians).
// With c = cos θ and s = sin θ, a face is an ellipse of rx = R·|c|, the two
// faces sit T·s apart horizontally, and the reeded rim shows as short
// horizontal ticks between them on the side that faces the viewer.

export const COIN_REST = (-48 * Math.PI) / 180; // resting pose, face turned left

const CX = 32;
const CY = 32;
const R = 26;      // face radius (viewBox 64)
const T = 3.2;     // thickness — thin, like a real coin (~1:8)
const LIP = 3.1;   // raised rim width on the face
const REEDS = 120; // ridges around the edge

// Teal ramp used for shading (dark → light)
const EDGE = '#0E8676';
const REED = '#075247';
const FACE_DARK = [11, 135, 119];    // face turned away
const FACE_LIGHT = [15, 181, 160];   // #0FB5A0 — brand teal, facing us

const f = (n: number) => (Math.round(n * 100) / 100).toString();
const mix = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;

export function coinMarkup(theta: number): string {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const ac = Math.abs(c);
  const facing = c >= 0 ? 1 : -1;            // which face is toward us
  const fx = CX + facing * (T / 2) * s;      // visible face center
  const bx = CX - facing * (T / 2) * s;      // hidden face center
  const out: string[] = [];

  // Rim: hidden face + band between the two faces
  out.push(`<ellipse cx="${f(bx)}" cy="${CY}" rx="${f(R * ac)}" ry="${R}" fill="${EDGE}"/>`);
  const x0 = Math.min(fx, bx), w = Math.abs(fx - bx);
  if (w > 0.01) out.push(`<rect x="${f(x0)}" y="${CY - R}" width="${f(w)}" height="${R * 2}" fill="${EDGE}"/>`);

  // Reeding: ticks across the thickness on the viewer-facing half of the rim
  if (Math.abs(s) > 0.02) {
    let d = '';
    for (let k = 0; k < REEDS; k++) {
      const phi = (k / REEDS) * Math.PI * 2;
      const sp = Math.sin(phi);
      if (sp * s >= 0) continue;            // rim normal points away from us
      const y = CY - R * Math.cos(phi);
      const xm = CX + R * sp * c;
      d += `M${f(xm + (T / 2) * s)} ${f(y)}H${f(xm - (T / 2) * s)}`;
    }
    out.push(`<path d="${d}" stroke="${REED}" stroke-width="0.45" fill="none"/>`);
  }

  // Face — brighter when it squarely faces us
  const light = 0.35 + 0.65 * ac;
  out.push(`<ellipse cx="${f(fx)}" cy="${CY}" rx="${f(R * ac)}" ry="${R}" fill="${mix(FACE_DARK, FACE_LIGHT, light)}"/>`);
  if (ac > 0.08) {
    // one thin line marking the raised rim
    out.push(`<ellipse cx="${f(fx)}" cy="${CY}" rx="${f((R - LIP) * ac)}" ry="${R - LIP}" fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="0.7"/>`);
  }
  return out.join('');
}

/** Standalone SVG document (transparent unless `background` is given). */
export function coinSvg(opts: { theta?: number; size?: number; background?: string; scale?: number } = {}): string {
  const { theta = COIN_REST, size = 64, background, scale = 1 } = opts;
  const inner = coinMarkup(theta);
  const g = scale === 1 ? inner : `<g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${inner}</g>`;
  const bg = background ? `<rect width="64" height="64" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">${bg}${g}</svg>`;
}
