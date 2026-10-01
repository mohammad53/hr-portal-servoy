-- =====================================================================
-- Employee Attendance Management System - initial schema
-- Target: PostgreSQL 17 (Servoy bundled), database "attendance"
-- Run:    psql -h localhost -U DBA -d attendance -f 001_schema.sql
-- After running: Servoy Developer > Database Servers > attendance > Reload tables
-- =====================================================================
-- Conventions
--   * Every table has a UUID primary key named <entity>_id
--   * Audit columns: created_at / created_by / modified_at / modified_by
--     (created_by / modified_by hold the Servoy user uid or username)
--   * Status / role / type columns are VARCHAR with CHECK constraints so
--     they map cleanly to Servoy valuelists
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- ORGANISATION
-- ---------------------------------------------------------------------

CREATE TABLE departments (
    department_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code                 VARCHAR(20)  NOT NULL UNIQUE,
    name                 VARCHAR(100) NOT NULL,
    manager_employee_id  UUID,                        -- FK added after employees
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50)
);

CREATE TABLE designations (
    designation_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 VARCHAR(100) NOT NULL UNIQUE,
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50)
);

CREATE TABLE employees (
    employee_id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_code        VARCHAR(20)  NOT NULL UNIQUE,
    first_name           VARCHAR(50)  NOT NULL,
    last_name            VARCHAR(50),
    department_id        UUID         REFERENCES departments (department_id),
    designation_id       UUID         REFERENCES designations (designation_id),
    email                VARCHAR(150),
    phone                VARCHAR(30),
    gender               VARCHAR(10)  CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    date_of_birth        DATE,
    join_date            DATE         NOT NULL,
    leave_date           DATE,
    status               VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                                      CHECK (status IN ('ACTIVE', 'INACTIVE', 'TERMINATED')),
    biometric_user_id    VARCHAR(50)  UNIQUE,         -- employee's enrolment id on the device
    photo                BYTEA,
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50),
    CHECK (leave_date IS NULL OR leave_date >= join_date)
);

ALTER TABLE departments
    ADD CONSTRAINT fk_departments_manager
    FOREIGN KEY (manager_employee_id) REFERENCES employees (employee_id);

-- ---------------------------------------------------------------------
-- SECURITY
-- ---------------------------------------------------------------------

CREATE TABLE app_users (
    user_id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username             VARCHAR(50)  NOT NULL UNIQUE,
    password_hash        VARCHAR(255) NOT NULL,        -- utils.stringPBKDF2Hash()
    employee_id          UUID         UNIQUE REFERENCES employees (employee_id),  -- NULL for pure admin accounts
    role                 VARCHAR(20)  NOT NULL
                                      CHECK (role IN ('ADMIN', 'HR', 'MANAGER', 'EMPLOYEE')),
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN      NOT NULL DEFAULT TRUE,
    failed_login_count   INTEGER      NOT NULL DEFAULT 0,
    last_login           TIMESTAMP,
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50)
);

-- ---------------------------------------------------------------------
-- SHIFTS & ROSTER
-- ---------------------------------------------------------------------

CREATE TABLE shifts (
    shift_id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code                 VARCHAR(20)  NOT NULL UNIQUE,
    name                 VARCHAR(50)  NOT NULL,
    start_time           TIME         NOT NULL,
    end_time             TIME         NOT NULL,
    crosses_midnight     BOOLEAN      NOT NULL DEFAULT FALSE,  -- TRUE for night shifts (end_time is next day)
    grace_minutes        INTEGER      NOT NULL DEFAULT 0,      -- late arrival tolerance
    break_minutes        INTEGER      NOT NULL DEFAULT 0,      -- unpaid break deducted from worked time
    full_day_minutes     INTEGER      NOT NULL,                -- minimum worked minutes for PRESENT
    half_day_minutes     INTEGER      NOT NULL,                -- minimum worked minutes for HALF_DAY
    early_in_window_minutes INTEGER   NOT NULL DEFAULT 120,    -- how early before start a punch still counts as check-in
    color                VARCHAR(7),                           -- hex colour for roster views
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50),
    CHECK (crosses_midnight = (end_time <= start_time)),
    CHECK (half_day_minutes <= full_day_minutes)
);

CREATE TABLE shift_patterns (
    pattern_id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 VARCHAR(100) NOT NULL UNIQUE,
    cycle_days           INTEGER      NOT NULL CHECK (cycle_days > 0),
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50)
);

CREATE TABLE shift_pattern_days (
    pattern_day_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id           UUID         NOT NULL REFERENCES shift_patterns (pattern_id) ON DELETE CASCADE,
    day_index            INTEGER      NOT NULL CHECK (day_index >= 0),  -- 0 .. cycle_days-1
    shift_id             UUID         REFERENCES shifts (shift_id),     -- NULL = day off
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50),
    UNIQUE (pattern_id, day_index)
);

-- An employee is on EITHER a fixed shift OR a rotating pattern for a date range
CREATE TABLE employee_shift_assignments (
    assignment_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id          UUID         NOT NULL REFERENCES employees (employee_id),
    shift_id             UUID         REFERENCES shifts (shift_id),
    pattern_id           UUID         REFERENCES shift_patterns (pattern_id),
    cycle_start_date     DATE,        -- date that maps to pattern day_index 0
    weekly_off_days      VARCHAR(20), -- fixed shifts only; ISO weekdays, e.g. '7' = Sunday, '6,7' = Sat+Sun
    start_date           DATE         NOT NULL,
    end_date             DATE,        -- NULL = open-ended
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50),
    CHECK ((shift_id IS NOT NULL) <> (pattern_id IS NOT NULL)),
    CHECK (pattern_id IS NULL OR cycle_start_date IS NOT NULL),
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- One-off changes to the roster (shift swap, extra day off, etc.)
CREATE TABLE roster_overrides (
    override_id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id          UUID         NOT NULL REFERENCES employees (employee_id),
    work_date            DATE         NOT NULL,
    shift_id             UUID         REFERENCES shifts (shift_id),   -- NULL = day off
    reason               VARCHAR(255),
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50),
    UNIQUE (employee_id, work_date)
);

-- ---------------------------------------------------------------------
-- BIOMETRIC / PUNCHES
-- ---------------------------------------------------------------------

CREATE TABLE biometric_devices (
    device_id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name                 VARCHAR(100) NOT NULL,
    location             VARCHAR(100),
    device_model         VARCHAR(100),
    serial_no            VARCHAR(100) UNIQUE,
    ip_address           VARCHAR(45),
    port                 INTEGER,
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    last_sync_at         TIMESTAMP,
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50)
);

CREATE TABLE import_batches (
    batch_id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id            UUID         REFERENCES biometric_devices (device_id),
    file_name            VARCHAR(255),
    imported_at          TIMESTAMP    NOT NULL DEFAULT now(),
    imported_by          VARCHAR(50),
    row_count            INTEGER      NOT NULL DEFAULT 0,
    inserted_count       INTEGER      NOT NULL DEFAULT 0,
    duplicate_count      INTEGER      NOT NULL DEFAULT 0,
    error_count          INTEGER      NOT NULL DEFAULT 0,
    status               VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                                      CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    error_log            TEXT
);

-- Every individual punch, from a device OR entered manually by HR
CREATE TABLE raw_punches (
    punch_id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    source               VARCHAR(20)  NOT NULL CHECK (source IN ('BIOMETRIC', 'MANUAL')),
    device_id            UUID         REFERENCES biometric_devices (device_id),
    batch_id             UUID         REFERENCES import_batches (batch_id),
    biometric_user_id    VARCHAR(50), -- as reported by device
    employee_id          UUID         REFERENCES employees (employee_id),  -- resolved via employees.biometric_user_id
    punch_time           TIMESTAMP    NOT NULL,
    punch_type           VARCHAR(10)  NOT NULL DEFAULT 'UNKNOWN'
                                      CHECK (punch_type IN ('IN', 'OUT', 'UNKNOWN')),
    processed            BOOLEAN      NOT NULL DEFAULT FALSE,
    attendance_id        UUID,        -- FK added after attendance
    remarks              VARCHAR(255),
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    CHECK (source = 'MANUAL' OR biometric_user_id IS NOT NULL),
    CHECK (source = 'BIOMETRIC' OR employee_id IS NOT NULL)
);

-- Prevent the same device punch being imported twice
CREATE UNIQUE INDEX ux_raw_punches_device_punch
    ON raw_punches (device_id, biometric_user_id, punch_time)
    WHERE source = 'BIOMETRIC';

CREATE INDEX ix_raw_punches_unprocessed ON raw_punches (punch_time) WHERE processed = FALSE;
CREATE INDEX ix_raw_punches_employee_time ON raw_punches (employee_id, punch_time);

-- ---------------------------------------------------------------------
-- ATTENDANCE
-- ---------------------------------------------------------------------

-- One row per employee per work day. work_date = the date the shift STARTS
-- (a night shift 21:00-05:00 starting on the 1st has work_date = the 1st).
CREATE TABLE attendance (
    attendance_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id          UUID         NOT NULL REFERENCES employees (employee_id),
    work_date            DATE         NOT NULL,
    shift_id             UUID         REFERENCES shifts (shift_id),  -- NULL on weekly off / no roster
    check_in             TIMESTAMP,
    check_out            TIMESTAMP,
    worked_minutes       INTEGER      NOT NULL DEFAULT 0,
    late_minutes         INTEGER      NOT NULL DEFAULT 0,
    early_leave_minutes  INTEGER      NOT NULL DEFAULT 0,
    overtime_minutes     INTEGER      NOT NULL DEFAULT 0,
    status               VARCHAR(20)  NOT NULL
                                      CHECK (status IN ('PRESENT', 'LATE', 'HALF_DAY', 'ABSENT',
                                                        'ON_LEAVE', 'HOLIDAY', 'WEEKLY_OFF', 'MISSING_PUNCH')),
    source               VARCHAR(20)  NOT NULL DEFAULT 'BIOMETRIC'
                                      CHECK (source IN ('BIOMETRIC', 'MANUAL', 'MIXED', 'SYSTEM')),
    leave_request_id     UUID,        -- FK added after leave_requests
    is_locked            BOOLEAN      NOT NULL DEFAULT FALSE,  -- locked after month close / payroll
    remarks              VARCHAR(255),
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50),
    UNIQUE (employee_id, work_date),
    CHECK (check_out IS NULL OR check_in IS NULL OR check_out > check_in)
);

CREATE INDEX ix_attendance_work_date ON attendance (work_date);

ALTER TABLE raw_punches
    ADD CONSTRAINT fk_raw_punches_attendance
    FOREIGN KEY (attendance_id) REFERENCES attendance (attendance_id) ON DELETE SET NULL;

-- HR edits and employee correction requests (audit trail for manual changes)
CREATE TABLE attendance_corrections (
    correction_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id        UUID         REFERENCES attendance (attendance_id),  -- NULL if no row existed yet
    employee_id          UUID         NOT NULL REFERENCES employees (employee_id),
    work_date            DATE         NOT NULL,
    old_check_in         TIMESTAMP,
    old_check_out        TIMESTAMP,
    old_status           VARCHAR(20),
    new_check_in         TIMESTAMP,
    new_check_out        TIMESTAMP,
    new_status           VARCHAR(20),
    reason               VARCHAR(500) NOT NULL,
    requested_by         UUID         NOT NULL REFERENCES app_users (user_id),
    requested_at         TIMESTAMP    NOT NULL DEFAULT now(),
    status               VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                                      CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by          UUID         REFERENCES app_users (user_id),
    reviewed_at          TIMESTAMP,
    reviewer_comment     VARCHAR(500)
);

CREATE INDEX ix_attendance_corrections_status ON attendance_corrections (status);

-- ---------------------------------------------------------------------
-- LEAVE
-- ---------------------------------------------------------------------

CREATE TABLE leave_types (
    leave_type_id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code                 VARCHAR(20)  NOT NULL UNIQUE,
    name                 VARCHAR(50)  NOT NULL,
    days_per_year        NUMERIC(5,2) NOT NULL DEFAULT 0,
    is_paid              BOOLEAN      NOT NULL DEFAULT TRUE,
    carry_forward        BOOLEAN      NOT NULL DEFAULT FALSE,
    max_carry_forward    NUMERIC(5,2) NOT NULL DEFAULT 0,
    requires_approval    BOOLEAN      NOT NULL DEFAULT TRUE,
    allow_half_day       BOOLEAN      NOT NULL DEFAULT TRUE,
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50)
);

CREATE TABLE leave_balances (
    balance_id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id          UUID         NOT NULL REFERENCES employees (employee_id),
    leave_type_id        UUID         NOT NULL REFERENCES leave_types (leave_type_id),
    year                 INTEGER      NOT NULL,
    entitled             NUMERIC(5,2) NOT NULL DEFAULT 0,
    carried_forward      NUMERIC(5,2) NOT NULL DEFAULT 0,
    used                 NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50),
    UNIQUE (employee_id, leave_type_id, year)
);

CREATE TABLE leave_requests (
    leave_request_id     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id          UUID         NOT NULL REFERENCES employees (employee_id),
    leave_type_id        UUID         NOT NULL REFERENCES leave_types (leave_type_id),
    from_date            DATE         NOT NULL,
    to_date              DATE         NOT NULL,
    is_half_day          BOOLEAN      NOT NULL DEFAULT FALSE,
    half_day_part        VARCHAR(10)  CHECK (half_day_part IN ('FIRST', 'SECOND')),
    days                 NUMERIC(5,2) NOT NULL,
    reason               VARCHAR(500),
    status               VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                                      CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    requested_by         UUID         REFERENCES app_users (user_id),
    requested_at         TIMESTAMP    NOT NULL DEFAULT now(),
    approver_id          UUID         REFERENCES app_users (user_id),
    approved_at          TIMESTAMP,
    approver_comment     VARCHAR(500),
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50),
    CHECK (to_date >= from_date),
    CHECK (NOT is_half_day OR (from_date = to_date AND half_day_part IS NOT NULL)),
    CHECK (days > 0)
);

CREATE INDEX ix_leave_requests_employee_dates ON leave_requests (employee_id, from_date, to_date);
CREATE INDEX ix_leave_requests_status ON leave_requests (status);

ALTER TABLE attendance
    ADD CONSTRAINT fk_attendance_leave_request
    FOREIGN KEY (leave_request_id) REFERENCES leave_requests (leave_request_id);

CREATE TABLE holidays (
    holiday_id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date         DATE         NOT NULL UNIQUE,
    name                 VARCHAR(100) NOT NULL,
    is_optional          BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP    NOT NULL DEFAULT now(),
    created_by           VARCHAR(50),
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50)
);

-- ---------------------------------------------------------------------
-- LOOKUP INDEXES ON FOREIGN KEYS
-- ---------------------------------------------------------------------

CREATE INDEX ix_employees_department ON employees (department_id);
CREATE INDEX ix_esa_employee_dates ON employee_shift_assignments (employee_id, start_date);
CREATE INDEX ix_leave_balances_employee ON leave_balances (employee_id, year);

-- =====================================================================
-- SEED DATA (starting values - adjust to company policy)
-- =====================================================================

INSERT INTO shifts (code, name, start_time, end_time, crosses_midnight,
                    grace_minutes, break_minutes, full_day_minutes, half_day_minutes, color)
VALUES ('MORNING', 'Morning Shift', '09:00', '17:00', FALSE, 15, 60, 420, 210, '#4CAF50'),
       ('NIGHT',   'Night Shift',   '21:00', '05:00', TRUE,  15, 60, 420, 210, '#3F51B5');

-- Example rotating pattern: 2 weeks morning, 2 weeks night, 5 days on / 2 off
INSERT INTO shift_patterns (name, cycle_days)
VALUES ('Rotating: 2 weeks Morning / 2 weeks Night', 28);

INSERT INTO shift_pattern_days (pattern_id, day_index, shift_id)
SELECT p.pattern_id,
       d.i,
       CASE
           WHEN d.i % 7 IN (5, 6) THEN NULL                                   -- days off
           WHEN d.i < 14          THEN (SELECT shift_id FROM shifts WHERE code = 'MORNING')
           ELSE                        (SELECT shift_id FROM shifts WHERE code = 'NIGHT')
       END
FROM shift_patterns p
CROSS JOIN generate_series(0, 27) AS d(i)
WHERE p.name = 'Rotating: 2 weeks Morning / 2 weeks Night';

INSERT INTO leave_types (code, name, days_per_year, is_paid, carry_forward, max_carry_forward)
VALUES ('ANNUAL', 'Annual Leave', 14, TRUE,  TRUE,  7),
       ('CASUAL', 'Casual Leave', 10, TRUE,  FALSE, 0),
       ('SICK',   'Sick Leave',    8, TRUE,  FALSE, 0),
       ('UNPAID', 'Unpaid Leave',  0, FALSE, FALSE, 0);

COMMIT;
