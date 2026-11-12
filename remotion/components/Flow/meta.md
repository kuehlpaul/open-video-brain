# Flow – process with stations (left → right)

White card, one box per station with arrows in between; the station currently being talked about is in the accent color (list = one box per item, active box accent).

**Use when**
- A path something travels along: money flow, data path, supply chain, sales process ("The manufacturer pays the distributor, the distributor bills the retailer").
- `steps`: the accent station moves along with the narration (`[{f, i}]`, i = 0 for the first station). Without `steps`, `step` applies (static, `-1` = none highlighted).
- `title` short (≤ 12 characters), `sub` as explanation (≤ 24 characters) – both on one line.
- **Space:** 2–3 stations in split and 9:16, 4 stations only in full frame.

**Don't use**
- For processes with more than 4 steps or longer texts (→ List with `arrows: true`, top to bottom).
- For lists without an order (→ List, Words).

**Props example**
```json
{ "nodes": [
    { "title": "Manufacturer", "sub": "builds the product" },
    { "title": "Distributor", "sub": "handles billing" },
    { "title": "Retailer", "sub": "sells to customers" }
  ],
  "steps": [ { "f": -1, "i": 0 }, { "f": {"t": 905.2}, "i": 1 }, { "f": {"t": 909.8}, "i": 2 } ] }
```
Cues: `{"t": <source second>}` (from the transcript), `{"s": <seconds from graphic start>}` or frames as a number; `-1` = immediately.

**Layouts:** split (default), full · **9:16:** stage · **Duration:** ≥ 5 s, default 7 s
