export const logger = (request, _, next) => {
    console.log(`${new Date().toISOString()} - ${request.method} ${request.url}`);
    next();
};
//# sourceMappingURL=logger.js.map