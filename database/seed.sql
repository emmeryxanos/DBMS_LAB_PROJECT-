

<<<<<<< HEAD
DELETE FROM adherencealert;
DELETE FROM doselog;
DELETE FROM medicationschedule;
DELETE FROM prescriptionmedicine;
DELETE FROM prescription;
DELETE FROM appointment;
DELETE FROM medicaltest;
DELETE FROM patientallergy;
DELETE FROM patientdiseasehistory;
DELETE FROM medicineallergyconflict;
DELETE FROM druginteraction;
DELETE FROM pharmacyinventory;
DELETE FROM auditlog;
DELETE FROM sideeffectreport;
DELETE FROM recoverylog;
DELETE FROM medicine;
DELETE FROM allergy;
DELETE FROM disease;
DELETE FROM patient;
DELETE FROM doctor;
=======
-- ► DISEASES
INSERT INTO Disease (disease_name, severity, description) VALUES
('Hypertension',      'moderate', 'Chronic elevated blood pressure'),
('Type 2 Diabetes',   'moderate', 'Chronic high blood sugar due to insulin resistance'),
('Asthma',            'moderate', 'Chronic inflammatory airway disease causing breathing difficulty'),
('Migraine',          'mild',     'Recurrent moderate to severe headaches'),
('GERD',              'mild',     'Gastroesophageal reflux disease causing acid reflux'),
('Allergic Rhinitis', 'mild',     'Inflammation of the nasal passages due to allergens'),
('Hyperlipidemia',    'mild',     'Elevated levels of lipids in the blood'),
('Common Cold',       'mild',     'Viral upper respiratory infection');


-- ► ALLERGIES
INSERT INTO Allergy (allergy_name, description) VALUES
('Penicillin',  'Allergy to penicillin-based antibiotics'),
('Sulfa Drugs', 'Allergy to sulfonamide-based medications'),
('Aspirin',     'Allergy to aspirin and related NSAIDs'),
('Pollen',      'Seasonal allergy to airborne pollen'),
('Dust Mites',  'Allergy to household dust mites'),
('Peanuts',     'Food allergy to peanuts and peanut products');

>>>>>>> c269758336e50e42840cb0d783c74af1a0739f7b

-- ► DOCTORS
INSERT INTO doctor (full_name, specialization, license_no, phone, chamber) VALUES
('Dr. Arif Hossain',  'Cardiologist',      'LIC-001', '01711000001', 'Dhaka Medical College, Room 12'),
('Dr. Nusrat Jahan',  'General Physician', 'LIC-002', '01711000002', 'Square Hospital, Room 5'),
('Dr. Kamal Uddin',   'Neurologist',       'LIC-003', '01711000003', 'Popular Hospital, Room 8');

-- ► PATIENTS
INSERT INTO patient (full_name, dob, gender, blood_group, phone, address) VALUES
('Rahim Mia',     '1980-03-15', 'M', 'B+',  '01800000001', 'Mirpur, Dhaka'),
('Sumaiya Begum', '1992-07-22', 'F', 'A+',  '01800000002', 'Dhanmondi, Dhaka'),
('Karim Hossain', '1975-11-05', 'M', 'O+',  '01800000003', 'Uttara, Dhaka'),
('Fatema Khatun', '1988-01-30', 'F', 'AB+', '01800000004', 'Gulshan, Dhaka'),
('Jamal Uddin',   '1965-09-12', 'M', 'B-',  '01800000005', 'Motijheel, Dhaka'),
('Nasrin Akter',  '1995-04-18', 'F', 'O-',  '01800000006', 'Banani, Dhaka'),
('Rafiq Islam',   '1970-06-25', 'M', 'A-',  '01800000007', 'Mohammadpur, Dhaka'),
('Salma Khatun',  '1983-12-10', 'F', 'B+',  '01800000008', 'Wari, Dhaka'),
('Hasan Ali',     '1990-08-07', 'M', 'AB-', '01800000009', 'Khilgaon, Dhaka'),
('Roksana Begum', '1978-02-14', 'F', 'O+',  '01800000010', 'Lalbagh, Dhaka');

-- ► MEDICINES
INSERT INTO medicine (generic_name, brand_name, dosage_type, manufacturer) VALUES
('Paracetamol',      'Napa',     'tablet',    'Beximco Pharma'),
('Amoxicillin',      'Moxacil',  'capsule',   'Square Pharma'),
('Metformin',        'Glucomin', 'tablet',    'ACI Limited'),
('Amlodipine',       'Amcard',   'tablet',    'Incepta Pharma'),
('Omeprazole',       'Losectil', 'capsule',   'Opsonin Pharma'),
('Cetirizine',       'Alatrol',  'tablet',    'Square Pharma'),
('Atorvastatin',     'Lipovas',  'tablet',    'Beximco Pharma'),
('Azithromycin',     'Azithrin', 'capsule',   'Incepta Pharma'),
('Insulin Glargine', 'Lantus',   'injection', 'Sanofi'),
('Salbutamol',       'Sultolin', 'syrup',     'GlaxoSmithKline');

-- ► APPOINTMENTS
INSERT INTO appointment (patient_id, doctor_id, appointment_date, symptoms, status) VALUES
(1,  2, '2026-05-01 10:00', 'Fever and body ache',             'completed'),
(2,  1, '2026-05-03 11:00', 'Chest pain, shortness of breath', 'completed'),
(3,  2, '2026-05-05 09:30', 'Diabetes follow-up',              'completed'),
(4,  3, '2026-05-07 14:00', 'Headache and dizziness',          'completed'),
(5,  1, '2026-05-10 10:30', 'High blood pressure',             'completed'),
(6,  2, '2026-05-12 11:30', 'Allergic reaction',               'completed'),
(7,  1, '2026-05-15 09:00', 'Cholesterol check',               'completed'),
(8,  3, '2026-05-18 15:00', 'Migraine episodes',               'completed'),
(9,  2, '2026-05-20 10:00', 'Stomach acid issues',             'completed'),
(10, 1, '2026-05-22 11:00', 'Asthma and breathing issues',     'completed');

-- ► PRESCRIPTIONS
INSERT INTO prescription (appointment_id, start_date, end_date, notes, status) VALUES
(1,  '2026-05-01', '2026-05-08', 'Take after meals',           'completed'),
(2,  '2026-05-03', '2026-06-03', 'Monitor BP weekly',          'active'),
(3,  '2026-05-05', '2026-08-05', 'Control sugar diet',         'active'),
(4,  '2026-05-07', '2026-05-14', 'Rest and avoid screen time', 'completed'),
(5,  '2026-05-10', '2026-08-10', 'Low sodium diet required',   'active'),
(6,  '2026-05-12', '2026-05-19', 'Avoid allergen exposure',    'completed'),
(7,  '2026-05-15', '2026-08-15', 'Exercise daily 30 mins',     'active'),
(8,  '2026-05-18', '2026-05-25', 'Sleep 8 hours minimum',      'completed'),
(9,  '2026-05-20', '2026-06-20', 'Avoid spicy food',           'active'),
(10, '2026-05-22', '2026-08-22', 'Use inhaler as needed',      'active');

-- ► PRESCRIPTION MEDICINES
INSERT INTO prescriptionmedicine (prescription_id, medicine_id, dosage, duration_days, instructions) VALUES
(1,  1, '500mg',    7,  'Twice daily after meals'),
(1,  2, '250mg',    7,  'Three times daily'),
(2,  4, '5mg',      30, 'Once daily at night'),
(2,  7, '10mg',     30, 'Once daily in morning'),
(3,  3, '500mg',    90, 'Twice daily with meals'),
(3,  9, '10 units', 90, 'Once daily before breakfast'),
(4,  1, '500mg',    7,  'Three times daily'),
(4,  6, '10mg',     7,  'Once daily at night'),
(5,  4, '10mg',     90, 'Once daily morning'),
(6,  6, '10mg',     7,  'Once daily'),
(7,  7, '20mg',     90, 'Once daily morning'),
(8,  1, '1000mg',   7,  'As needed for pain'),
(9,  5, '20mg',     30, 'Once daily before breakfast'),
(10, 10,'2mg',      90, 'As needed, max 3 times daily');

-- ► MEDICATION SCHEDULES
INSERT INTO medicationschedule (prescription_id, medicine_id, dose_time, frequency) VALUES
(1,  1,  '08:00', 'twice_daily'),
(1,  2,  '08:00', 'thrice_daily'),
(2,  4,  '22:00', 'once_daily'),
(2,  7,  '08:00', 'once_daily'),
(3,  3,  '08:00', 'twice_daily'),
(3,  9,  '07:00', 'once_daily'),
(5,  4,  '08:00', 'once_daily'),
(7,  7,  '08:00', 'once_daily'),
(9,  5,  '07:30', 'once_daily'),
(10, 10, '08:00', 'twice_daily');

-- ► DOSE LOGS
INSERT INTO doselog (schedule_id, patient_id, scheduled_at, taken_at, status) VALUES
-- Patient 1 (good adherence)
(1, 1, '2026-06-01 08:00', '2026-06-01 08:05', 'taken'),
(1, 1, '2026-06-02 08:00', '2026-06-02 08:10', 'taken'),
(1, 1, '2026-06-03 08:00', '2026-06-03 09:30', 'late'),
(1, 1, '2026-06-04 08:00', '2026-06-04 08:02', 'taken'),
(1, 1, '2026-06-05 08:00', NULL,                'missed'),
(1, 1, '2026-06-06 08:00', '2026-06-06 08:15', 'taken'),
(1, 1, '2026-06-07 08:00', '2026-06-07 08:08', 'taken'),
-- Patient 3 (poor adherence)
(5, 3, '2026-06-01 08:00', '2026-06-01 08:20', 'taken'),
(5, 3, '2026-06-02 08:00', NULL,                'missed'),
(5, 3, '2026-06-03 08:00', NULL,                'missed'),
(5, 3, '2026-06-04 08:00', NULL,                'missed'),
(5, 3, '2026-06-05 08:00', '2026-06-05 10:00', 'late'),
(5, 3, '2026-06-06 08:00', NULL,                'missed'),
(5, 3, '2026-06-07 08:00', '2026-06-07 08:30', 'taken'),
-- Patient 5 (moderate adherence)
(7, 5, '2026-06-01 08:00', '2026-06-01 08:00', 'taken'),
(7, 5, '2026-06-02 08:00', '2026-06-02 08:05', 'taken'),
(7, 5, '2026-06-03 08:00', NULL,                'missed'),
(7, 5, '2026-06-04 08:00', '2026-06-04 08:10', 'taken'),
(7, 5, '2026-06-05 08:00', '2026-06-05 09:00', 'late'),
(7, 5, '2026-06-06 08:00', '2026-06-06 08:00', 'taken'),
(7, 5, '2026-06-07 08:00', NULL,                'missed'),
-- Patient 2 (excellent adherence)
(3, 2, '2026-06-01 22:00', '2026-06-01 22:00', 'taken'),
(3, 2, '2026-06-02 22:00', '2026-06-02 22:05', 'taken'),
(3, 2, '2026-06-03 22:00', '2026-06-03 22:00', 'taken'),
(3, 2, '2026-06-04 22:00', '2026-06-04 22:10', 'taken'),
(3, 2, '2026-06-05 22:00', '2026-06-05 22:00', 'taken'),
(3, 2, '2026-06-06 22:00', '2026-06-06 22:05', 'taken'),
(3, 2, '2026-06-07 22:00', NULL,                'missed');

-- ► ADHERENCE ALERTS
<<<<<<< HEAD
INSERT INTO adherencealert (patient_id, alert_type, message, severity, resolved) VALUES
(3, 'missed_streak', 'Patient Karim Hossain missed 3 consecutive doses of Metformin', 'high',     FALSE),
(3, 'low_adherence', 'Patient Karim Hossain adherence dropped below 60%',             'critical', FALSE),
(1, 'missed_streak', 'Patient Rahim Mia missed a dose of Paracetamol',                'low',      TRUE),
(5, 'low_adherence', 'Patient Jamal Uddin adherence at 71% this week',                'medium',   FALSE);

-- ► RECOVERY LOGS
INSERT INTO recoverylog (patient_id, log_date, symptom_score, recovery_score, notes) VALUES
(1, '2026-06-01', 7, 4, 'Still feeling weak'),
(1, '2026-06-02', 6, 5, 'Slightly better'),
(1, '2026-06-03', 5, 6, 'Improving'),
(1, '2026-06-04', 4, 7, 'Much better today'),
(1, '2026-06-05', 3, 8, 'Almost recovered'),
(3, '2026-06-01', 8, 3, 'Very sick, skipping doses'),
(3, '2026-06-02', 9, 2, 'Worse today'),
(3, '2026-06-03', 8, 3, 'No improvement'),
(3, '2026-06-04', 7, 4, 'Slightly better'),
(3, '2026-06-05', 6, 5, 'Taking medicine again'),
(2, '2026-06-01', 5, 6, 'Chest pain manageable'),
(2, '2026-06-02', 4, 7, 'Better with medication'),
(2, '2026-06-03', 3, 8, 'Good progress'),
(2, '2026-06-04', 2, 9, 'Almost normal'),
(2, '2026-06-05', 1, 10,'Fully recovered');
=======
INSERT INTO AdherenceAlert (patient_id, alert_type, message, severity, resolved) VALUES
(3, 'missed_streak',  'Patient Karim Hossain missed 3 consecutive doses of Metformin', 'high',     FALSE),
(3, 'low_adherence',  'Patient Karim Hossain adherence dropped below 60%',             'critical', FALSE),
(1, 'missed_streak',  'Patient Rahim Mia missed a dose of Paracetamol',                'low',      TRUE),
(5, 'low_adherence',  'Patient Jamal Uddin adherence at 71% this week',                'medium',   FALSE);


-- ► PATIENT ALLERGIES
INSERT INTO PatientAllergy (patient_id, allergy_id, noted_date) VALUES
(2, 1, '2020-03-10'),   -- Sumaiya Begum   - Penicillin
(4, 2, '2019-07-22'),   -- Fatema Khatun   - Sulfa Drugs
(6, 4, '2026-05-12'),   -- Nasrin Akter    - Pollen
(6, 5, '2026-05-12'),   -- Nasrin Akter    - Dust Mites
(9, 3, '2021-01-15');   -- Hasan Ali       - Aspirin


-- ► PATIENT DISEASE HISTORY
INSERT INTO PatientDiseaseHistory (patient_id, disease_id, diagnosed_date, status, notes) VALUES
(1,  8, '2026-05-01', 'recovered', 'Recovered after a week of medication'),
(2,  1, '2026-05-03', 'active',    'Newly diagnosed, started on Amlodipine and Atorvastatin'),
(3,  2, '2018-04-12', 'chronic',   'Long-term diabetic, on Metformin and Insulin'),
(4,  4, '2026-05-07', 'active',    'Recurrent migraine episodes, prescribed Cetirizine for triggers'),
(5,  1, '2015-09-01', 'chronic',   'Long-term hypertension, requires daily Amlodipine'),
(6,  6, '2026-05-12', 'active',    'Seasonal allergic rhinitis triggered by pollen and dust'),
(7,  7, '2026-05-15', 'active',    'Elevated cholesterol, prescribed Atorvastatin'),
(8,  4, '2026-05-18', 'active',    'Frequent migraine episodes affecting sleep'),
(9,  5, '2026-05-20', 'active',    'GERD symptoms managed with Omeprazole'),
(10, 3, '2010-06-01', 'chronic',   'Long-term asthma, uses Salbutamol inhaler as needed');


-- ► MEDICINE-ALLERGY CONFLICTS
INSERT INTO MedicineAllergyConflict (medicine_id, allergy_id, reaction, severity) VALUES
(2, 1, 'Skin rash, hives, possible anaphylaxis in penicillin-allergic patients', 'severe'),
(8, 1, 'Mild cross-reactivity rash possible in penicillin-allergic patients',    'mild'),
(6, 2, 'Cross-reaction skin rash reported in sulfa-sensitive patients',         'mild');


-- ► DRUG INTERACTIONS
INSERT INTO DrugInteraction (medicine1_id, medicine2_id, severity, warning_message) VALUES
(3, 4, 'mild',     'Combined use may require closer monitoring of blood pressure and blood sugar levels'),
(4, 7, 'moderate', 'Increased risk of muscle toxicity (myopathy) when amlodipine and atorvastatin are combined'),
(2, 6, 'mild',     'May cause increased drowsiness when amoxicillin and cetirizine are taken together'),
(2, 5, 'moderate', 'Omeprazole can alter stomach acidity and reduce amoxicillin absorption if not timed correctly'),
(4, 9, 'severe',   'Amlodipine can mask the warning signs of insulin-induced hypoglycemia');


-- ► MEDICAL TESTS
INSERT INTO MedicalTest (patient_id, doctor_id, test_name, result, test_date, status) VALUES
(1,  2, 'Complete Blood Count', 'WBC slightly elevated, consistent with viral infection', '2026-05-01', 'completed'),
(2,  1, 'ECG',                  'Normal sinus rhythm, no ischemic changes',               '2026-05-03', 'completed'),
(2,  1, 'Troponin Test',        'Negative',                                               '2026-05-03', 'completed'),
(3,  2, 'HbA1c',                '7.8% - above target range',                              '2026-05-05', 'completed'),
(3,  2, 'Fasting Blood Sugar',  '145 mg/dL',                                              '2026-05-05', 'completed'),
(5,  1, 'Lipid Profile',        'LDL 160 mg/dL, HDL 38 mg/dL',                            '2026-05-10', 'completed'),
(7,  1, 'Lipid Profile',        NULL,                                                     '2026-05-15', 'pending'),
(8,  3, 'MRI Brain',            'No structural abnormality detected',                     '2026-05-18', 'completed'),
(10, 1, 'Spirometry',           'Mild airway obstruction consistent with asthma',         '2026-05-22', 'completed');


-- ► RECOVERY LOGS (symptom and recovery scores, 1-10 scale)
INSERT INTO RecoveryLog (patient_id, log_date, symptom_score, recovery_score, notes) VALUES
-- Patient 1: steady recovery
(1, '2026-06-01', 7, 3, 'Fever still high'),
(1, '2026-06-02', 6, 4, 'Slight improvement'),
(1, '2026-06-03', 5, 5, 'Fever reducing'),
(1, '2026-06-04', 3, 7, 'Feeling much better'),
(1, '2026-06-05', 2, 8, 'Almost fully recovered'),
-- Patient 2: good recovery
(2, '2026-06-01', 6, 4, 'Chest pain reduced after medication'),
(2, '2026-06-02', 5, 5, 'Stable'),
(2, '2026-06-03', 4, 6, 'Improving steadily'),
(2, '2026-06-04', 3, 7, 'Minimal symptoms'),
(2, '2026-06-05', 2, 8, 'Feeling normal'),
-- Patient 3: poor recovery due to missed doses
(3, '2026-06-01', 6, 4, 'Sugar levels unstable'),
(3, '2026-06-02', 7, 3, 'Missed morning dose'),
(3, '2026-06-03', 7, 3, 'Still unstable'),
(3, '2026-06-04', 8, 2, 'Sugar levels high again'),
(3, '2026-06-05', 7, 3, 'Slight improvement after taking medicine'),
-- Patient 5: moderate recovery
(5, '2026-06-01', 5, 5, 'Blood pressure slightly high'),
(5, '2026-06-02', 5, 5, 'No change'),
(5, '2026-06-03', 6, 4, 'Missed evening dose, BP spiked'),
(5, '2026-06-04', 4, 6, 'Back on track'),
(5, '2026-06-05', 4, 6, 'Stable');


-- ► SIDE EFFECT REPORTS
INSERT INTO SideEffectReport (patient_id, medicine_id, effect_name, severity, notes) VALUES
(1, 2, 'Mild skin rash',        'medium', 'Appeared on second day of antibiotic course'),
(2, 4, 'Ankle swelling',        'medium', 'Noticed after two weeks of amlodipine use'),
(3, 3, 'Nausea',                'low',    'Occurs after morning dose, subsides within an hour'),
(6, 6, 'Drowsiness',            'low',    'Mild sedation reported after taking cetirizine'),
(8, 7, 'Muscle pain',           'medium', 'Reported aching in legs since starting atorvastatin');


-- ► PHARMACY INVENTORY
INSERT INTO PharmacyInventory (medicine_id, stock, expiry_date) VALUES
(1,  500, '2027-12-31'),
(2,  200, '2026-10-15'),
(3,  350, '2027-06-30'),
(4,  150, '2027-03-31'),
(5,   80, '2026-08-20'),
(6,  300, '2027-01-15'),
(7,  120, '2026-12-01'),
(8,   60, '2026-07-10'),
(9,   40, '2026-09-05'),
(10,  90, '2026-11-20');


-- ► AUDIT LOG (sample history of changes made through the application)
INSERT INTO AuditLog (table_name, operation, record_id, old_value, new_value) VALUES
('Patient',           'UPDATE', 3, '{"phone":"01800000099"}',  '{"phone":"01800000003"}'),
('Appointment',       'INSERT', 10, NULL,                       '{"patient_id":10,"doctor_id":1,"status":"scheduled"}'),
('Prescription',      'UPDATE', 1,  '{"status":"active"}',      '{"status":"completed"}'),
('PharmacyInventory',  'UPDATE', 8,  '{"stock":75}',             '{"stock":60}'),
('AdherenceAlert',     'UPDATE', 3,  '{"resolved":false}',       '{"resolved":false}');
>>>>>>> c269758336e50e42840cb0d783c74af1a0739f7b
