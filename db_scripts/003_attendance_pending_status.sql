-- =====================================================================
-- 003: add PENDING ("not in yet") attendance status
-- A rostered employee with no punches yet today gets PENDING; it becomes
-- ABSENT only once the day (or their overnight shift) is over.
-- =====================================================================

BEGIN;

ALTER TABLE attendance DROP CONSTRAINT attendance_status_check;

ALTER TABLE attendance ADD CONSTRAINT attendance_status_check
    CHECK (status IN ('PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'ON_LEAVE', 'HOLIDAY',
                      'WEEKLY_OFF', 'MISSING_PUNCH', 'PENDING'));

COMMIT;
