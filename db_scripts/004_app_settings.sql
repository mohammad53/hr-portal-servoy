-- =====================================================================
-- 004: application settings (key/value) - app name, company, theme
-- Edited in the app under System > Settings.
-- =====================================================================

BEGIN;

CREATE TABLE app_settings (
    setting_key          VARCHAR(50)  PRIMARY KEY,
    setting_value        TEXT,
    modified_at          TIMESTAMP,
    modified_by          VARCHAR(50)
);

INSERT INTO app_settings (setting_key, setting_value) VALUES
    ('app_name',      'HR Portal'),
    ('company_name',  'My Company'),
    ('theme_color',   '#1565c0'),   -- primary (brand) colour
    ('sidebar_style', 'dark');      -- dark | light | brand

COMMIT;
