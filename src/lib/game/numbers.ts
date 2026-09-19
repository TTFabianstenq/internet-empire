/** Decimal strings for values that exceed JS Number safely. */

const MAX_EXP = 1e12;

export function n(v: string | number): string {
  if (typeof v === "number") {
    if (!Number.isFinite(v) || v < 0) return "0";
    return String(v);
  }
  if (!v || v === "NaN" || v === "Infinity") return "0";
  const s = v.trim();
  if (!s || s.startsWith("-")) return "0";
  return s;
}

function parse(s: string): { c: number; e: number } {
  const t = n(s);
  const m = t.match(/^([0-9]*\.?[0-9]+)[eE]\+?(-?\d+)$/);
  if (m) {
    return { c: Number(m[1]), e: Number(m[2]) };
  }
  const num = Number(t);
  if (!Number.isFinite(num)) return { c: 0, e: 0 };
  if (num === 0) return { c: 0, e: 0 };
  const e = Math.floor(Math.log10(num));
  return { c: num / 10 ** e, e };
}

function norm(c: number, e: number): { c: number; e: number } {
  if (!Number.isFinite(c) || c <= 0) return { c: 0, e: 0 };
  if (e > MAX_EXP) return { c: 9.99, e: MAX_EXP };
  while (c >= 10) {
    c /= 10;
    e += 1;
  }
  while (c < 1 && c > 0) {
    c *= 10;
    e -= 1;
  }
  return { c, e };
}

export function add(a: string, b: string): string {
  const A = parse(a);
  const B = parse(b);
  if (A.c === 0) return serialize(B);
  if (B.c === 0) return serialize(A);
  if (A.e - B.e > 15) return serialize(A);
  if (B.e - A.e > 15) return serialize(B);
  if (A.e >= B.e) {
    return serialize(norm(A.c + B.c * 10 ** (B.e - A.e), A.e));
  }
  return serialize(norm(B.c + A.c * 10 ** (A.e - B.e), B.e));
}

export function sub(a: string, b: string): string {
  const A = parse(a);
  const B = parse(b);
  if (B.c === 0) return serialize(A);
  if (A.e - B.e > 15) return serialize(A);
  if (cmp(a, b) <= 0) return "0";
  return serialize(norm(A.c - B.c * 10 ** (B.e - A.e), A.e));
}

export function mul(a: string, b: string): string {
  const A = parse(a);
  const B = parse(b);
  return serialize(norm(A.c * B.c, A.e + B.e));
}

export function muln(a: string, k: number): string {
  if (!Number.isFinite(k) || k <= 0) return "0";
  const A = parse(a);
  return serialize(norm(A.c * k, A.e));
}

export function cmp(a: string, b: string): number {
  const A = parse(a);
  const B = parse(b);
  if (A.c === 0 && B.c === 0) return 0;
  if (A.e !== B.e) return A.e > B.e ? 1 : -1;
  if (A.c === B.c) return 0;
  return A.c > B.c ? 1 : -1;
}

export function gte(a: string, b: string): boolean {
  return cmp(a, b) >= 0;
}

function serialize(x: { c: number; e: number }): string {
  if (x.c === 0) return "0";
  if (x.e < 12 && x.e > -6) {
    const v = x.c * 10 ** x.e;
    if (Number.isFinite(v)) {
      if (Number.isInteger(v) || Math.abs(v - Math.round(v)) < 1e-9) {
        return String(Math.round(v));
      }
      return String(Number(v.toPrecision(12)));
    }
  }
  return `${x.c.toPrecision(8)}e${x.e}`;
}

const SUFFIX = [
  "", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc",
  "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Ocd", "Nod"
];

export function formatNum(s: string): string {
  const p = parse(s);
  if (p.c === 0) return "0";
  if (p.e < 3) {
    const v = p.c * 10 ** p.e;
    return v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : String(Math.floor(v));
  }
  const group = Math.floor(p.e / 3);
  if (group < SUFFIX.length) {
    const val = p.c * 10 ** (p.e - group * 3);
    return `${val.toFixed(val >= 100 ? 0 : val >= 10 ? 1 : 2)}${SUFFIX[group]}`;
  }
  return `${p.c.toFixed(2)}e${p.e}`;
}
