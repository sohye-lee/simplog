// SimplyLog — AI helpers for statement import (Supabase Edge Function).
//
//   action "map"        → read the first rows of any bank/card export and
//                         say which column is what (date, amount, …) and
//                         which rows are transfers/card payments to skip.
//   action "categorize" → turn raw bank descriptions into a clean merchant
//                         name + one of the user's own categories.
//   action "extract"    → list the transactions in text lines taken from a
//                         bank-generated PDF statement.
//
// Only signed-in users can call this. The gateway's JWT check alone is not
// enough — the public anon key is itself a valid JWT — so every request is
// checked against Supabase Auth for a real user. The Anthropic key lives in
// the function's secrets (ANTHROPIC_API_KEY).
import Anthropic from "npm:@anthropic-ai/sdk@1.8.0";
import { betaZodOutputFormat } from "npm:@anthropic-ai/sdk@1.8.0/helpers/beta/zod";
import { z } from "npm:zod@4.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-opus-5-5";
const MAX_SAMPLE_ROWS = 25;
const MAX_CELL = 160;
const MAX_DESCRIPTIONS = 120;
const MAX_PDF_LINES = 150;

// Usage limits — change them in Supabase → Edge Functions → Secrets
// (AI_MONTHLY_IMPORTS, AI_CALLS_PER_IMPORT) without redeploying.
const MONTHLY_IMPORTS = Number(Deno.env.get("AI_MONTHLY_IMPORTS") ?? "") || 5;
const CALLS_PER_IMPORT = Number(Deno.env.get("AI_CALLS_PER_IMPORT") ?? "") || 20;

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const auth = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
// Server-only: counts usage in public.ai_usage (no client access).
const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resetsOn(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

async function signedInUser(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await auth.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Schemas ─────────────────────────────────────────────────────────

const MappingSchema = z.object({
  institution: z.string(),
  headerRowIndex: z.number().int(),
  dateColumn: z.number().int(),
  dateOrder: z.enum(["MDY", "DMY", "YMD"]),
  descriptionColumn: z.number().int(),
  amountMode: z.enum(["single", "split"]),
  amountColumn: z.number().int(),
  debitColumn: z.number().int(),
  creditColumn: z.number().int(),
  expenseSign: z.enum(["negative", "positive"]),
  typeColumn: z.number().int(),
  skipTypeValues: z.array(z.string()),
  skipDescriptionPatterns: z.array(z.string()),
});

const CategorizeSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().int(),
      merchant: z.string(),
      category: z.string(),
      sub: z.string(),
    }),
  ),
});

const ExtractSchema = z.object({
  institution: z.string(),
  transactions: z.array(
    z.object({
      line: z.number().int(),
      date: z.string(),
      description: z.string(),
      amount: z.number(),
      kind: z.enum(["expense", "income"]),
      transfer: z.boolean(),
    }),
  ),
});

// ── Prompts ─────────────────────────────────────────────────────────

const MAP_SYSTEM = `You read the first rows of a transaction export downloaded from a US bank, credit card, or brokerage (Chase, Capital One, Robinhood, Amex, Bank of America, Citi, Discover, Wells Fargo, credit unions, and others). Rows are given as JSON arrays of cell strings, numbered from 0. The file may start with title or account-summary lines before the real header row.

Return how to read the transactions:
- headerRowIndex: the row holding the column names (the next row is the first transaction).
- dateColumn: the transaction (purchase) date, preferred over a posted/settle date. dateOrder: the order of the date parts as written (MDY for 01/31/2026).
- descriptionColumn: the merchant/payee/description text.
- amountMode "single" when one column holds signed or unsigned amounts (set amountColumn; debitColumn and creditColumn = -1). "split" when money out and money in are in separate columns (set debitColumn = money out, creditColumn = money in; amountColumn = -1).
- expenseSign (single mode only; use "negative" in split mode): how a purchase/spending row appears. Bank checking exports usually show spending as negative; many credit card exports show purchases as positive and payments/refunds as negative. Decide from the sample rows, the column names, and any type column.
- typeColumn: a column like Type / Transaction Type / Trans Code, or -1.
- skipTypeValues: exact values of the type column for rows that are not real spending or income: payments to the card itself, transfers between the person's own accounts, buys/sells of stocks or crypto, interest adjustments, balance lines. Empty if none.
- skipDescriptionPatterns: short lowercase substrings that appear in the description of such rows in this file, e.g. "payment thank you", "autopay", "online transfer to", "transfer from sav". Keep them specific; do not list words that would also match ordinary purchases. Empty if none.
- institution: the bank/card name if you can tell, else "Unknown".
Use -1 for any column that does not exist.`;

const CAT_SYSTEM = `You categorize personal bank and card transactions for a simple expense tracker. Each item has an index, the raw bank description, and whether it is an expense or income.

For every item return:
- merchant: a short, clean, human name for the note field (e.g. "SQ *BLUE BOTTLE COFFEE 0423 OAKLAND CA" -> "Blue Bottle Coffee", "AMZN Mktp US*2K4L19" -> "Amazon"). Title case, no store numbers, card numbers, or locations.
- category: exactly one name from the user's category list for that item's kind. If nothing fits, use "Other".
- sub: exactly one subcategory listed under the chosen category, or "" when none fits or the category has none.
Return one result per input index.`;

const EXTRACT_SYSTEM = `You read text lines taken from a PDF statement issued by a US bank, credit card, or brokerage. Each line is numbered. Only lines that contain a date and an amount were kept, so some are not transactions (balances, totals, summary rows) — leave those out. A few statement-period lines may be given first so you know the year.

Return every real transaction once:
- line: the number of the line it came from.
- date: the transaction date as YYYY-MM-DD. Statements often omit the year; take it from the statement period (a December transaction on a January statement belongs to the previous year).
- description: the merchant/payee text exactly as written on the line, without the date or amount.
- amount: the absolute amount as a positive number.
- kind: "expense" for money spent (purchases, fees, interest charged, withdrawals); "income" for money received (deposits, paychecks, refunds, credits, dividends, interest earned).
- transfer: true for rows that are not real spending or income — payments to the card itself, transfers between the person's own accounts, buys/sells of stocks or crypto. They are still listed.
On a credit card statement, purchases are expenses even when printed without a sign, and payments/credits are shown as negative or in a separate section.
- institution: the bank/card name if you can tell, else "Unknown".
Do not invent transactions; if no line is a transaction, return an empty list.`;

// ── Handlers ────────────────────────────────────────────────────────

async function extract(payload: Record<string, unknown>): Promise<Response> {
  const lines = Array.isArray(payload.lines) ? payload.lines.slice(0, MAX_PDF_LINES).map((l) => clip(l, 200)) : [];
  if (lines.length === 0) return json({ institution: "Unknown", transactions: [] });
  const context = Array.isArray(payload.context) ? payload.context.slice(0, 4).map((l) => clip(l, 160)) : [];
  const body = [
    context.length ? `Statement period lines:\n${context.join("\n")}\n` : "",
    "Lines:",
    ...lines.map((l, i) => `${i}: ${l}`),
  ].join("\n");

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(ExtractSchema) },
    system: EXTRACT_SYSTEM,
    messages: [{ role: "user", content: body }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return json({ error: "Couldn't read this PDF." }, 422);
  }
  return json(response.parsed_output);
}

function clip(s: unknown, n: number): string {
  return String(s ?? "").slice(0, n);
}

async function mapColumns(rows: unknown): Promise<Response> {
  if (!Array.isArray(rows) || rows.length === 0) return json({ error: "No rows" }, 400);
  const sample = rows
    .slice(0, MAX_SAMPLE_ROWS)
    .map((r) => (Array.isArray(r) ? r.slice(0, 40).map((c) => clip(c, MAX_CELL)) : []));
  const body = sample.map((r, i) => `${i}: ${JSON.stringify(r)}`).join("\n");

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(MappingSchema) },
    system: MAP_SYSTEM,
    messages: [{ role: "user", content: `Rows:\n${body}` }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return json({ error: "Couldn't read this file's format." }, 422);
  }
  return json({ mapping: response.parsed_output });
}

async function categorize(payload: Record<string, unknown>): Promise<Response> {
  const items = Array.isArray(payload.items) ? payload.items.slice(0, MAX_DESCRIPTIONS) : [];
  if (items.length === 0) return json({ results: [] });
  const expenseCats = payload.expenseCategories as Record<string, string[]> | undefined;
  const incomeCats = payload.incomeCategories as string[] | undefined;
  if (!expenseCats || !incomeCats) return json({ error: "Missing categories" }, 400);

  const list = [
    "Expense categories (category: subcategories):",
    ...Object.entries(expenseCats).map(([c, subs]) => `- ${clip(c, 60)}: ${(subs || []).map((s) => clip(s, 60)).join(", ") || "(none)"}`),
    "Income categories (no subcategories):",
    ...incomeCats.map((c) => `- ${clip(c, 60)}`),
  ].join("\n");
  const lines = items
    .map((it: { index?: unknown; text?: unknown; kind?: unknown }) =>
      JSON.stringify({ index: Number(it.index), description: clip(it.text, 140), kind: it.kind === "income" ? "income" : "expense" }))
    .join("\n");

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(CategorizeSchema) },
    system: CAT_SYSTEM,
    messages: [{ role: "user", content: `${list}\n\nTransactions:\n${lines}` }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return json({ error: "Couldn't categorize these transactions." }, 422);
  }
  return json({ results: response.parsed_output.results });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const userId = await signedInUser(req);
  if (!userId) return json({ error: "Sign in to use smart import." }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (payload.action === "usage") {
    const { data, error } = await admin.rpc("ai_used", { p_user: userId });
    if (error) return json({ error: "Usage unavailable." }, 500);
    return json({ used: data ?? 0, limit: MONTHLY_IMPORTS, resetsOn: resetsOn() });
  }

  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "AI is not configured on the server." }, 503);

  // Every AI call is counted against its import run; a new run counts
  // toward the monthly limit.
  const importId = String(payload.importId ?? "");
  if (!UUID.test(importId)) return json({ error: "Missing import id." }, 400);
  const { data: verdict, error: usageError } = await admin.rpc("ai_use", {
    p_user: userId, p_import: importId, p_monthly: MONTHLY_IMPORTS, p_calls: CALLS_PER_IMPORT,
  });
  if (usageError) return json({ error: "Smart import is unavailable right now." }, 500);
  if (verdict === "monthly_limit") {
    return json({
      error: `You've used this month's ${MONTHLY_IMPORTS} smart imports. More on ${resetsOn()}.`,
      code: "monthly_limit",
    }, 429);
  }
  if (verdict === "import_limit") {
    return json({ error: "This file is too large for one import. Try a shorter date range.", code: "import_limit" }, 429);
  }

  try {
    if (payload.action === "map") return await mapColumns(payload.rows);
    if (payload.action === "categorize") return await categorize(payload);
    if (payload.action === "extract") return await extract(payload);
    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: "AI is busy — try again in a minute." }, 429);
    if (err instanceof Anthropic.APIError) return json({ error: `AI request failed (${err.status}).` }, 502);
    return json({ error: "Unexpected error." }, 500);
  }
});
