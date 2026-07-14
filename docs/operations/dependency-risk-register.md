# Dependency Risk Register

| Package | Advisory | Severity | Production path / exposure | Disposition | Owner | Review date |
|---|---|---|---|---|---|---|
| `postcss@8.4.31` | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) — XSS via unescaped `</style>` in CSS stringify output | Moderate | `next@16.2.9` transitively resolves the affected version. Assess whether untrusted CSS can reach server-side stringify output before release. | Accepted temporarily: `pnpm audit --prod --audit-level high` blocks high/critical findings and returns exit 0 for this moderate finding. Do not automatically upgrade Next outside a targeted compatibility assessment. | Platform team | 2026-08-12 |
