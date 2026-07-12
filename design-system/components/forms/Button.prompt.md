Ledger's action button — use for any tappable action; the lime `primary` variant is reserved for the single most important action on a view.

```jsx
<Button variant="primary" onClick={save}>Add entry</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="ghost" leadingIcon={<Icon name="download" />}>Export CSV</Button>
```

Variants: `primary` (lime, dark text), `secondary` (bordered), `ghost` (borderless), `dark` (near-black). Sizes: `sm` (32px), `md` (40px), `lg` (48px). Props: `fullWidth`, `disabled`, `leadingIcon`, `trailingIcon`.
