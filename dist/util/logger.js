import LogdnaWinston from 'logdna-winston';
import winston from 'winston';
const key = process.env.LOGDNA_KEY;
const logger = winston.createLogger({
    transports: [
        new LogdnaWinston({
            key,
            app: 'kyte-ai',
            env: process.env.NODE_ENV,
            level: 'debug',
            indexMeta: true,
        }),
    ],
});
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }));
}
export function info(message, meta) {
    return logger.info(message, meta);
}
export function warn(message) {
    return logger.warn(message);
}
export function error(message, meta, callback) {
    return logger.error(message, meta, callback);
}
//# sourceMappingURL=logger.js.map