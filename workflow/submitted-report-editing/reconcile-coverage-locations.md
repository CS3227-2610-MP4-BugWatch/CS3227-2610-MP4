# Reconciled coverage: counts and uncovered locations

Full source manifest: reconcile-source-manifest.json, SHA256 c8a694c0fdaf9d3663abadf981669297f7710de1ce86af89ff6282cf83989574.

Vitest and V8 provider:5.0.5. Exact command:reconcile-coverage-run.txt. All twelve agreed production files are included; SQL and browser evidence remain separate. Unexecuted statement starts are not necessarily completely uncovered lines on compact source lines.

## src/features/auth/AuthenticatedApp.tsx

Lines: 56/65 (86.15%). Branches: 20/22 (90.9%).

Unexecuted statement starts: 47, 48, 50, 59, 60, 62, 63, 101, 104.

Unexecuted branch outcomes: 86 (branch 2, outcome 0); 99 (branch 6, outcome 0).

## src/features/mailbox/MailboxPage.tsx

Lines: 34/34 (100%). Branches: 57/65 (87.69%).

Unexecuted statement starts: 30, 36, 45.

Unexecuted branch outcomes: 30 (branch 4, outcome 0); 36 (branch 6, outcome 0); 37 (branch 8, outcome 1); 37 (branch 9, outcome 0); 45 (branch 18, outcome 0); 50 (branch 26, outcome 1); 50 (branch 26, outcome 2); 52 (branch 28, outcome 0).

## src/features/mailbox/mailboxRepository.ts

Lines: 50/50 (100%). Branches: 66/69 (95.65%).

Unexecuted statement starts: 36, 64.

Unexecuted branch outcomes: 36 (branch 11, outcome 0); 50 (branch 19, outcome 1); 64 (branch 21, outcome 0).

## src/features/mailbox/types.ts

Lines: 3/3 (100%). Branches: 0/0 (100%).

Unexecuted statement starts: None.

Unexecuted branch outcomes: None.

## src/features/projects/ProjectsApp.tsx

Lines: 5/5 (100%). Branches: 4/5 (80%).

Unexecuted statement starts: None.

Unexecuted branch outcomes: 17 (branch 0, outcome 0).

## src/features/reports/ReportDetailsPage.tsx

Lines: 261/266 (98.12%). Branches: 322/365 (88.21%).

Unexecuted statement starts: 77, 93, 109, 110, 133, 140, 178, 202, 216, 218, 227, 240, 254, 276, 277, 292, 305, 306, 484, 514.

Unexecuted branch outcomes: 20 (branch 0, outcome 2); 76 (branch 3, outcome 1); 77 (branch 4, outcome 0); 81 (branch 6, outcome 1); 92 (branch 8, outcome 1); 93 (branch 9, outcome 0); 98 (branch 11, outcome 1); 108 (branch 13, outcome 1); 109 (branch 14, outcome 0); 110 (branch 16, outcome 0); 115 (branch 18, outcome 1); 117 (branch 21, outcome 1); 120 (branch 22, outcome 1); 132 (branch 24, outcome 1); 133 (branch 25, outcome 0); 140 (branch 28, outcome 0); 140 (branch 28, outcome 1); 158 (branch 34, outcome 1); 166 (branch 38, outcome 1); 178 (branch 39, outcome 0); 201 (branch 45, outcome 0); 216 (branch 48, outcome 0); 218 (branch 51, outcome 0); 227 (branch 53, outcome 0); 240 (branch 58, outcome 0); 254 (branch 60, outcome 0); 275 (branch 71, outcome 0); 292 (branch 74, outcome 0); 305 (branch 79, outcome 0); 306 (branch 80, outcome 0); 330 (branch 101, outcome 1); 509 (branch 149, outcome 1); 514 (branch 151, outcome 0); 517 (branch 153, outcome 1); 517 (branch 154, outcome 0); 517 (branch 154, outcome 1); 519 (branch 157, outcome 1); 532 (branch 161, outcome 1); 533 (branch 162, outcome 0); 533 (branch 163, outcome 1); 534 (branch 164, outcome 0); 534 (branch 165, outcome 1); 535 (branch 166, outcome 1).

## src/features/reports/ReportEditPage.tsx

Lines: 51/51 (100%). Branches: 48/52 (92.3%).

Unexecuted statement starts: 33, 41, 65.

Unexecuted branch outcomes: 33 (branch 2, outcome 0); 37 (branch 4, outcome 1); 41 (branch 5, outcome 0); 65 (branch 21, outcome 0).

## src/features/reports/ReportForm.tsx

Lines: 59/59 (100%). Branches: 132/143 (92.3%).

Unexecuted statement starts: 49, 63.

Unexecuted branch outcomes: 34 (branch 5, outcome 1); 63 (branch 18, outcome 0); 84 (branch 27, outcome 1); 93 (branch 32, outcome 1); 100 (branch 38, outcome 1); 100 (branch 39, outcome 0); 100 (branch 39, outcome 1); 108 (branch 41, outcome 1); 115 (branch 47, outcome 1); 120 (branch 49, outcome 1); 120 (branch 50, outcome 1).

## src/features/reports/reportRepository.ts

Lines: 284/285 (99.64%). Branches: 337/362 (93.09%).

Unexecuted statement starts: 41, 97, 117, 141, 143, 147, 170, 180, 181, 208, 216, 222, 328, 353, 358, 365, 369, 429, 453, 464.

Unexecuted branch outcomes: 40 (branch 10, outcome 0); 97 (branch 24, outcome 0); 117 (branch 32, outcome 0); 141 (branch 47, outcome 0); 143 (branch 48, outcome 0); 147 (branch 54, outcome 0); 161 (branch 55, outcome 1); 170 (branch 56, outcome 0); 180 (branch 59, outcome 0); 181 (branch 60, outcome 0); 208 (branch 67, outcome 0); 216 (branch 73, outcome 0); 222 (branch 75, outcome 0); 225 (branch 76, outcome 0); 227 (branch 78, outcome 1); 236 (branch 83, outcome 3); 328 (branch 109, outcome 0); 353 (branch 115, outcome 0); 358 (branch 117, outcome 0); 362 (branch 120, outcome 1); 365 (branch 121, outcome 0); 369 (branch 122, outcome 0); 429 (branch 137, outcome 0); 453 (branch 145, outcome 0); 464 (branch 147, outcome 0).

## src/features/reports/types.ts

Lines: 5/5 (100%). Branches: 0/0 (100%).

Unexecuted statement starts: None.

Unexecuted branch outcomes: None.

## src/features/reports/validation.ts

Lines: 77/78 (98.71%). Branches: 109/120 (90.83%).

Unexecuted statement starts: 65, 107.

Unexecuted branch outcomes: 62 (branch 19, outcome 1); 63 (branch 20, outcome 0); 64 (branch 21, outcome 1); 64 (branch 23, outcome 0); 64 (branch 23, outcome 1); 64 (branch 23, outcome 2); 64 (branch 23, outcome 3); 65 (branch 23, outcome 4); 65 (branch 23, outcome 5); 65 (branch 23, outcome 6); 107 (branch 38, outcome 0).

## src/shared/components/WorkspaceShell.tsx

Lines: 11/11 (100%). Branches: 22/24 (91.66%).

Unexecuted statement starts: None.

Unexecuted branch outcomes: 23 (branch 2, outcome 1); 32 (branch 5, outcome 1).
