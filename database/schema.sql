
CREATE DATABASE IF NOT EXISTS medibook;

USE medibook;

-- 1. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(25) NOT NULL,
    date_of_birth DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. DOCTORS TABLE
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    consultation_fee DECIMAL(10, 2) NOT NULL,
    room VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_doctor_fee
        CHECK (consultation_fee >= 0)
);

-- 3. APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_ref VARCHAR(30) NOT NULL UNIQUE,

    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,

    appointment_datetime DATETIME NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,

    status ENUM(
        'CONFIRMED',
        'CANCELLED',
        'COMPLETED'
    ) NOT NULL DEFAULT 'CONFIRMED',

    booked_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    cancelled_at DATETIME NULL,
    refund_percentage DECIMAL(5, 2) NULL,
    refund_amount DECIMAL(10, 2) NULL,

    -- Cancelled appointments have NULL here,
    -- allowing another patient to book the same slot.
    active_slot_key TINYINT
        GENERATED ALWAYS AS (
            CASE
                WHEN status = 'CANCELLED' THEN NULL
                ELSE 1
            END
        ) STORED,

    CONSTRAINT fk_appointment_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(patient_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_appointment_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(doctor_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT uq_doctor_active_slot
        UNIQUE (
            doctor_id,
            appointment_datetime,
            active_slot_key
        ),

    CONSTRAINT chk_appointment_payment
        CHECK (amount_paid >= 0),

    CONSTRAINT chk_appointment_working_hours
        CHECK (
            TIME(appointment_datetime) >= '09:00:00'
            AND TIME(appointment_datetime) < '17:00:00'
        ),

    CONSTRAINT chk_appointment_slot_alignment
        CHECK (
            MINUTE(appointment_datetime) IN (0, 30)
            AND SECOND(appointment_datetime) = 0
        ),

    CONSTRAINT chk_appointment_refund
        CHECK (
            (
                status = 'CANCELLED'
                AND cancelled_at IS NOT NULL
                AND refund_percentage IS NOT NULL
                AND refund_amount IS NOT NULL
            )
            OR
            (
                status <> 'CANCELLED'
                AND cancelled_at IS NULL
                AND refund_percentage IS NULL
                AND refund_amount IS NULL
            )
        ),

    INDEX idx_appointment_patient (patient_id),
    INDEX idx_appointment_doctor_date (
        doctor_id,
        appointment_datetime
    )
);
