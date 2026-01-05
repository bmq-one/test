import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, service }) => {
  const log = `${timestamp} [${service || 'App'}] ${level}: ${message}`;
  return stack ? `${log}\n${stack}` : log;
});

// Create logger instance
export function createLogger(service = 'App') {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      errors({ stack: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
    defaultMeta: { service },
    transports: [
      new winston.transports.Console({
        format: combine(
          colorize(),
          logFormat
        )
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error'
      }),
      new winston.transports.File({
        filename: 'logs/combined.log'
      })
    ]
  });
}

export default createLogger();
