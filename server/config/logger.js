'use strict';

const winston = require('winston');
const { NODE_ENV } = require('./constants');

module.exports = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(winston.format.timestamp(), winston.format.simple()),
  transports: [new winston.transports.Console()],
});
