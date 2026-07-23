-- ============================================================
--  MedTrack | database/migrations/003_enable_rls.sql
--  Run this in Supabase SQL Editor (safe to re-run multiple times)
--
--  Enables RLS on every table that didn't already have it, with
--  no policies attached. Deny-by-default for the `anon` and
--  `authenticated` roles (used by the Supabase client / anon key),
--  which blocks direct table access from the browser.
--
--  Does NOT affect the backend: the FastAPI service connects with
--  the Supabase service_role key, which bypasses RLS entirely.
-- ============================================================

ALTER TABLE adherencealert          ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergy                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment             ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditlog                ENABLE ROW LEVEL SECURITY;
ALTER TABLE disease                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctorpatientaccess     ENABLE ROW LEVEL SECURITY;
ALTER TABLE doselog                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE druginteraction         ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicaltest             ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicationschedule      ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine                ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicineallergyconflict ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE patientallergy          ENABLE ROW LEVEL SECURITY;
ALTER TABLE patientdiseasehistory   ENABLE ROW LEVEL SECURITY;
ALTER TABLE patientreport           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacyinventory       ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription            ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptionmedicine    ENABLE ROW LEVEL SECURITY;
ALTER TABLE recoverylog             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sideeffectreport        ENABLE ROW LEVEL SECURITY;

-- user_profiles already has RLS + a policy — see database/auth/user_profiles.sql
