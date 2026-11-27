
const appointmentModel = require('../models/appointmentModel');
const waitlistService = require('../services/waitlistService');
const auditLogService = require('../services/auditLogService');
// Validate an appointment date using Rwanda time (UTC+02:00).
function validateAppointmentDateTime(value) {
  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    return {
      valid: false,
      message: 'Use the date format YYYY-MM-DDTHH:mm:ss'
    };
  }

  const [, year, month, day, hour, minute, second = '00'] = match;

  const numbers = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second)
  };

  // Check that the date and time really exist.
  const calendarDate = new Date(Date.UTC(
    numbers.year,
    numbers.month - 1,
    numbers.day,
    numbers.hour,
    numbers.minute,
    numbers.second
  ));

  if (
    calendarDate.getUTCFullYear() !== numbers.year ||
    calendarDate.getUTCMonth() + 1 !== numbers.month ||
    calendarDate.getUTCDate() !== numbers.day ||
    calendarDate.getUTCHours() !== numbers.hour ||
    calendarDate.getUTCMinutes() !== numbers.minute ||
    calendarDate.getUTCSeconds() !== numbers.second
  ) {
    return {
      valid: false,
      message: 'Please provide a valid appointment date and time'
    };
  }

  // Convert Rwanda local time to an absolute timestamp.
  const appointmentDate = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}+02:00`
  );

  if (appointmentDate.getTime() <= Date.now()) {
    return {
      valid: false,
      message: 'Appointment date must be in the future'
    };
  }

  // Clinic hours: 09:00 to 17:00, in 30-minute slots.
  if (
    numbers.hour < 9 ||
    numbers.hour >= 17 ||
    ![0, 30].includes(numbers.minute) ||
    numbers.second !== 0
  ) {
    return {
      valid: false,
      message: 'Appointments must be between 09:00 and 17:00 in 30-minute slots'
    };
  }

  return {
    valid: true,
    mysqlDateTime: `${year}-${month}-${day} ${hour}:${minute}:${second}`
  };
}

// Get all appointments.
async function getAllAppointments(req, res, next) {
  try {
    const appointments = await appointmentModel.getAllAppointments();

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    next(error);
  }
}

// Get one appointment by ID.
async function getAppointmentById(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid appointment ID'
      });
    }

    const appointment = await appointmentModel.getAppointmentById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    next(error);
  }
}

// Create an appointment.
async function createAppointment(req, res, next) {
  try {
    const { patient_id, doctor_id, appointment_datetime } = req.body;

    if (!patient_id || !doctor_id || !appointment_datetime) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, doctor ID and appointment date are required'
      });
    }

    const patientId = Number(patient_id);
    const doctorId = Number(doctor_id);

    if (
      !Number.isInteger(patientId) || patientId <= 0 ||
      !Number.isInteger(doctorId) || doctorId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and doctor ID must be positive integers'
      });
    }

    const dateValidation = validateAppointmentDateTime(
      appointment_datetime
    );

    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dateValidation.message
      });
    }

    const appointment = await appointmentModel.createAppointment({
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_datetime: dateValidation.mysqlDateTime
    });
   
    auditLogService.logEvent({
  action: 'APPOINTMENT_BOOKED',
  appointment_id: appointment.appointment_id,
  patient_id: patientId,
  doctor_id: doctorId,
  appointment_datetime: dateValidation.mysqlDateTime
}).catch(error => {
  console.error('Booking audit log failed:', error.message);
});
    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
}

// Cancel an appointment.
async function cancelAppointment(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid appointment ID'
      });
    }

    const appointment = await appointmentModel.cancelAppointment(id);
    auditLogService.logEvent({
  action: 'APPOINTMENT_CANCELLED',
  appointment_id: appointment.appointment_id,
  patient_id: appointment.patient_id,
  doctor_id: appointment.doctor_id,
  refund_percentage: appointment.refund_percentage,
  refund_amount: appointment.refund_amount
}).catch(error => {
  console.error('Cancellation audit log failed:', error.message);
});

    await waitlistService.enqueueCancellation(appointment);

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment
    });
  } catch (error) {
    next(error);
  }
}

// Join the waiting list.
async function joinWaitlist(req, res, next) {
  try {
    const { patient_id, doctor_id, appointment_datetime } = req.body;

    if (!patient_id || !doctor_id || !appointment_datetime) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, doctor ID and appointment date are required'
      });
    }

    const patientId = Number(patient_id);
    const doctorId = Number(doctor_id);

    if (
      !Number.isInteger(patientId) || patientId <= 0 ||
      !Number.isInteger(doctorId) || doctorId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and doctor ID must be positive integers'
      });
    }

    const dateValidation = validateAppointmentDateTime(
      appointment_datetime
    );

    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dateValidation.message
      });
    }

    const result = await waitlistService.addToWaitlist(
      patientId,
      doctorId,
      dateValidation.mysqlDateTime
    );

    res.status(201).json({
      success: true,
      message: 'You have joined the waiting list',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  cancelAppointment,
  joinWaitlist
};
