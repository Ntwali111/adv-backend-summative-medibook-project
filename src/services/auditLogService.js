
const fs = require('fs');
const path = require('path');

const logDirectory = path.join(__dirname, '../../logs');
const logFile = path.join(logDirectory, 'appointments.jsonl');

async function logEvent(event) {
  await fs.promises.mkdir(logDirectory, { recursive: true });

  const record = {
    ...event,
    logged_at: new Date().toISOString()
  };

  await fs.promises.appendFile(
    logFile,
    JSON.stringify(record) + '\n',
    'utf8'
  );
}

module.exports = { logEvent };
