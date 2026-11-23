
USE medibook;

-- Insert 3 patients
INSERT INTO patients
(first_name, last_name, email, phone, date_of_birth)
VALUES
('Cynthia', 'Uwase', 'cynthia@example.com', '0788000001', '2003-05-12'),
('Alice', 'Mugisha', 'alice@example.com', '0788000002', '1998-08-20'),
('David', 'Niyonzima', 'david@example.com', '0788000003', '1995-02-15');

-- Insert 3 doctors
INSERT INTO doctors
(first_name, last_name, specialty, consultation_fee, room)
VALUES
('John', 'Kamana', 'General Medicine', 150.00, 'R-01'),
('Sarah', 'Uwimana', 'Paediatrics', 100.00, 'R-02'),
('Peter', 'Mutesi', 'Dermatology', 120.00, 'R-03');

-- Insert 10 appointments for Doctor 1
-- All are on 1 December 2026.
-- This doctor has 10 out of 12 daily slots booked.

INSERT INTO appointments
(appointment_ref, patient_id, doctor_id,
 appointment_datetime, amount_paid)
VALUES
('MB-001', 1, 1, '2026-12-01 09:00:00', 150.00),
('MB-002', 2, 1, '2026-12-01 09:30:00', 150.00),
('MB-003', 3, 1, '2026-12-01 10:00:00', 150.00),
('MB-004', 1, 1, '2026-12-01 10:30:00', 150.00),
('MB-005', 2, 1, '2026-12-01 11:00:00', 150.00),
('MB-006', 3, 1, '2026-12-01 11:30:00', 150.00),
('MB-007', 1, 1, '2026-12-01 12:00:00', 150.00),
('MB-008', 2, 1, '2026-12-01 12:30:00', 150.00),
('MB-009', 3, 1, '2026-12-01 13:00:00', 150.00),
('MB-010', 1, 1, '2026-12-01 13:30:00', 150.00);
