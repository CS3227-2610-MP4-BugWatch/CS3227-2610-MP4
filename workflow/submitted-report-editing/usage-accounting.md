# Submitted-report editing usage observation

The numeric snapshots are now lossless gzip downloads. Their JSON records and hash chain are unchanged after decompression. See [retention and extraction details](evidence-retention.md). Historical filename references inside the snapshots identify the original JSON bytes.

The apply window contains **62,693,806 observed tokens** across **440 response records in 13 sessions**. Input is 62,530,041 tokens, including 60,501,120 cached tokens; uncached input is 2,028,921. Output is 163,765 tokens, including 38,368 reasoning tokens. Cache-write input is recorded as zero. These observations do not establish credit or currency savings. Actual charges and separate tool, system and image-model usage are unknown.

## Window and scope

The inclusive window starts at the exact apply request, **2026-11-11T17:07:22.365Z**, and ends at the fixed cutoff **2026-11-12T11:49:21.848Z**. It includes root coordination and all direct feature implementation, interrupted and resumed attempts, fixes, tests, race checks, local runtime, documentation and UI review work that produced owned numeric records. Later records, including unfinished collection/review work, are outside this snapshot. This is observational bookkeeping, not a new controlled workflow experiment.

The root's separate PR9 review interval starts at **2026-11-12T09:28:51.479Z** and ends immediately before explicit feature resumption at **2026-11-12T11:43:17.466Z**. Excluded root and /root/pr9_sql_review records total **3,275,405 tokens in 26 records**; their numeric evidence remains separately marked in the JSON for audit. The root is a long mixed chat: remaining feature attribution is approximate, inherited prior work remains in its context, and this exclusion cannot isolate every indirect cost.

Collection itself contributes **315,066 tokens in 8 records** from /root/editing_usage_evidence before cutoff. This overhead is included openly. Subtracting only that separately identified session leaves 62,378,740 observed tokens; it does not remove all measurement or workflow overhead from root. Interrupted attempts remain included. Waiting and interruption are part of elapsed time; elapsed time is not active coding time.

## Per-session counts

| Session | Records | Input | Cached input (subset) | Output | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| /root | 121 | 40,246,610 | 39,666,944 | 57,315 | 40,303,925 |
| /root/editing_backend | 6 | 229,662 | 182,912 | 2,218 | 231,880 |
| /root/editing_backend_resumed | 31 | 2,043,553 | 1,844,224 | 12,641 | 2,056,194 |
| /root/editing_documentation | 22 | 984,042 | 934,144 | 7,628 | 991,670 |
| /root/editing_frontend | 4 | 131,049 | 108,672 | 382 | 131,431 |
| /root/editing_frontend_resumed | 34 | 2,062,852 | 1,902,592 | 10,313 | 2,073,165 |
| /root/editing_implementation_review | 36 | 4,049,345 | 3,682,944 | 10,655 | 4,060,000 |
| /root/editing_local_runtime | 34 | 1,697,513 | 1,639,424 | 7,693 | 1,705,206 |
| /root/editing_race_tests | 36 | 2,030,750 | 1,877,760 | 11,895 | 2,042,645 |
| /root/editing_tester | 7 | 276,836 | 235,264 | 517 | 277,353 |
| /root/editing_tester_resumed | 59 | 5,818,117 | 5,579,136 | 28,948 | 5,847,065 |
| /root/editing_ui_polish | 42 | 2,645,873 | 2,571,904 | 12,333 | 2,658,206 |
| /root/editing_usage_evidence | 8 | 313,839 | 275,200 | 1,227 | 315,066 |

## Recovery and checks

[usage-observation-02.json.gz](usage-observation-02.json.gz) contains the numeric evidence. The collector reads local session files, uses session_meta to select the root and its direct subagent children, and selects token_usage_record events only when payload.thread_id matches the owning session ID. It takes each event's response-level usage, deduplicates by owning session plus response ID, and hashes response IDs. No duplicate owned responses or mismatched-thread records were encountered in the selected files/window. Older direct sessions were also searched; only those with numeric records inside this window appear. Managed guardian sessions are excluded and their resources remain unknown.

Each included count is a nonnegative safe integer. Checks confirm cached input does not exceed input, reasoning does not exceed output, total equals input plus output, and per-session sums equal the aggregate. Input and output are added once. Cached input and reasoning are subsets, so neither is added again.

Root cumulative counters are used only as a boundary check: the final owning counter minus the last pre-anchor owning counter gives **43,192,946 total tokens**, exactly equal to included root plus excluded root response usage. Intermediate cumulative counters are never summed. The older apply-kickoff.json preserves a different generic pre-anchor snapshot; this observation records the exact owning numeric boundary at ordinal13963 rather than rewriting that historical artifact.

Each source has its filename, byte-prefix length and SHA-256 digest. To verify a live source that has since grown, hash exactly its first sourcePrefixBytes bytes, then locate numeric records by ordinal and compare their timestamps, response-ID hashes and usage. Hashes authenticate the retained local byte snapshot for reproduction; they are not independent provider billing evidence. Raw messages, account records and credentials are not exported into these artifacts. The ignored local collector is runtime.local/collect-usage.cjs; it makes no external calls. No existing numeric collector source was found in repository searches; the earlier evidence log describes its method, which this collection follows.

## Earlier snapshot and interpretation limits

[usage-observation-01.json.gz](usage-observation-01.json.gz) remains unchanged. Its exploration window ends at 2026-11-11T15:29:28.553Z, before this apply window begins. The gap is unmeasured here. These windows do not overlap; neither snapshot is a final full-lifecycle total. Do not silently fill the gap, add cumulative snapshots, or describe these counts as unique words.

No before/after control, model comparison, provider invoice or controlled prompt-cache test exists for this observation. Long inherited context, cache availability, interruptions and task changes limit attribution. Unknown resources and unflushed usage are not zero. The figures support a presentation of observed effort and overhead, with these boundaries, rather than claims of workflow efficiency or savings.
