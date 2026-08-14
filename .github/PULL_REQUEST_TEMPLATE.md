## What does this PR do?

<!-- A clear, one or two sentence summary of the change. -->

---

## Type of change

<!-- Check all that apply -->

- [ ] Bug fix
- [ ] New route / endpoint
- [ ] New service / chain query
- [ ] Refactor (no behaviour change)
- [ ] Docs only
- [ ] Breaking change (response shape, route path, or env var changes)

---

## Checklist

- [ ] `npm run build` passes with no TypeScript errors
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes with no warnings
- [ ] No `any` types introduced — types are in `src/types/market.ts`
- [ ] All chain interaction goes through `src/services/stellar.ts` (routes don't import `stellar-sdk` directly)
- [ ] New environment variables added to `.env.example`, `src/config/env.ts`, and README
- [ ] Response shape changes are reflected in `src/types/market.ts` and noted in the PR description
- [ ] No secrets, API keys, or `.env` values committed
- [ ] Docs updated if a route was added, removed, or its response shape changed

---

## Related issue

Closes #

---

## API changes

<!-- If this PR adds or changes a route, fill this in. Otherwise delete this section. -->

| | Details |
|---|---|
| Method + path | `GET /markets/...` |
| New / changed / removed | |
| Request params | |
| Response shape | |
| Breaking? | yes / no |

---

## Screenshots / recordings

<!-- Not typically needed for backend PRs.
     For UI-visible changes (e.g. a new field appearing on the frontend after
     this backend change), attach a screenshot. Otherwise skip this section. -->
