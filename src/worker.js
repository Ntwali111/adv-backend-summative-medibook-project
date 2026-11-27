
require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const pool = require('./config/db');
const redisClient = require('./config/redis');
const waitlistService = require('./services/waitlistService');

const CANCELLATION_QUEUE = 'cancellation:jobs';
const NOTIFICATION_QUEUE = 'notification:jobs';

const LOG_DIRECTORY = path.join(__dirname, '..', 'logs');
const NOTIFICATION_LOG = path.join(LOG_DIRECTORY, 'notifications.jsonl');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Process one cancellation job.
async function processCancellationJob() {
  const rawJob = await redisClient.lIndex(CANCELLATION_QUEUE, 0);

  if (!rawJob) return;

  const job = JSON.parse(rawJob);

  const waitlistKey = waitlistService.getWaitlistKey(
    job.doctor_id,
    job.appointment_datetime
  );

  const patientId = await redisClient.lIndex(waitlistKey, 0);

  // No patients are waiting for this slot.
  if (!patientId) {
    await redisClient.lPop(CANCELLATION_QUEUE);
    console.log('Cancellation processed. Nobody was waiting.');
    return;
  }

  const connection = await pool.getConnection();

  let promotedAppointment = null;
  let patientAlreadyBooked = false;
  let slotUnavailable = false;
  let invalidPatient = false;

  try {
    await connection.beginTransaction();

    // Lock the doctor to prevent two bookings at the same time.
    const [doctors] = await connection.query(
      `SELECT doctor_id, consultation_fee
       FROM doctors
       WHERE doctor_id = ?
       FOR UPDATE`,
      [job.doctor_id]
    );

    if (doctors.length === 0) {
      throw new Error('Doctor not found while processing the waiting list');
    }

    // Check whether this patient was already promoted before a previous
    // worker interruption.
    const [existingBooking] = await connection.query(
      `SELECT appointment_id
       FROM appointments
       WHERE patient_id = ?
       AND doctor_id = ?
       AND appointment_datetime = ?
       AND status = 'CONFIRMED'`,
      [patientId, job.doctor_id, job.appointment_datetime]
    );

    if (existingBooking.length > 0) {
      patientAlreadyBooked = true;
      await connection.commit();
    } else {
      // Check whether another booking has taken the slot.
      const [existingAppointments] = await connection.query(
        `SELECT appointment_id
         FROM appointments
         WHERE doctor_id = ?
         AND appointment_datetime = ?
         AND status <> 'CANCELLED'`,
        [job.doctor_id, job.appointment_datetime]
      );

      if (existingAppointments.length > 0) {
        slotUnavailable = true;
        await connection.commit();
      } else {
        const [patients] = await connection.query(
          'SELECT patient_id FROM patients WHERE patient_id = ?',
          [patientId]
        );

        if (patients.length === 0) {
          invalidPatient = true;
          await connection.commit();
        } else {
          const appointmentRef =
            `MED-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

          const [result] = await connection.query(
            `INSERT INTO appointments
             (appointment_ref, patient_id, doctor_id,
              appointment_datetime, amount_paid)
             VALUES (?, ?, ?, ?, ?)`,
            [
              appointmentRef,
              patientId,
              job.doctor_id,
              job.appointment_datetime,
              doctors[0].consultation_fee
            ]
          );

          promotedAppointment = {
            appointment_id: result.insertId,
            appointment_ref: appointmentRef,
            patient_id: Number(patientId),
            doctor_id: Number(job.doctor_id),
            appointment_datetime: job.appointment_datetime,
            amount_paid: doctors[0].consultation_fee
          };

          await connection.commit();
        }
      }
    }
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  if (patientAlreadyBooked || promotedAppointment) {
    // Remove the patient only after a successful booking or confirmation
    // that a previous attempt already booked them.
    await redisClient.lPop(waitlistKey);

    if (promotedAppointment) {
      await redisClient.rPush(
        NOTIFICATION_QUEUE,
        JSON.stringify({
          type: 'WAITLIST_PROMOTION',
          message: 'A waiting-list appointment has been confirmed',
          ...promotedAppointment,
          created_at: new Date().toISOString()
        })
      );

      console.log(`Patient ${patientId} promoted successfully.`);
    } else {
      console.log(`Patient ${patientId} was already promoted.`);
    }

    await redisClient.lPop(CANCELLATION_QUEUE);
    return;
  }

  if (invalidPatient) {
    // Skip a patient who no longer exists and try the next person.
    await redisClient.lPop(waitlistKey);
    console.log(`Skipped invalid patient ${patientId}.`);
    return;
  }

  if (slotUnavailable) {
    // Keep the waiting list, but finish this cancellation job.
    await redisClient.lPop(CANCELLATION_QUEUE);
    console.log('The appointment slot has already been booked.');
  }
}

// Write notification jobs to a JSONL audit file.
async function processNotificationJob() {
  const rawJob = await redisClient.lIndex(NOTIFICATION_QUEUE, 0);

  if (!rawJob) return;

  const notification = JSON.parse(rawJob);

  await fs.mkdir(LOG_DIRECTORY, { recursive: true });

  await fs.appendFile(
    NOTIFICATION_LOG,
    JSON.stringify(notification) + '\n',
    'utf8'
  );

  await redisClient.lPop(NOTIFICATION_QUEUE);

  console.log('Notification recorded in the audit log.');
}

// Start the worker.
async function startWorker() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    console.log('MediBook background worker is running.');

    while (true) {
      try {
        await processCancellationJob();
        await processNotificationJob();
      } catch (error) {
        console.error('Worker error:', error.message);
      }

      await delay(1000);
    }
  } catch (error) {
    console.error('Worker startup failed:', error.message);
    process.exitCode = 1;
  }
}

startWorker();
