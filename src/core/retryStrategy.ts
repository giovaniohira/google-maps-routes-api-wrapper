/**
 * Configuration for retry strategy
 */
export interface RetryConfig {
  /** Base delay in milliseconds for the first retry */
  baseMs: number;
  /** Exponential backoff factor */
  factor: number;
  /** Maximum number of retries */
  maxRetries: number;
  /** Maximum delay between retries in milliseconds */
  maxDelayMs?: number;
  /** HTTP status codes that should trigger a retry */
  retryableStatusCodes?: number[];
  /** Whether to retry on network errors */
  retryOnNetworkError?: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  baseMs: 1000, // 1 second
  factor: 2,
  maxRetries: 3,
  maxDelayMs: 30000, // 30 seconds
  retryableStatusCodes: [429, 500, 502, 503, 504],
  retryOnNetworkError: true
};

/**
 * Retry strategy implementation with exponential backoff
 */
export class RetryStrategy {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute a function with retry logic
   * @param fn - Function to execute
   * @param context - Context for error handling
   * @returns Promise with the result of the function
   */
  async execute<T>(
    fn: () => Promise<T>,
    context: { operation: string; requestId?: string } = { operation: 'unknown' }
  ): Promise<T> {
    let lastError: Error;
    let attempt = 0;

    while (attempt <= this.config.maxRetries) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Check if we should retry this error
        if (!this.shouldRetry(error as Error, attempt)) {
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt > this.config.maxRetries) {
          throw error;
        }

        // Calculate delay for next retry
        const delay = this.calculateDelay(attempt);
        
        console.warn(
          `Retry attempt ${attempt}/${this.config.maxRetries} for ${context.operation} after ${delay}ms`,
          { error: lastError.message, requestId: context.requestId }
        );

        // Wait before next retry
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: Error, attempt: number): boolean {
    // Don't retry if we've exceeded max retries
    if (attempt > this.config.maxRetries) {
      return false;
    }

    // Check for network errors
    if (this.config.retryOnNetworkError && this.isNetworkError(error)) {
      return true;
    }

    // Check for HTTP status codes
    if (this.isHttpError(error)) {
      const statusCode = this.extractStatusCode(error);
      return this.config.retryableStatusCodes?.includes(statusCode) ?? false;
    }

    return false;
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: Error): boolean {
    const networkErrorMessages = [
      'network',
      'timeout',
      'connection',
      'fetch',
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED'
    ];

    return networkErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  /**
   * Check if error is an HTTP error
   */
  private isHttpError(error: Error): boolean {
    return error.message.includes('status') || 
           error.message.includes('HTTP') ||
           (error as any).status !== undefined;
  }

  /**
   * Extract HTTP status code from error
   */
  private extractStatusCode(error: Error): number {
    // Try to extract from error message
    const statusMatch = error.message.match(/status[:\s]*(\d{3})/i);
    if (statusMatch) {
      return parseInt(statusMatch[1], 10);
    }

    // Try to extract from error object
    if ((error as any).status) {
      return (error as any).status;
    }

    return 0;
  }

  /**
   * Calculate delay for retry attempt using exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay = this.config.baseMs * Math.pow(this.config.factor, attempt - 1);
    
    // Apply jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    const finalDelay = delay + jitter;

    // Cap at max delay if specified
    if (this.config.maxDelayMs && finalDelay > this.config.maxDelayMs) {
      return this.config.maxDelayMs;
    }

    return Math.floor(finalDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Update retry configuration
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
