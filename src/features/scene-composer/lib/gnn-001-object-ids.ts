/** Deterministic UUIDs for GNN-001 seeded objects (Postgres UUID columns). */
export const GNN_001_OBJECT_IDS = {
  background: "a1000001-0001-4000-8000-000000000001",
  "left-side-panel": "a1000001-0001-4000-8000-000000000003",
  "reporter-logo": "a1000001-0001-4000-8000-000000000004",
  "optional-info-2": "a1000001-0001-4000-8000-000000000005",
  "main-video": "a1000001-0001-4000-8000-000000000006",
  "lower-info-panel": "a1000001-0001-4000-8000-000000000007",
  headline: "a1000001-0001-4000-8000-000000000008",
  subheadline: "a1000001-0001-4000-8000-000000000009",
  ticker: "a1000001-0001-4000-8000-00000000000a",
  "meta-info-bar": "a1000001-0001-4000-8000-000000000010",
} as const;

export type Gnn001ObjectKey = keyof typeof GNN_001_OBJECT_IDS;
