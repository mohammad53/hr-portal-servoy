# HR Portal - Employee Attendance Management System

A Servoy NG (Titanium) solution for employee attendance, built on PostgreSQL.

## What it does

- **Organisation:** employees (with line manager), departments, designations
- **Time setup:** shifts (including overnight), rotating shift patterns, holidays, leave types
- **Attendance:** manual punches, automatic daily attendance (present / late / half day / absent / missing punch /
  weekly off / holiday / leave), attendance board with filters and CSV export
- **Dashboard:** today's figures, status donut, 7-day chart
- **Login and roles:** Administrator, HR, Manager (own team only), Employee (own attendance)
- **Settings:** application name, company name, colour theme and sidebar style

## Repository layout

| Folder | Contents |
|---|---|
| `EmployeeAttendance/` | The Servoy solution (forms, scopes, valuelists, relations, stylesheet) |
| `resources/` | Servoy resources project: table definitions (`datasources/attendance/*.dbi`) |
| `svyUtils/`, `svySearch/` | Servoy library modules the solution depends on |
| `db_scripts/` | Numbered SQL migrations for the `attendance` database - run in order |
| `tools/formgen/` | Unit tests for the attendance rules |

## Setting up on a new machine

1. Install **Servoy Developer 2026.06** (bundled PostgreSQL 17).
2. Clone this repository and open the folder as the Servoy workspace
   (or import the four projects into an existing workspace).
3. Create a PostgreSQL database named `attendance` and a Servoy database server with the same name.
4. Run the scripts in `db_scripts/` in numeric order (`001_...` first) against that database.
5. In Servoy: **Database Servers > attendance > Reload tables**, then refresh the solution.
6. Launch the NG client. On first start the app asks you to create the administrator account.

## Tests

The attendance rules (`EmployeeAttendance/attendance.js`) have unit tests:

```bash
node tools/formgen/test_attendance_rules.js
```

## Notes

- Database changes go in a new numbered file in `db_scripts/`; never edit an applied script.
- UUID primary keys must not have a database default (Servoy generates them: sequence type *uuid generator*).
- Themes are pre-generated CSS classes in `EmployeeAttendance/medias/EmployeeAttendance.less`, because Servoy's
  Content Security Policy blocks inline styles.
