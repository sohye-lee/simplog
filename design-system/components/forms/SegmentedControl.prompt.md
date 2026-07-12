Toggle for small mutually-exclusive choices — the active segment gets the lime fill.

```jsx
<SegmentedControl
  options={['Expense', 'Income']}
  value={kind}
  onChange={setKind}
  fullWidth
/>
```

Props: `options`, `value`, `onChange`, `size` (`sm`|`md`), `fullWidth`.
