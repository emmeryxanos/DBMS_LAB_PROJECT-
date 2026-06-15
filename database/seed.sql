-- ============================================================
--  MedTrack | seed.sql
--  Realistic dummy data for demo
--  Run AFTER schema.sql
-- ============================================================


-- ► DOCTORS
INSERT INTO Doctor (full_name, specialization, license_no, phone, chamber) VALUES
('Dr. Arif Hossain',    'Cardiologist',       'LIC-001', '01711000001', 'Dhaka Medical College, Room 12'),
('Dr. Nusrat Jahan',    'General Physician',  'LIC-002', '01711000002', 'Square Hospital, Room 5'),
('Dr. Kamal Uddin',     'Neurologist',        'LIC-003', '01711000003', 'Popular Hospital, Room 8');


-- ► PATIENTS
INSERT INTO Patient (full_name, dob, gender, blood_group, phone, address) VALUES
('Rahim Mia',       '1980-03-15', 'M', 'B+',  '01800000001', 'Mirpur, Dhaka'),
('Sumaiya Begum',   '1992-07-22', 'F', 'A+',  '01800000002', 'Dhanmondi, Dhaka'),
('Karim Hossain',   '1975-11-05', 'M', 'O+',  '01800000003', 'Uttara, Dhaka'),
('Fatema Khatun',   '1988-01-30', 'F', 'AB+', '01800000004', 'Gulshan, Dhaka'),
('Jamal Uddin',     '1965-09-12', 'M', 'B-',  '01800000005', 'Motijheel, Dhaka'),
('Nasrin Akter',    '1995-04-18', 'F', 'O-',  '01800000006', 'Banani, Dhaka'),
('Rafiq Islam',     '1970-06-25', 'M', 'A-',  '01800000007', 'Mohammadpur, Dhaka'),
('Salma Khatun',    '1983-12-10', 'F', 'B+',  '01800000008', 'Wari, Dhaka'),
('Hasan Ali',       '1990-08-07', 'M', 'AB-', '01800000009', 'Khilgaon, Dhaka'),
('Roksana Begum',   '1978-02-14', 'F', 'O+',  '01800000010', 'Lalbagh, Dhaka');


-- ► MEDICINES
INSERT INTO Medicine (generic_name, brand_name, dosage_type, manufacturer) VALUES
('Paracetamol',     'Napa',        'tablet',    'Beximco Pharma'),
('Amoxicillin',     'Moxacil',     'capsule',   'Square Pharma'),
('Metformin',       'Glucomin',    'tablet',    'ACI Limited'),
('Amlodipine',      'Amcard',      'tablet',    'Incepta Pharma'),
('Omeprazole',      'Losectil',    'capsule',   'Opsonin Pharma'),
('Cetirizine',      'Alatrol',     'tablet',    'Square Pharma'),
('Atorvastatin',    'Lipovas',     'tablet',    'Beximco Pharma'),
('Azithromycin',    'Azithrin',    'capsule',   'Incepta Pharma'),
('Insulin Glargine','Lantus',      'injection', 'Sanofi'),
('Salbutamol',      'Sultolin',    'syrup',     'GlaxoSmithKline');


-- ► APPOINTMENTS
INSERT INTO Appointment (patient_id, doctor_id, appointment_date, symptoms, status) VALUES
(1,  2, '2026-05-01 10:00', 'Fever and body ache',         'completed'),
(2,  1, '2026-05-03 11:00', 'Chest pain, shortness of breath', 'completed'),
(3,  2, '2026-05-05 09:30', 'Diabetes follow-up',          'completed'),
(4,  3, '2026-05-07 14:00', 'Headache and dizziness',      'completed'),
(5,  1, '2026-05-10 10:30', 'High blood pressure',         'completed'),
(6,  2, '2026-05-12 11:30', 'Allergic reaction',           'completed'),
(7,  1, '2026-05-15 09:00', 'Cholesterol check',           'completed'),
(8,  3, '2026-05-18 15:00', 'Migraine episodes',           'completed'),
(9,  2, '2026-05-20 10:00', 'Stomach acid issues',         'completed'),
(10, 1, '2026-05-22 11:00', 'Asthma and breathing issues', 'completed');


-- ► PRESCRIPTIONS
INSERT INTO Prescription (appointment_id, start_date, end_date, notes, status) VALUES
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
INSERT INTO PrescriptionMedicine (prescription_id, medicine_id, dosage, duration_days, instructions) VALUES
(1,  1,  '500mg',  7,  'Twice daily after meals'),
(1,  2,  '250mg',  7,  'Three times daily'),
(2,  4,  '5mg',    30, 'Once daily at night'),
(2,  7,  '10mg',   30, 'Once daily in morning'),
(3,  3,  '500mg',  90, 'Twice daily with meals'),
(3,  9,  '10 units', 90,'Once daily before breakfast'),
(4,  1,  '500mg',  7,  'Three times daily'),
(4,  6,  '10mg',   7,  'Once daily at night'),
(5,  4,  '10mg',   90, 'Once daily morning'),
(6,  6,  '10mg',   7,  'Once daily'),
(7,  7,  '20mg',   90, 'Once daily morning'),
(8,  1,  '1000mg', 7,  'As needed for pain'),
(9,  5,  '20mg',   30, 'Once daily before breakfast'),
(10, 10, '2mg',    90, 'As needed, max 3 times daily');


-- ► MEDICATION SCHEDULES
INSERT INTO MedicationSchedule (prescription_id, medicine_id, dose_time, frequency) VALUES
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


-- ► DOSE LOGS (last 14 days — mix of taken/missed/late)
INSERT INTO DoseLog (schedule_id, patient_id, scheduled_at, taken_at, status) VALUES
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
INSERT INTO AdherenceAlert (patient_id, alert_type, message, severity, resolved) VALUES
(3, 'missed_streak',  'Patient Karim Hossain missed 3 consecutive doses of Metformin', 'high',     FALSE),
(3, 'low_adherence',  'Patient Karim Hossain adherence dropped below 60%',             'critical', FALSE),
(1, 'missed_streak',  'Patient Rahim Mia missed a dose of Paracetamol',                'low',      TRUE),
(5, 'low_adherence',  'Patient Jamal Uddin adherence at 71% this week',                'medium',   FALSE);