# Example — Cursor: add inventory caching

**Target:** `cursor`

```markdown
# Goal
Add an in-memory TTL cache for inventory list reads without changing the API contract.

# Context
- Repo: mission-control style Next.js app
- Likely paths: `src/lib/inventory*`, `src/app/api/inventory/**`

# Existing State
Inspect current inventory fetch path first. Note whether caching already exists.

# Requirements
- Cache GET list responses for 30s TTL
- Invalidate (or bypass) on mutating methods
- Keep response shape identical
- Add a short unit or integration test if a test harness exists

# Implementation
1. Read existing fetch/cache utilities before inventing a new one.
2. Wire cache at the data-access layer, not in every route ad hoc.
3. Avoid global mutable state patterns the codebase does not already use.

# Constraints
- No new cloud cache service
- Do not refactor unrelated auth or UI

# Verification
- `npm test` (or project equivalent)
- Manual: two GETs within TTL should not double-fetch upstream if observable
- Mutating call should not serve stale list

# Deliverables
- Files changed
- How invalidation works
- Residual risks
```
