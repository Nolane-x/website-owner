# Static Security Scan Triage

Date reviewed: 2026-10-14
Repository: `Nolane-x/website-owner`
Reviewed revision: `e120e1cbac151bd8114ce217bb56b231538bc9c9`

## Scan summary

The GitHub Actions Semgrep OSS workflow loaded all 14 configured rule groups and completed successfully. It reported **0 ERROR, 3 WARNING, 42 INFO, 0 INVENTORY** findings (45 unique rule/location pairs total). The informational Apiiro one-liner findings are style heuristics, not security defects.

## Reviewed warnings

| Rule | Location | Triage | Evidence / recheck condition |
|---|---|---|---|
| `typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml` | `src/app/(public)/p/[slug]/p-client.tsx:158` | Mitigated sink; keep under review | Markdown is parsed by `marked` and immediately passed through `sanitizeHtml` before reaching `dangerouslySetInnerHTML`. The shared sanitizer uses DOMPurify with an explicit allowlist and data attributes disabled. Recheck if the sanitizer, allowed protocols/attributes, or render path changes. |
| `audit-rules.apiiro.obfuscation.javascript_typescript.javascript-obfuscation-methods-masking` | `src/lib/tools/scientific-calculator.ts:27` | Reviewed false positive | The replacements convert user-facing mathematical glyphs (`π`, `×`, `÷`, Unicode minus) to parser tokens. The expression is tokenized and evaluated by the calculator parser; this line does not decode, hide, or execute a payload. Recheck if dynamic code execution is introduced. |
| `javascript.express.security.x-frame-options-misconfiguration.x-frame-options-misconfiguration` | `worker/src/index.ts:170` | Reviewed false positive | The Worker explicitly sets `X-Frame-Options: DENY`, which blocks framing rather than allowing it. The same gateway also sets `X-Content-Type-Options: nosniff`. Recheck if the header value or upstream response-header policy changes. |

These findings have not been silently suppressed. The scan remains visible and CI will run again on future changes. This document is a triage note, not a claim that the entire application has received a formal penetration test.

## Dependency advisory exception

The full dependency audit separately reports the unpatched `braces` advisory `GHSA-vfj7-8cjw-p6xm` through the development-only ESLint dependency chain. Production dependencies pass `npm audit --omit=dev --audit-level=moderate`. CI permits only this exact lockfile-verified development chain, and fails if the advisory shape, path, severity, lockfile status, or proposed fix changes. npm currently proposes a breaking major downgrade of `eslint-config-next`; no forced downgrade is applied. Reassess this exception when upstream publishes a compatible fix.
