type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Application logger with environment-aware behavior
 */
export const logger = {
	info: (message: string, data?: unknown) => log('info', message, data),
	warn: (message: string, data?: unknown) => log('warn', message, data),
	error: (message: string, data?: unknown) => log('error', message, data),
	debug: (message: string, data?: unknown) => log('debug', message, data),
};

function log(level: LogLevel, message: string, data?: unknown) {
	// Only log in development or if explicitly enabled
	if (process.env.NODE_ENV !== 'production' || process.env['ENABLE_LOGGING'] === 'true') {
		if (level === 'debug' && process.env.NODE_ENV === 'production') {
			return; // Skip debug logs in production
		}

		// Format data for better readability
		const formattedData = data ? ` ${JSON.stringify(data, null, 2)}` : '';

		console[level](`[${level.toUpperCase()}] ${message}${formattedData}`);
	}

	// In production, you might want to send logs to a service
	if (level === 'error' && process.env.NODE_ENV === 'production') {
		// Implement error reporting service integration here
		// e.g. Sentry, LogRocket, etc.
	}
}
