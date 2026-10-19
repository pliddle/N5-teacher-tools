# Teacher tools (teachers.DOMAIN)

Free classroom tools for N5 Computing Science teachers, built on the course's question bank and simulations. A
separate small website, not part of Moodle: served by the `teachers` service in `docker-compose.yml`
(`tools/teachers-server/`, plain Node with no packages) at `https://teachers.<DOMAIN>` on the live server and
`http://<server-ip>:8099` in development. No sign-in.

| Page | What it is |
|---|---|
| `/` (`index.html`) | Front page: the four tools |
| `/starter/` | Starter questions |
| `/stepper/` | Code stepper |
| `/sql/` | SQL query builder |
| `/live/` | Live quiz: the teacher's screen |
| `/play/` | Live quiz: the pupils' screen (`/join` and `/play` redirect here) |

Every tool has bigger and smaller text (`+`, `-`) and full screen (`F`), and is built for a projector first.

## Starter questions (`starter/`)
**Spec topics:** every topic in the bank (each question shows its ids).
Pick a unit, topics, Set 1 and/or 2, C and/or A, and the kinds of question. One question at a time, large, with no
timer: the teacher shows the answer (Space), then the next question (Space again; arrows go back and forward). The
reveal marks the right option, says why each wrong option is wrong (can be switched off), and shows the general
feedback with the examiners'-report note. All eight question types are shown: matching reveals the pairs,
ordering the order, fill-the-gaps fills the gaps.
- **Use it for:** a 5-minute starter; "convince your partner" before revealing; retrieval of last week's topic.
- **Limits:** about 45 SQL questions with large tables are too tall for a 1280x720 screen and scroll. Long code
  questions go side by side with their answers on wide screens.

## Code stepper (`stepper/`)
**Spec topics:** `SDD.IMPL.assign_arith`, `SDD.IMPL.concatenation`, `SDD.IMPL.selection`, `SDD.IMPL.iteration`,
`SDD.IMPL.predefined_functions`, `SDD.IMPL.standard_algorithms`, `SDD.IMPL.data_types`, `SDD.TEST.errors`.
The six code-stepper simulations in one full-screen tool, with 32 example programs (`programs.js`: theirs, plus the
loop visualiser's rewritten to run, plus FOR EACH and a nested loop). For each line: the plain-English step, **the
working** (the values put into the expression, AND/OR parts worked out, the result), the variables (arrays as
indexed boxes, the item in use highlighted), what is still to be typed at the keyboard, the display, and a **trace
table** (filled in as you go, or all at once; every line or only lines that change something). **Python
alongside** translates the program line by line (`assets/topython.js`), and **Match the lines** turns any
program into a pairing exercise: its reference-language lines against their Python, shuffled, for the class to
pair up (the exam shows code in the reference language; pupils write Python). **Predict first** pauses before any line
that displays something. The code and the typed values can be edited. Find the error programs hide the error type
until "Reveal".
- **Use it for:** tracing on the board with the class predicting each step; building a trace table together;
  showing that reference language and Python say the same thing.
- **Limits:** the interpreter (`assets/reflang.js`) is a copy of the one in the six sims: change both together.
  Programs with `random` are not given working (it would roll a different number).

## SQL query builder (`sql/`)
**Spec topics:** `DDD.DESIGN.query_design`, `DDD.IMPL.sql`, `DDD.IMPL.relational`, `DDD.TEST.sql`.
Real SQLite in the browser (sql.js 1.14.2, MIT, in `assets/sqljs/`; the same engine as the SQL lessons). Six
two-table databases in `themes.json`: Morag's chip van (the SQL lessons' data), Library (Set 1 questions' data),
Music festival (Set 2's), Highland Games, Schools shinty league, Wildlife survey. Each has 9 to 11 tasks (58 in all):
**build** (design or write it, then Check against a model answer), **fix** (a given statement is wrong: an UPDATE
or DELETE that changes too much, or one refused by referential integrity) and **predict** (the class predicts,
then Run). The **design grid** writes the SQL as it is filled in (fields in the order ticked, table ticked
automatically) and runs it; SQL can also be typed (Ctrl+Enter). INSERT, UPDATE and DELETE change the data until
**Reset data**, and the changes are coloured in the tables. With two tables and no equi-join, a warning explains
the pairings; selecting an output row highlights the records it came from and says whether they belong together.
Text that only differs in capital letters gets a hint.
- **Limits:** the grid builds SELECT only, with two criteria and two sort fields (the N5 maximum). Several
  statements run as one (all or nothing).
- **Checks:** `python3 tools/check_teacher_sql.py` runs every model answer, fix and predict statement in SQLite.

## Live quiz (`live/`, `play/`)
**Spec topics:** those of the questions chosen.
The teacher picks a unit, topics and questions (multiple choice, select all, true/false, number, one word: up to
60), a theme (8-bit Arcade, Binary Rain, Circuit Board, Space Bytes, Retro Desktop), a time per question (10 s to
90 s, or none) and whether to show a leaderboard after each question. Pupils go to `/play` on any device and type
the 6-digit code or scan the QR code; for classes on computers, **Copy link** (in the lobby and the top bar)
copies the join link with the code in it, to paste into Teams, Google Classroom or an email. Each gets a **random computing-themed name** and pixel-art avatar (they can
reroll 3 times in the lobby); nobody types a name. The teacher can remove a player from the lobby.
- **Vote, discuss, vote again** (optional, off by default): peer instruction. Everyone answers; the board shows
  how the votes split **without saying which is right**; pupils turn to a neighbour and argue their case; everyone
  votes again. Only the second vote scores, and the reveal shows the movement ("before talking it over, 4 had it
  right; after, 9"), with each option's count as "first → now". Each question takes about twice as long.
- **Scoring:** a right answer scores 500, plus up to 500 for speed, plus a streak bonus of 100 for each right
  answer in a row after the first (up to 500). Select-all must be exactly right. Numbers allow the question's
  tolerance; one-word answers ignore capitals.
- **Screens:** the teacher's screen shows the question, a countdown and how many have answered; then the right
  answer with how many chose each option and the reason; then the top 5 with movements and streaks; then a podium
  and everyone's results. Pupils see the question and big answer buttons, then right or wrong with points, streak
  and their place, then their final place and stats. Sounds (teacher's screen only) and lobby music are made in
  code and can be muted. A reload on either side rejoins the same game.
- **Results spreadsheet:** at the end, **Download the results** saves a CSV file (opens in Excel, Numbers or Google
  Sheets): one row per pupil in place order (points, right answers, best streak, and for each question right or
  wrong, the answer given and the seconds taken; with vote-discuss-vote on, how many they had right on the first
  vote), then a summary of each question (right answer, number right,
  percentage). Text that a spreadsheet would run as a formula is made safe.
- **Real names (optional, off by default):** with "Pupils also type their real name" ticked at setup, the join
  form asks each pupil for their name. It appears **only** in the teacher's spreadsheet: the board and every
  pupil's screen still use the random names, so nothing typed is ever projected.
  Keep it true to what the server does.
- **Privacy:** games live in the server's memory only and are gone when the teacher closes the game, after 45 idle
  minutes, or after 4 hours. No cookies or accounts; real names only if the teacher turns them on, and then only in the download; the answers never reach pupils' devices before a
  question closes. IP addresses are used only to slow down mass joining (in memory, for a minute).
- **Limits:** 80 players and 60 questions a game, 300 games at once. Matching, ordering and fill-the-gap questions
  are left out (use the starter tool). Games do not survive a restart of the `teachers` service.


## Open-source copy
`tools/export_teacher_repo.py` builds an MIT-licensed copy of these tools (and the server) in `.build/teachers-open`, with
18 original sample questions (`tools/teachers-open/build_sample.py`) in place of `data/questions.json`: **the question bank
is the paid course and must never be exported** (the script stops if any bank question would be). Every `tools/deploy.sh`
runs it with `--push`, so the public repository follows these tools. It also leaves out `privacy/`, `stats/`,
`robots.txt` and `sitemap.xml`, and tags links to the course with `?from=gh-tools`. If a change to the home page or
server breaks one of its text replacements, the script stops and says which.

## Files
| File | What |
|---|---|
| `data/questions.json` | The question bank for the starter and the live quiz. **Generated**: `python3 tools/build_teacher_data.py` after any question rebuild |
| `assets/teach.css`, `assets/teach.js` | Shared look, text size and full screen |
| `assets/reflang.js` | Reference-language interpreter, copied from the code-stepper sims |
| `assets/topython.js` | Reference language to Python, line by line |
| `assets/qr.js` | QR code maker (checked against the Python `qrcode` library: `tools/check_teacher_qr.py`) |
| `assets/live-common.js`, `assets/live.css` | Live quiz avatars, themes, backgrounds, sounds |
| `assets/sqljs/` | sql.js (SQLite in WebAssembly) and its licence |

## Checks
- `node tools/teachers-server/server.js` (or `docker compose up -d teachers`), then
  `.venv/bin/python tools/check_teacher_tools.py [--base URL] [--shots DIR] [home sql stepper starter live]`:
  every page in headless Chromium, every SQL task, every stepper program, every starter question, a whole live game.
- `node tools/check_teacher_python.js`: the Python view gives the same output as the interpreter for every program.
- `python3 tools/check_teacher_sql.py`, `tools/check_teacher_qr.py` (see above).
