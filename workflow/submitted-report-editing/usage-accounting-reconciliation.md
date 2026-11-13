# Reconciliation usage observation

The numeric snapshots are now lossless gzip downloads. Their JSON records and hash chain are unchanged after decompression. See [retention and extraction details](evidence-retention.md). Historical filename references inside the snapshots identify the original JSON bytes.

The reconciliation phase contains **45,723,383 observed tokens across 360 response records in 10 sessions**. Input is 45,621,438 tokens, including 44,966,016 cached tokens; uncached input is 655,422. Output is 101,945 tokens, including 28,344 reasoning tokens. Cache-write input is recorded as zero. Actual charges and separate tool, system and image-model usage remain unknown.

## Window and scope

The inclusive window starts at the exact root user request to reconcile and prepare the PR, **2026-11-12T14:11:17.454Z**, root ordinal15338. The fixed cutoff is **2026-11-12T16:01:40.803Z**. It includes root coordination, the eight direct reconciliation agents, and the resumed usage collector. Analysis, implementation, tests, documentation, runtime, UI checks, reviews, inspections, retries and fixes are included through that cutoff. This is observational bookkeeping, not a new workflow experiment.

The collector contributes **126,520 tokens in 2 records** before cutoff. That overhead is included openly. The remainder of collection and later final reviews or PR publishing are outside the fixed window. Root can contain additional measurement overhead that this separate session count does not isolate. No older unrelated assistant session had an owned numeric record inside the window; those agents were outside the explicit inclusion set. Managed guardians remain outside this record and their usage is unknown.

Coordinator-provided code context was current code commit fc2791d and base9909315. The token observation is attached to a time interval, not a claim that every request used the final code revision. Other agents own code and results evidence.

## Per-session counts

| Session | Records | Input | Cached input (subset) | Output | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| /root | 113 | 27,371,089 | 27,289,088 | 50,525 | 27,421,614 |
| /root/editing_usage_evidence | 2 | 126,036 | 69,248 | 484 | 126,520 |
| /root/reconcile_backend | 25 | 1,495,924 | 1,442,432 | 7,519 | 1,503,443 |
| /root/reconcile_docs | 12 | 447,287 | 402,432 | 3,228 | 450,515 |
| /root/reconcile_frontend | 16 | 830,511 | 785,280 | 4,209 | 834,720 |
| /root/reconcile_pr9_analysis | 11 | 548,596 | 500,224 | 2,263 | 550,859 |
| /root/reconcile_review | 85 | 8,834,061 | 8,691,840 | 11,589 | 8,845,650 |
| /root/reconcile_runtime | 26 | 1,182,140 | 1,151,360 | 4,315 | 1,186,455 |
| /root/reconcile_tests | 55 | 4,151,475 | 4,051,584 | 12,857 | 4,164,332 |
| /root/reconcile_ui_check | 15 | 634,319 | 582,528 | 4,956 | 639,275 |

## Method and source checks

[usage-observation-03.json.gz](usage-observation-03.json.gz) retains numeric records and technical identifiers. The local collector reads session_meta to identify owning session IDs and direct children of the root. Only the named reconciliation agents and the collector continuation are selected. Each token_usage_record must fall within the inclusive window and have payload.thread_id equal to its owning session ID. Response-level usage is deduplicated by session ID plus response ID; exported response IDs are SHA-256 hashes. No duplicate owned responses or mismatched-thread records were encountered.

All counters are nonnegative safe integers. Cached input is a subset of input; reasoning is a subset of output. Total equals input plus output. Those subsets are never added again. Per-session counts and aggregate sums are checked against the source records.

Root cumulative counters provide a separate boundary check: final owning cumulative usage minus the last pre-anchor owning usage is **27,421,614 total tokens**, exactly equal to the root response-level sum. Intermediate cumulative counters are never summed. The JSON preserves both exact boundary timestamps, ordinals and numeric counters.

Each source entry records its filename, complete-line byte-prefix length and SHA-256 digest. Independent checking can hash exactly the first sourcePrefixBytes bytes even after a live file appends, then compare each recorded ordinal, timestamp, owning thread, response-ID hash and usage. These hashes support local reproduction; they do not authenticate provider billing. No raw prompts, credentials or account records are exported. The ignored helper runtime.local/collect-reconciliation-usage.cjs reads local files and makes no external calls.

## Earlier evidence and limits

[usage-observation-02.json.gz](usage-observation-02.json.gz) remains unchanged; its SHA-256 is preserved in snapshot03. Its cutoff, **2026-11-12T11:49:21.848Z**, precedes this anchor. The intervening gap is unmeasured here. The windows do not overlap, and this snapshot does not fill that gap. Earlier snapshots are separate observations, not cumulative counters to sum into a claimed full-feature invoice.

The root is a long continuing chat with inherited history and mixed earlier work. The timestamp boundary supports a reconciliation-phase observation, with imperfect attribution of indirect context costs. Counts represent repeated model processing, not unique words. Waiting, interruptions and verification are not active coding time. Cache availability and inherited context also limit any efficiency interpretation.

This fixed snapshot excludes later unflushed responses, completion reviews and PR publication overhead. It is not a complete lifecycle total. No controlled model or workflow comparison was run, no external benchmark was called, and no credit, currency or prompt-cache savings are established. Unknown usage is not zero.
