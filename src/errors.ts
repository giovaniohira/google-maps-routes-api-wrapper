/**
 * Custom error class for Routes API operations
 */
export class RoutesError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly meta?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    status: number = 500,
    meta?: Record<string, any>
  ) {
    super(message);
    this.name = 'RoutesError';
    this.code = code;
    this.status = status;
    this.meta = meta;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RoutesError);
    }
  }

  /**
   * Create a validation error
   */
  static validation(message: string, field?: string): RoutesError {
    return new RoutesError(
      message,
      'VALIDATION_ERROR',
      400,
      field ? { field } : undefined
    );
  }

  /**
   * Create an API error from HTTP response
   */
  static fromHttpResponse(status: number, message: string, body?: any): RoutesError {
    let code = 'HTTP_ERROR';
    let errorMessage = message;

    switch (status) {
      case 400:
        code = 'INVALID_REQUEST';
        break;
      case 401:
        code = 'UNAUTHORIZED';
        errorMessage = 'Invalid API key or authentication failed';
        break;
      case 403:
        code = 'FORBIDDEN';
        errorMessage = 'API key does not have permission to access this resource';
        break;
      case 404:
        code = 'NOT_FOUND';
        break;
      case 429:
        code = 'RATE_LIMITED';
        errorMessage = 'Rate limit exceeded. Please try again later';
        break;
      case 500:
        code = 'SERVER_ERROR';
        break;
      case 502:
      case 503:
      case 504:
        code = 'SERVICE_UNAVAILABLE';
        break;
    }

    return new RoutesError(
      errorMessage,
      code,
      status,
      body ? { responseBody: body } : undefined
    );
  }

  /**
   * Create a network error
   */
  static network(message: string, originalError?: Error): RoutesError {
    return new RoutesError(
      message,
      'NETWORK_ERROR',
      0,
      originalError ? { originalError: originalError.message } : undefined
    );
  }

  /**
   * Create a timeout error
   */
  static timeout(timeoutMs: number): RoutesError {
    return new RoutesError(
      `Request timed out after ${timeoutMs}ms`,
      'TIMEOUT_ERROR',
      408,
      { timeoutMs }
    );
  }
}
