Ledger text/number field. For money, pass `prefix` and `align="right"` so amounts read as ledger figures; use `numeric` to get the decimal keypad on mobile.

```jsx
<Input label="Amount" prefix="₩" align="right" numeric placeholder="0" />
<Input label="Note" placeholder="e.g. Lunch — Kim's" />
<Input label="Amount" prefix="₩" invalid hint="Enter a number" />
```

Props: `label`, `prefix`, `suffix`, `align` (`left` | `right`), `numeric`, `invalid`, `hint`.
