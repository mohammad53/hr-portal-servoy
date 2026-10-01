-- =====================================================================
-- 005: line manager ("reports to") on employees
-- A MANAGER user sees the employees whose reports_to_employee_id is the
-- manager's own employee record.
-- =====================================================================

BEGIN;

ALTER TABLE employees
    ADD COLUMN reports_to_employee_id UUID REFERENCES employees (employee_id);

CREATE INDEX ix_employees_reports_to ON employees (reports_to_employee_id);

ALTER TABLE employees
    ADD CONSTRAINT ck_employees_not_own_manager CHECK (reports_to_employee_id IS NULL OR reports_to_employee_id <> employee_id);

COMMIT;
