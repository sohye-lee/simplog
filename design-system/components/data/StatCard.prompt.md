Headline figure with a label — the monthly summary strip is three of these (Income / Spent / Left). Set `accent` on the one stat that matters most.

```jsx
<StatCard label="Income" value={3200000} />
<StatCard label="Spent" value={1840000} delta="58% of income" />
<StatCard label="Left" value={1360000} accent />
```

Props: `label`, `value`, `currency`, `delta`, `accent`.
