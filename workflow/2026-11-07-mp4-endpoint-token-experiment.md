# MP4 endpoint coding experiment

## Setup

On 7 November, two fresh GPT-6.1 Sol sessions at low reasoning effort wrote the same dependency-injected TypeScript Tester suggestion endpoint in separate temporary folders with identical planning files. The focused run started first. The broad run was assigned the product spec, two release plans and the whole assistant OpenSpec change. The focused run was directed to the limited-context and server-quota requirements and endpoint design. Both got the same endpoint contract and were limited to endpoint.ts.

The endpoint verifies identity and Tester access, validates input, checks that the selected project is active, reserves quota, constructs an allowlisted model request, and validates structured model output. Authentication, project lookup, quota and generation use fake dependencies. The checker was introduced after first-pass coding. It covered 18 behaviors, including the exact outbound object, absence of an upstream call after denial, Unicode limits, partial responses, and safe failure messages.

## First pass and correction

Both programs returned 403 for an authenticated Tester whose request should have advanced to input validation and returned 400. Both used title-case Tester. The benchmark's prose said Tester but omitted the literal lowercase role value that BugWatch uses. The coordinator sent the same one-line contract clarification to both in fresh Codex sessions and ran the same checker again. These are measured repair runs. The first focused repair started while the broad initial run was still in progress. Cache state and timing were uncontrolled.

| Arm | Initial tokens | Repair tokens | Total through pass | Total uncached input | Agent elapsed | Final checks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Broad | 229,559 | 50,962 | 280,521 | 44,670 | 106.5 s | 18/18 |
| Focused | 136,068 | 51,117 | 187,185 | 28,840 | 111.3 s | 18/18 |

| Run | Input | Cached input within input | Output |
| --- | ---: | ---: | ---: |
| Broad initial | 226,963 | 203,008 | 2,596 |
| Broad correction | 50,667 | 29,952 | 295 |
| Focused initial | 133,403 | 110,080 | 2,665 |
| Focused correction | 50,829 | 45,312 | 288 |

Codex CLI completion events supplied token counts. Agent elapsed sums the two invocations per arm and excludes checker runtime and setup. Both final programs passed the same strict TypeScript check. The isolated code and raw traces remain in the local temporary experiment folder.

## Interpretation

Focused used 93,336 fewer total tokens through the passing result, a 33.3% reduction. Uncached input fell 35.4%. The focused arm took 4.8 seconds longer in measured agent time. Looking only at the first attempts would show a larger token reduction of 40.7%, but both implementations were failing then.

This is a larger coding task than the [pure quota function](2026-11-07-mp4-coding-token-pilot.md) and includes correction cost. The shared interface failure shows why concrete contract values matter even when the behavioral rule seems clear. Results concern a mock-backed endpoint, one pair, and one correction per arm. Production Supabase concurrency, real provider behavior, and Vercel deployment are outside this checker. No production source changed.
