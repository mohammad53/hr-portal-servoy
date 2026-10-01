-- =====================================================================
-- 002: remove database defaults from UUID primary keys
-- Servoy treats a PK with a DB default as DB-generated (omits it from the
-- INSERT and expects an identity value), which conflicts with the
-- 'uuid generator' sequence type. Servoy now always supplies the UUID.
-- Scripts that insert rows directly must pass gen_random_uuid() explicitly.
-- =====================================================================

BEGIN;

ALTER TABLE app_users ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE attendance ALTER COLUMN attendance_id DROP DEFAULT;
ALTER TABLE attendance_corrections ALTER COLUMN correction_id DROP DEFAULT;
ALTER TABLE biometric_devices ALTER COLUMN device_id DROP DEFAULT;
ALTER TABLE departments ALTER COLUMN department_id DROP DEFAULT;
ALTER TABLE designations ALTER COLUMN designation_id DROP DEFAULT;
ALTER TABLE employee_shift_assignments ALTER COLUMN assignment_id DROP DEFAULT;
ALTER TABLE employees ALTER COLUMN employee_id DROP DEFAULT;
ALTER TABLE holidays ALTER COLUMN holiday_id DROP DEFAULT;
ALTER TABLE import_batches ALTER COLUMN batch_id DROP DEFAULT;
ALTER TABLE leave_balances ALTER COLUMN balance_id DROP DEFAULT;
ALTER TABLE leave_requests ALTER COLUMN leave_request_id DROP DEFAULT;
ALTER TABLE leave_types ALTER COLUMN leave_type_id DROP DEFAULT;
ALTER TABLE raw_punches ALTER COLUMN punch_id DROP DEFAULT;
ALTER TABLE roster_overrides ALTER COLUMN override_id DROP DEFAULT;
ALTER TABLE shift_pattern_days ALTER COLUMN pattern_day_id DROP DEFAULT;
ALTER TABLE shift_patterns ALTER COLUMN pattern_id DROP DEFAULT;
ALTER TABLE shifts ALTER COLUMN shift_id DROP DEFAULT;

COMMIT;
