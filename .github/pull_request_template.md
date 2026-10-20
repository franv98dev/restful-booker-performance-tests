## What does this PR change?

<!-- Short description of the scenario, threshold or tooling change. -->

## Checklist

- [ ] `npm run check` passes (typecheck, lint, format)
- [ ] The smoke test passes locally (`npm run api:up && npm run test:smoke`)
- [ ] New requests carry an `endpoint` tag (see `src/lib/client.ts`)
- [ ] Threshold changes are justified in the description
- [ ] Load is only sent to the local API, never to a shared or production system
