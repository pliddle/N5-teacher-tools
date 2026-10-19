# N5 Computing Science teacher tools

Free classroom tools for National 5 Computing Science teachers in Scotland, built for a projector first. They run
in any modern browser, with no accounts and no cookies.

| Tool | What it does |
|---|---|
| **Starter questions** (`/starter/`) | One exam-style question at a time, large, with no timer. You reveal the answer and why each wrong option is wrong. |
| **Code stepper** (`/stepper/`) | Steps through SQA reference-language programs line by line: the working, the variables, arrays, a trace table, and the Python alongside. Predict-first and a "match the lines" exercise. |
| **SQL query builder** (`/sql/`) | Six two-table databases with real SQL (SQLite in your browser). Build queries from a design grid or type them; build, fix and predict tasks. |
| **Live quiz** (`/live/`, `/play/`) | A Kahoot-style game: pupils join on their own devices with a code and play under random names. Needs the small server below. |

The live site is at **https://national5computing.co.uk** (tools at https://teachers.national5computing.co.uk).
Use those if you just want to teach with them: there is nothing to install.

## Run your own copy

You need [Node.js](https://nodejs.org/) 20 or later. There is nothing to install: the server has no packages.

```
node server/server.js
```

Then open http://localhost:8099. `PORT` and `SITE` (the folder to serve, default `site/`) can be set as environment
variables. Everything except the live quiz is static files, so `site/` also works on any web host; the live quiz needs
the server because it keeps each game in memory. Games are never saved.

If you host it for others, write your own privacy notice: the server counts page views per day (no cookies, no
IP addresses) and the live quiz holds game data only in memory, but what you tell your users is up to you. See
[docs/TOOLS.md](docs/TOOLS.md) for how each tool works.

## The questions

**This repository holds 18 sample questions only** (`site/data/questions.json`). The full bank of several hundred
exam-style questions, with feedback on every wrong answer, is part of the revision course on
[national5computing.co.uk](https://national5computing.co.uk/?from=gh-readme) and is not open source.
The question format is simple JSON: look at the sample file to add your own for the starter and live quiz.

## Licence and credit

The code and the sample questions are under the [MIT licence](LICENSE): use them, change them, host them, including
in your school, as long as the licence and copyright notice stay with the code. A visible credit on pages you
host is welcome but not required.

This project is independent. It is not connected to the SQA or Qualifications Scotland. Pseudocode follows the
published reference language, and the questions are our own.

**This copy is generated.** It is built from the course's own repository by a script, so changes here would be
overwritten. Please open an issue with suggestions and bug reports instead.
