// src/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info', // niveles: error, warn, info, verbose, debug, silly
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(), // Mostrar logs en consola
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }), // Solo errores en archivo
    new winston.transports.File({ filename: 'logs/combined.log' }), // Todos los logs en archivo
  ],
});

export default logger;
