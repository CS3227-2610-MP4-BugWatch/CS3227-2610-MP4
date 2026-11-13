# Retained evidence after PR cleanup

The feature plan, specialist summaries, review decisions, coverage measurements, approval manifests, failed-run explanations and screenshots remain available. This cleanup changes evidence storage only. It does not change the application, tests, SQL migration or their previous verification results.

## Usage snapshots

The three detailed numeric snapshots are stored as lossless gzip downloads. Their original JSON bytes are unchanged after decompression, including timestamps, records, counters and earlier-snapshot hash references. SHA-256 checks apply to those decompressed bytes, not to the gzip container. The summaries in [apply usage](usage-accounting.md) and [reconciliation usage](usage-accounting-reconciliation.md) remain readable without extracting the snapshots.

| Snapshot | Download | SHA-256 of decompressed original JSON |
| --- | --- | --- |
| Exploration | [Snapshot 01](usage-observation-01.json.gz) | `444316933a90eeffbf25b8be2c881b706cb8c276f8da660da06a11d2d126a9f7` |
| Apply | [Snapshot 02](usage-observation-02.json.gz) | `fc1d75031bb0f9a96d1b75f36e76868080b8802170948b01bc542657cc380928` |
| Reconciliation | [Snapshot 03](usage-observation-03.json.gz) | `1bdc696946458c94cd71979db26c5148b0efc1fc17b119f1a9adac08c210688a` |

Extract with a gzip-compatible archive tool, or use Python's `gzip.open` to read the JSON directly. For example, from the repository root run `python -c "import gzip,json; print(json.load(gzip.open('workflow/submitted-report-editing/usage-observation-03.json.gz','rt'))['schemaVersion'])"`. This reads the retained data without modifying the repository.

## Removed intermediate records

Removed 23 unreferenced intermediate files, including repeated build/lint/docs output, redundant instruction exports, an obsolete inventory and the development-server log. Final checks, referenced failures, coverage detail and manifests tied to approvals were retained. Their historical source remains publicly accessible at [the original evidence commit](https://github.com/CS3227-2610-MP4-BugWatch/CS3227-2610-MP4/tree/3c6a6c4125879c63357e753e95535e809efe7f5f/workflow/submitted-report-editing), so older immutable report citations still resolve.

The removal list is recorded in the cleanup commit. Byte-verified local backups also exist under ignored `runtime.local/evidence-cleanup-backup-2026-11-13/`; reviewers do not need that private directory to access the historical records.

## Verification limits

Storage cleanup does not prove hosted database readiness, signed-in preview acceptance or live AI behaviour. These remain separate from successful local checks and CI. Marking the PR ready requests teammate review and does not merge it or apply a database migration.
