// SimplyLog — AI helpers for statement import (Supabase Edge Function).
//
//   action "map"        → read the first rows of any bank/card export and
//                         say which column is what (date, amount, …) and
//                         which rows are transfers/card payments to skip.
//   action "categorize" → turn raw bank descriptions into a clean merchant
//                         name + one of the user's own categories.
//
// Only signed-in users can call this (Supabase verifies the JWT before the
// request reaches us). The Anthropic key lives in the function's secrets:
//   supabase secrets set ANTHROPIC_API_KEY=...
import Anthropic from "npm:@anthropic-ai/sdk@1.8.0";
import { betaZodOutputFormat } from "npm:@anthropic-ai/sdk@1.8.0/helpers/beta/zod";
import { z } from "npm:zod@4.6.7";

const MODEL = "claude-opus-5-5";
const MAX_SAMPLE_ROWS = 25;
const MAX_CELL = 160;
const MAX_DESCRIPTIONS = 120;

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

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

// ── Handlers ────────────────────────────────────────────────────────

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
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "AI is not configured on the server." }, 503);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  try {
    if (payload.action === "map") return await mapColumns(payload.rows);
    if (payload.action === "categorize") return await categorize(payload);
    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: "AI is busy — try again in a minute." }, 429);
    if (err instanceof Anthropic.APIError) return json({ error: `AI request failed (${err.status}).` }, 502);
    return json({ error: "Unexpected error." }, 500);
  }
});
