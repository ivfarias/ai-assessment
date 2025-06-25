export async function retry(fn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            if (i === maxRetries - 1)
                throw error;
            await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, i)));
        }
    }
}
//# sourceMappingURL=retry.js.map