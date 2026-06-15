-- ============================================================
<<<<<<< HEAD
--  MedTrack | database/queries.sql
--  Advanced SQL showcase — labeled by concept
--  Each query demonstrates a specific SQL feature
-- ============================================================


-- ════════════════════════════════════════
-- 1. NATURAL JOIN
--    Prescription details with medicine names
-- ════════════════════════════════════════
SELECT
  pr.prescription_id,
  p.full_name      AS patient,
  m.generic_name   AS medicine,
  pm.dosage,
  pm.duration_days,
  pr.status
FROM prescription pr
JOIN appointment a        ON a.appointment_id  = pr.appointment_id
JOIN patient p            ON p.patient_id      = a.patient_id
JOIN prescriptionmedicine pm ON pm.prescription_id = pr.prescription_id
JOIN medicine m           ON m.medicine_id     = pm.medicine_id
ORDER BY pr.created_at DESC;


-- ════════════════════════════════════════
-- 2. LEFT OUTER JOIN
--    Patients WITHOUT any appointments
-- ════════════════════════════════════════
SELECT
  p.patient_id,
  p.full_name,
  p.phone
FROM patient p
LEFT JOIN appointment a ON a.patient_id = p.patient_id
WHERE a.appointment_id IS NULL;


-- ════════════════════════════════════════
-- 3. NESTED SUBQUERY
--    Doctors who prescribed medicines with severe interactions
-- ════════════════════════════════════════
SELECT DISTINCT
  d.full_name      AS doctor,
  d.specialization
FROM doctor d
JOIN appointment a   ON a.doctor_id       = d.doctor_id
JOIN prescription pr ON pr.appointment_id = a.appointment_id
WHERE pr.prescription_id IN (
  SELECT pm1.prescription_id
  FROM prescriptionmedicine pm1
  JOIN prescriptionmedicine pm2
    ON pm1.prescription_id = pm2.prescription_id
   AND pm1.medicine_id    != pm2.medicine_id
  JOIN druginteraction di
    ON (di.medicine1_id = pm1.medicine_id AND di.medicine2_id = pm2.medicine_id)
    OR (di.medicine1_id = pm2.medicine_id AND di.medicine2_id = pm1.medicine_id)
  WHERE di.severity = 'severe'
);


-- ════════════════════════════════════════
-- 4. EXISTS
--    Patients who have undergone at least one medical test
-- ════════════════════════════════════════
SELECT
  p.full_name,
  p.phone
FROM patient p
WHERE EXISTS (
  SELECT 1
  FROM medicaltest mt
  WHERE mt.patient_id = p.patient_id
);


-- ════════════════════════════════════════
-- 5. NOT EXISTS
--    Patients who never missed a single dose
-- ════════════════════════════════════════
SELECT
  p.full_name,
  p.phone,
  calculate_adherence(p.patient_id) AS adherence_pct
FROM patient p
WHERE NOT EXISTS (
  SELECT 1
  FROM doselog dl
  WHERE dl.patient_id = p.patient_id
    AND dl.status     = 'missed'
);


-- ════════════════════════════════════════
-- 6. ALL
--    Patients whose dose count exceeds ALL other patients
-- ════════════════════════════════════════
SELECT
  p.full_name,
  COUNT(dl.log_id) AS total_doses
FROM patient p
JOIN doselog dl ON dl.patient_id = p.patient_id
GROUP BY p.patient_id, p.full_name
HAVING COUNT(dl.log_id) >= ALL (
  SELECT COUNT(log_id)
  FROM doselog
  GROUP BY patient_id
);


-- ════════════════════════════════════════
-- 7. ANY / SOME
--    Medicines prescribed in any active prescription
-- ════════════════════════════════════════
SELECT
  generic_name,
  brand_name,
  dosage_type
FROM medicine
WHERE medicine_id = ANY (
  SELECT medicine_id
  FROM prescriptionmedicine
  WHERE prescription_id IN (
    SELECT prescription_id
    FROM prescription
    WHERE status = 'active'
  )
);


-- ════════════════════════════════════════
-- 8. WITH CLAUSE (CTE)
--    Recovery vs Adherence correlation report
-- ════════════════════════════════════════
WITH adherence_cte AS (
  SELECT
    patient_id,
    ROUND(
      COUNT(CASE WHEN status = 'taken' THEN 1 END) * 100.0 /
      NULLIF(COUNT(CASE WHEN status != 'pending' THEN 1 END), 0), 1
    ) AS adherence_pct
  FROM doselog
  GROUP BY patient_id
),
recovery_cte AS (
  SELECT
    patient_id,
    ROUND(AVG(recovery_score), 1) AS avg_recovery,
    ROUND(AVG(symptom_score),  1) AS avg_symptoms
  FROM recoverylog
  GROUP BY patient_id
)
SELECT
  p.full_name,
  a.adherence_pct,
  r.avg_recovery,
  r.avg_symptoms
FROM patient p
JOIN adherence_cte a ON a.patient_id = p.patient_id
JOIN recovery_cte  r ON r.patient_id = p.patient_id
ORDER BY a.adherence_pct DESC;


-- ════════════════════════════════════════
-- 9. WINDOW FUNCTION — RANK
--    Rank medicines by missed count
-- ════════════════════════════════════════
SELECT
  m.generic_name,
  m.brand_name,
  COUNT(*)                                   AS missed_count,
  RANK()    OVER (ORDER BY COUNT(*) DESC)    AS rank,
  DENSE_RANK() OVER (ORDER BY COUNT(*) DESC) AS dense_rank
FROM doselog dl
JOIN medicationschedule ms ON ms.schedule_id = dl.schedule_id
JOIN medicine m             ON m.medicine_id  = ms.medicine_id
WHERE dl.status = 'missed'
GROUP BY m.generic_name, m.brand_name;


-- ════════════════════════════════════════
-- 10. WINDOW FUNCTION — ROLLING AVERAGE
--     7-day rolling adherence per patient
-- ════════════════════════════════════════
SELECT
  p.full_name,
  dl.scheduled_at::DATE                            AS log_date,
  ROUND(
    AVG(CASE WHEN dl.status = 'taken' THEN 100 ELSE 0 END)
    OVER (
      PARTITION BY dl.patient_id
      ORDER BY dl.scheduled_at::DATE
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 1
  )                                                AS rolling_7day_pct
FROM doselog dl
JOIN patient p ON p.patient_id = dl.patient_id
WHERE dl.status != 'pending'
ORDER BY dl.patient_id, log_date;


-- ════════════════════════════════════════
-- 11. WINDOW FUNCTION — ROW_NUMBER + LAG
--     Recovery trend: compare today vs yesterday
-- ════════════════════════════════════════
SELECT
  p.full_name,
  rl.log_date,
  rl.recovery_score,
  LAG(rl.recovery_score) OVER (
    PARTITION BY rl.patient_id
    ORDER BY rl.log_date
  )                                AS prev_day_score,
  rl.recovery_score - LAG(rl.recovery_score) OVER (
    PARTITION BY rl.patient_id
    ORDER BY rl.log_date
  )                                AS daily_change,
  ROW_NUMBER() OVER (
    PARTITION BY rl.patient_id
    ORDER BY rl.log_date
  )                                AS day_number
FROM recoverylog rl
JOIN patient p ON p.patient_id = rl.patient_id
ORDER BY rl.patient_id, rl.log_date;


-- ════════════════════════════════════════
-- 12. AGGREGATE FUNCTIONS
--     Most prescribed medicines with stats
-- ════════════════════════════════════════
SELECT
  m.generic_name,
  m.brand_name,
  COUNT(*)                             AS times_prescribed,
  COUNT(DISTINCT pm.prescription_id)   AS unique_prescriptions,
  ROUND(AVG(pm.duration_days), 1)      AS avg_duration_days,
  MAX(pm.duration_days)                AS max_duration,
  MIN(pm.duration_days)                AS min_duration
FROM prescriptionmedicine pm
JOIN medicine m ON m.medicine_id = pm.medicine_id
GROUP BY m.generic_name, m.brand_name
ORDER BY times_prescribed DESC;


-- ════════════════════════════════════════
-- 13. SET OPERATION — UNION
--     All people (patients + doctors) in system
-- ════════════════════════════════════════
SELECT full_name, phone, 'Patient' AS role FROM patient
UNION
SELECT full_name, phone, 'Doctor'  AS role FROM doctor
ORDER BY role, full_name;


-- ════════════════════════════════════════
-- 14. SET OPERATION — INTERSECT
--     Medicines that are both prescribed AND have side effects reported
-- ════════════════════════════════════════
SELECT medicine_id FROM prescriptionmedicine
INTERSECT
SELECT medicine_id FROM sideeffectreport;


-- ════════════════════════════════════════
-- 15. SET OPERATION — EXCEPT
--     Medicines never prescribed to anyone
-- ════════════════════════════════════════
SELECT medicine_id, generic_name, brand_name
FROM medicine
WHERE medicine_id NOT IN (
  SELECT DISTINCT medicine_id FROM prescriptionmedicine
);


-- ════════════════════════════════════════
-- 16. CASE EXPRESSION
--     Patient risk classification with color code
-- ════════════════════════════════════════
SELECT
  p.full_name,
  calculate_adherence(p.patient_id) AS adherence_pct,
  CASE
    WHEN calculate_adherence(p.patient_id) >= 80 THEN 'Low Risk 🟢'
    WHEN calculate_adherence(p.patient_id) >= 60 THEN 'Medium Risk 🟡'
    ELSE                                               'High Risk 🔴'
  END AS risk_level,
  CASE
    WHEN calculate_adherence(p.patient_id) >= 80 THEN 'green'
    WHEN calculate_adherence(p.patient_id) >= 60 THEN 'yellow'
    ELSE                                               'red'
  END AS color_code
FROM patient p
ORDER BY adherence_pct DESC;


-- ════════════════════════════════════════
-- 17. GROUP BY + HAVING
--     Patients with more than 3 missed doses
-- ════════════════════════════════════════
SELECT
  p.full_name,
  COUNT(dl.log_id) AS missed_doses
FROM patient p
JOIN doselog dl ON dl.patient_id = p.patient_id
WHERE dl.status = 'missed'
GROUP BY p.patient_id, p.full_name
HAVING COUNT(dl.log_id) > 3
ORDER BY missed_doses DESC;


-- ════════════════════════════════════════
-- 18. CORRELATED SUBQUERY
--     Patients whose adherence is above the overall average
-- ════════════════════════════════════════
SELECT
  p.full_name,
  calculate_adherence(p.patient_id) AS adherence_pct
FROM patient p
WHERE calculate_adherence(p.patient_id) > (
  SELECT AVG(calculate_adherence(p2.patient_id))
  FROM patient p2
)
ORDER BY adherence_pct DESC;


-- ════════════════════════════════════════
-- 19. VIEW USAGE
--     Query the views we created
-- ════════════════════════════════════════
-- Patient adherence summary
SELECT * FROM patientadherencesummary ORDER BY adherence_pct ASC;

-- High risk patients only
SELECT * FROM highriskpatients;

-- Safe prescriptions (no severe drug interactions)
SELECT * FROM safeprescriptions;

-- Low pharmacy stock
SELECT * FROM pharmacylowstock;

-- Most missed medicines
SELECT * FROM mostmissedmedicines LIMIT 5;


-- ════════════════════════════════════════
-- 20. STORED PROCEDURE USAGE
--     Call the procedures we created
-- ════════════════════════════════════════
-- Get adherence for patient 1
SELECT calculate_adherence(1) AS adherence_pct;

-- Get risk level for patient 3
SELECT get_patient_risk(3) AS risk;

-- Check interaction between medicine 1 and 4
SELECT check_drug_interaction(1, 4);

-- Generate alerts for all patients
SELECT generate_all_alerts();
=======
--  MedTrack | queries.sql
--  Sample queries demonstrating the SQL features required for
--  the lab report. Run AFTER schema.sql and seed.sql.
-- ============================================================


-- ============================================================
-- Q1. JOIN ... ON  — appointment list with patient & doctor names
-- ============================================================
SELECT p.full_name AS patient,
       d.full_name AS doctor,
       a.appointment_date,
       a.symptoms,
       a.status
FROM Patient p
JOIN Appointment a ON p.patient_id = a.patient_id
JOIN Doctor d      ON a.doctor_id  = d.doctor_id
ORDER BY a.appointment_date;


-- ============================================================
-- Q2. JOIN ... USING  — medicines and the prescriptions that use them
-- ============================================================
SELECT m.generic_name, m.brand_name, pm.dosage, pm.duration_days
FROM Medicine m
JOIN PrescriptionMedicine pm USING (medicine_id)
ORDER BY m.generic_name;


-- ============================================================
-- Q3. NATURAL JOIN  — patients and their recorded allergies
-- ============================================================
SELECT full_name, allergy_name, noted_date
FROM Patient
NATURAL JOIN PatientAllergy
NATURAL JOIN Allergy
ORDER BY full_name;


-- ============================================================
-- Q4. CROSS JOIN + NOT EXISTS  — medicine/allergy pairs that have
--     NOT yet been reviewed for a conflict (cartesian product
--     of Medicine x Allergy, minus the ones already documented)
-- ============================================================
SELECT m.generic_name, al.allergy_name
FROM Medicine m
CROSS JOIN Allergy al
WHERE NOT EXISTS (
    SELECT 1
    FROM MedicineAllergyConflict mac
    WHERE mac.medicine_id = m.medicine_id
      AND mac.allergy_id  = al.allergy_id
)
ORDER BY m.generic_name, al.allergy_name;


-- ============================================================
-- Q5. LEFT OUTER JOIN  — every patient, with adherence alerts if any
-- ============================================================
SELECT p.full_name, aa.alert_type, aa.severity, aa.resolved
FROM Patient p
LEFT JOIN AdherenceAlert aa ON p.patient_id = aa.patient_id
ORDER BY p.full_name;


-- ============================================================
-- Q6. FULL OUTER JOIN  — medicines matched against any side-effect
--     reports filed against them (medicines with none still appear)
-- ============================================================
SELECT m.generic_name, ser.effect_name, ser.severity
FROM Medicine m
FULL OUTER JOIN SideEffectReport ser ON m.medicine_id = ser.medicine_id
ORDER BY m.generic_name;


-- ============================================================
-- Q7. EXISTS  — patients who currently have an unresolved alert
-- ============================================================
SELECT full_name, phone
FROM Patient p
WHERE EXISTS (
    SELECT 1 FROM AdherenceAlert aa
    WHERE aa.patient_id = p.patient_id AND aa.resolved = FALSE
);


-- ============================================================
-- Q8. NOT EXISTS  — patients with no recorded allergy at all
-- ============================================================
SELECT full_name
FROM Patient p
WHERE NOT EXISTS (
    SELECT 1 FROM PatientAllergy pa WHERE pa.patient_id = p.patient_id
);


-- ============================================================
-- Q9. ANY  — medicines whose stock is less than at least one
--     (ANY) of Square Pharma's medicine stock levels
-- ============================================================
SELECT m.generic_name, m.manufacturer, pi.stock
FROM Medicine m
JOIN PharmacyInventory pi ON m.medicine_id = pi.medicine_id
WHERE pi.stock < ANY (
    SELECT pi2.stock
    FROM PharmacyInventory pi2
    JOIN Medicine m2 ON pi2.medicine_id = m2.medicine_id
    WHERE m2.manufacturer = 'Square Pharma'
)
ORDER BY pi.stock;


-- ============================================================
-- Q10. ALL  — medicines with stock greater than ALL of Sanofi's
--      medicine stock levels
-- ============================================================
SELECT m.generic_name, m.manufacturer, pi.stock
FROM Medicine m
JOIN PharmacyInventory pi ON m.medicine_id = pi.medicine_id
WHERE pi.stock > ALL (
    SELECT pi2.stock
    FROM PharmacyInventory pi2
    JOIN Medicine m2 ON pi2.medicine_id = m2.medicine_id
    WHERE m2.manufacturer = 'Sanofi'
)
ORDER BY pi.stock;


-- ============================================================
-- Q11. SOME  — patients who logged at least one (SOME) day with
--      a recovery score of 8 or higher
-- ============================================================
SELECT DISTINCT p.full_name
FROM Patient p
JOIN RecoveryLog rl ON p.patient_id = rl.patient_id
WHERE rl.recovery_score = SOME (
    SELECT recovery_score FROM RecoveryLog WHERE recovery_score >= 8
)
ORDER BY p.full_name;


-- ============================================================
-- Q12. UNIQUE predicate  — medicines that are always prescribed
--      with the same (single distinct) dosage value.
--      NOTE: the SQL-standard UNIQUE predicate below is NOT
--      implemented by PostgreSQL/Oracle, so it is shown for
--      reference only; the portable equivalent is used instead.
-- ============================================================
-- Standard SQL (not executable on PostgreSQL/Oracle):
-- SELECT m.generic_name
-- FROM Medicine m
-- WHERE UNIQUE (SELECT pm.dosage FROM PrescriptionMedicine pm
--               WHERE pm.medicine_id = m.medicine_id);

-- Portable equivalent:
SELECT m.generic_name
FROM Medicine m
JOIN PrescriptionMedicine pm ON m.medicine_id = pm.medicine_id
GROUP BY m.medicine_id, m.generic_name
HAVING COUNT(*) = COUNT(DISTINCT pm.dosage);


-- ============================================================
-- Q13. Subquery in FROM clause (derived table)  — per-patient
--      adherence percentage
-- ============================================================
SELECT p.full_name,
       adh.total_doses,
       adh.taken_doses,
       ROUND(100.0 * adh.taken_doses / adh.total_doses, 2) AS adherence_pct
FROM Patient p
JOIN (
    SELECT patient_id,
           COUNT(*) AS total_doses,
           COUNT(*) FILTER (WHERE status = 'taken') AS taken_doses
    FROM DoseLog
    GROUP BY patient_id
) adh ON adh.patient_id = p.patient_id
ORDER BY adherence_pct;


-- ============================================================
-- Q14. Scalar subquery in SELECT clause  — each patient with
--      their total number of prescriptions
-- ============================================================
SELECT p.full_name,
       (SELECT COUNT(*)
        FROM Appointment a
        JOIN Prescription pr ON pr.appointment_id = a.appointment_id
        WHERE a.patient_id = p.patient_id) AS prescription_count
FROM Patient p
ORDER BY prescription_count DESC, p.full_name;


-- ============================================================
-- Q15. Subquery in WHERE clause  — patients with a chronic disease
-- ============================================================
SELECT full_name
FROM Patient
WHERE patient_id IN (
    SELECT patient_id FROM PatientDiseaseHistory WHERE status = 'chronic'
)
ORDER BY full_name;


-- ============================================================
-- Q16. GROUP BY + HAVING  — patients who have missed more than
--      one dose
-- ============================================================
SELECT p.full_name, COUNT(*) AS missed_count
FROM DoseLog dl
JOIN Patient p ON p.patient_id = dl.patient_id
WHERE dl.status = 'missed'
GROUP BY p.patient_id, p.full_name
HAVING COUNT(*) > 1
ORDER BY missed_count DESC;


-- ============================================================
-- Q17. ORDER BY (multiple keys)  — medicines by manufacturer
--      then generic name
-- ============================================================
SELECT generic_name, manufacturer, dosage_type
FROM Medicine
ORDER BY manufacturer, generic_name;


-- ============================================================
-- Q18. WITH clause (CTE)  — patients whose dose adherence is
--      below 70%
-- ============================================================
WITH adherence AS (
    SELECT patient_id,
           COUNT(*) AS total_doses,
           COUNT(*) FILTER (WHERE status = 'taken') AS taken_doses
    FROM DoseLog
    GROUP BY patient_id
)
SELECT p.full_name,
       ROUND(100.0 * a.taken_doses / a.total_doses, 2) AS adherence_pct
FROM Patient p
JOIN adherence a ON a.patient_id = p.patient_id
WHERE (100.0 * a.taken_doses / a.total_doses) < 70
ORDER BY adherence_pct;


-- ============================================================
-- Q19. String manipulation  — UPPER, LOWER, concatenation,
--      SUBSTRING, LIKE
-- ============================================================
SELECT UPPER(full_name)                    AS name_upper,
       LOWER(blood_group)                  AS blood_group_lower,
       full_name || ' (' || blood_group || ')' AS display_name,
       SUBSTRING(phone FROM 1 FOR 5)       AS area_code
FROM Patient
WHERE full_name LIKE '%Khatun%'
ORDER BY full_name;


-- ============================================================
-- Q20. Set operations  — UNION / INTERSECT / EXCEPT
-- ============================================================

-- (a) Patients who either have a recorded allergy OR a chronic disease
SELECT patient_id FROM PatientAllergy
UNION
SELECT patient_id FROM PatientDiseaseHistory WHERE status = 'chronic';

-- (b) Patients who have BOTH a recorded allergy AND a chronic disease
SELECT patient_id FROM PatientAllergy
INTERSECT
SELECT patient_id FROM PatientDiseaseHistory WHERE status = 'chronic';

-- (c) Patients with a chronic disease but NO recorded allergy
SELECT patient_id FROM PatientDiseaseHistory WHERE status = 'chronic'
EXCEPT
SELECT patient_id FROM PatientAllergy;


-- ============================================================
-- Q21. Aggregate functions  — COUNT, AVG, MIN, MAX over patients
-- ============================================================
SELECT COUNT(*)                                   AS total_patients,
       ROUND(AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob))), 1) AS avg_age,
       MIN(dob)                                   AS earliest_dob,
       MAX(dob)                                   AS latest_dob
FROM Patient;


-- ============================================================
-- Q22. Other built-in functions  — date arithmetic, COALESCE, CASE
-- ============================================================
SELECT full_name,
       EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob)) AS age,
       COALESCE(blood_group, 'Unknown')          AS blood_group,
       CASE
           WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob)) >= 60 THEN 'Senior'
           WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob)) >= 18 THEN 'Adult'
           ELSE 'Minor'
       END                                       AS age_group
FROM Patient
ORDER BY age DESC;


-- ============================================================
-- Q23. UPDATE  — resolve an alert once adherence has improved,
--      and record a pharmacy dispensing transaction
-- ============================================================
UPDATE AdherenceAlert
SET resolved = TRUE
WHERE patient_id = 5 AND alert_type = 'low_adherence';

UPDATE PharmacyInventory
SET stock = stock - 10,
    last_updated = NOW()
WHERE medicine_id = 1;


-- ============================================================
-- Q24. DELETE  — clean up resolved low-severity alerts and very
--      old low-severity side-effect reports
-- ============================================================
DELETE FROM AdherenceAlert
WHERE resolved = TRUE AND severity = 'low';

DELETE FROM SideEffectReport
WHERE severity = 'low' AND reported_at < NOW() - INTERVAL '1 year';
>>>>>>> c269758336e50e42840cb0d783c74af1a0739f7b
