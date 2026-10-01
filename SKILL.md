---
name: report-pdf
description: Turn a finished deliverable (a report, plan, review, research answer, comparison or status summary) into a skimmable infographic PDF, reviewed first by other models, built offline and looked at page by page. Use when a reply would hand someone a finished result or they ask for a report or "something I can read". Not for quick answers or questions.
---
# Report PDF

Script: `scripts/report_pdf.py` next to this file. Scratch files go in a temp folder.

1. **Write the spec.** `report_pdf.py new <tmp>/report.json`, then edit it. Blocks and word budgets: `reference/spec.md`.
   The title says the answer. Page 1 carries it all: hero, a callout with what the reader owes (or "nothing right
   now"), 2 to 4 headline numbers with context, the few boxes that matter. One idea per box, plain words, status
   colours that mean something. A road map or before/after for any sequence or change. `report_pdf.py check` validates.
2. **Review.** `report_pdf.py review report.json --reviewer NAME=CMD [--reviewer ...] --context "<the ask, the sources>"`.
   Read every answer, settle each material objection, edit the spec, and review again if any claim, number, status or
   block order changed: `deliver` refuses content that was not the reviewed content.
3. **Build and look.** `report_pdf.py build report.json --out <tmp>/build`, then open every `page-N.png` and check:
   nothing clipped or crowded, readable at page size, colours right, page 1 alone answers the question. Fix and rebuild
   (1 to 3 rounds), then `report_pdf.py inspected <build> --page 1 "<what you saw>" --page 2 "..."`.
4. **Deliver.** `report_pdf.py deliver report.json --build <build> --to <folder> --resolved "<how objections were settled>"
   [--after "<command using $REPORT_PDF>"]`. Then give the reader a short plain summary and the PDF's path.
