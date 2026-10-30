# Academic periods and cohort progression

## Data model

- `semester_types` defines reusable semester labels and numbers. A `semesters`
  row remains the actual semester for one academic year and references one
  reusable type.
- A `units` row references a reusable semester type and a study year. Its
  legacy `semester_id` is retained for compatibility and is nullable for newly
  created reusable units.
- `cohort_types` defines a programme's study-year and semester stage.
- `cohorts` represent permanent intake groups. Their IDs and intake identity
  do not change as students progress.
- `cohort_progressions` records a cohort's stage, academic year, actual
  semester, and student count for each period. Timetable and exam validation
  uses these period-specific records.

There is deliberately no `unit_offerings` table.

## Migration

Back up the database, confirm the normal schema and compatibility migrations
have run, then apply the academic progression migration from `backend`:

```sh
npm run migrate:academic-progression
```

The migration backfills reusable semester types from existing actual semesters
and maps units through their existing semester links. It creates programme
cohort types from programme duration and available semester types. It does not
infer cohort progression or intake year from legacy labels, cohort academic
year fields, or student records because those sources may conflict. The
migration prints the number of cohorts that still need verified progression
records; administrators must set their verified intake year through the
reconciliation action, then add verified period records through the cohort
progression workflow. Each programme has at most one permanent cohort per
intake year; subsequent stages are added to that cohort rather than creating a
new cohort row.

## Rollback and recovery

The migration is additive but also changes column nullability, adds foreign
keys, and permits new records to reference the new tables. It intentionally
does not provide an automatic rollback: dropping the new tables or columns
could destroy data created after migration. Restore a database backup for a
full rollback, or plan a data-aware manual rollback after checking all
references and records created since migration.
