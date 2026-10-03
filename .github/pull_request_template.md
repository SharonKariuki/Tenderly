## What was implemented
<!-- 2-5 bullet points in plain language -->

## Milestone and owner
M_ / A | B | C        Branch: feat/_-_       Base: dev

## Files, apps and modules touched
<!-- list files; confirm they belong to an app you own (G8) -->

## API changes
<!-- endpoint, request, example response. "None" if none -->

## Migrations / env changes
<!-- migration file names (G13), new env vars added to .env.example -->

## Canonical rules touched
<!-- e.g. R1, R4, R9 and how the code honours them -->

## How to test
<!-- exact commands or Swagger steps, plus the expected result -->

## Evidence
<!-- pytest output, curl/Swagger response, accuracy table -->

## Known limitations
<!-- what does not work yet; what a reviewer should not expect -->

## Checklist
- [ ] Synced with dev, rebased, and ran migrate before opening this PR (G3)
- [ ] Server starts, migrations apply, pytest passes, ruff clean (G7)
- [ ] No .env, keys, real IDs or real documents committed
- [ ] Queries are scoped to the user (R19); no contents or IDs in logs (R16)
- [ ] Description is complete; I will not merge this myself (G4)
