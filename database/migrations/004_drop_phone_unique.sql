-- ============================================================
--  MedTrack | database/migrations/004_drop_phone_unique.sql
--  Run this in Supabase SQL Editor (safe to re-run multiple times)
--
--  Phone is a contact detail, not an identity key — multiple
--  patients (e.g. family members) may legitimately share one
--  phone number. Identity/uniqueness is enforced by Supabase Auth
--  (email) instead, via user_profiles.linked_id.
-- ============================================================

ALTER TABLE patient DROP CONSTRAINT IF EXISTS patient_phone_key;
ALTER TABLE doctor  DROP CONSTRAINT IF EXISTS doctor_phone_key;
