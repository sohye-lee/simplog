// Tiny arithmetic evaluator for the amount field — supports + - * /,
// parentheses, and decimals. Recursive descent, no eval().
// Returns null for anything incomplete or invalid.
export function evalExpr(src: string): number | null {
  const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
  if (!s) return null;
  let i = 0;

  function num(): number | null {
    const m = /^\d*\.?\d+/.exec(s.slice(i));
    if (!m) return null;
    i += m[0].length;
    return parseFloat(m[0]);
  }

  function factor(): number | null {
    if (s[i] === '(') {
      i++;
      const v = expr();
      if (v === null || s[i] !== ')') return null;
      i++;
      return v;
    }
    if (s[i] === '-') { i++; const v = factor(); return v === null ? null : -v; }
    return num();
  }

  function term(): number | null {
    let v = factor();
    while (v !== null && (s[i] === '*' || s[i] === '/')) {
      const op = s[i++];
      const r = factor();
      if (r === null) return null;
      v = op === '*' ? v * r : v / r;
    }
    return v;
  }

  function expr(): number | null {
    let v = term();
    while (v !== null && (s[i] === '+' || s[i] === '-')) {
      const op = s[i++];
      const r = term();
      if (r === null) return null;
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }

  const v = expr();
  if (v === null || i !== s.length || !Number.isFinite(v)) return null;
  return v;
}

/** True when the string is an expression, not just a plain number. */
export function isExpression(src: string): boolean {
  return /[+*/×÷()]/.test(src) || /\d-/.test(src);
}
