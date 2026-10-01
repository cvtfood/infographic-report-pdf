# report-pdf spec reference

A spec is one JSON object: `title` (the PDF title and footer), `date` (shown as "Status as of ..."; write it in the reader's time zone), `subtitle` (optional), and `pages`: 1 to 8 objects of `{"blocks": [...]}`. Budgets are words per field; a breach is a build error. A page holds at most 240 words. No field may contain HTML or a URL. Statuses: `done`, `running`, `next`, `risk`, `watch`, `info`. Icons (stats and cards): `check`, `alert`, `clock`, `arrow`, `server`, `database`, `shield`, `money`, `person`, `doc`, `gear`, `chart`.

The content hash covers every field except `cols`, `height_in` and which page a block sits on.

| Block | Fields (budget) | Use |
|---|---|---|
| `hero` | `kicker` (8), `title` (12, required), `subtitle` (28) | top of page 1: the answer in one line |
| `callout` | `lead` (6), `text` (60, required), `status` (default watch) | "What's on you:" the call the reader owes, or "nothing right now" |
| `heading` | `text` (10, required), `sub` (16) | a section title that says the point |
| `stats` | `items`: 2 to 8 of `{n (3 words, 7 chars), label (12), status, icon}`; `cols` | headline numbers with context |
| `cards` | `items`: 1 to 10 of `{title (8), body (30), tag (5), status, icon}`; `cols` (default 2) | one idea per box; `tag` is the status line ("FIXED TODAY") |
| `roadmap` | `items`: 2 to 5 of `{label (3), title (4), body (22), badge (5), status}` | phases left to right with arrows |
| `beforeafter` | `before`, `after`: `{title (6), items: 1 to 6 strings (14 each)}` | what changes |
| `steps` | `title` (10), `sub` (16), `status`; `items`: 1 to 12 of `{text (12), detail (16), status}` | a phase and its steps |
| `bars` | `caption` (16), `unit` (2); `items`: 1 to 10 of `{label (6), value (number), status}` | a simple bar chart (inline SVG) |
| `list` | `title` (10); `items`: 1 to 8 strings (16 each) | short plain list |
| `table` | `title` (10), `columns` (1 to 5), `rows` (1 to 8; a cell is a string or `{text, status}` shown as a pill; 10 words a cell) | a small comparison |
| `note` | `text` (40) | small print |
| `image` | `path` (a local .png, .jpg or .svg, relative to the spec), `caption` (16), `height_in` (default 4) | a drawing-skill picture, embedded |
| `two` | `left`, `right`: lists of blocks (not another `two`) | two columns |

Example: `examples/example.json` (build it with `python3 scripts/report_pdf.py build examples/example.json`).
