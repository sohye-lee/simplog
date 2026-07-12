The core money figure — tabular currency amount used everywhere in Ledger. Symbol is de-emphasized; digits are slashed-zero tabular so columns align.

```jsx
<Amount value={2480000} size="xl" />          {/* ₩2,480,000 */}
<Amount value={-42000} size="sm" />           {/* −₩42,000   */}
<Amount value={125.5} currency="USD" size="lg" emphasis="accent" />
```

Props: `value`, `currency` (KRW default), `size` (xs–xl), `signed`, `emphasis` (`normal`|`muted`|`accent`), `decimals`.
