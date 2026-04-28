/**
 * QAYANI Error Handling System
 * Centralized error types and factories for consistent API responses
 */

export enum ErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',

  // Resource errors (404, 409)
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // External service errors (502, 503)
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  AI_MODEL_ERROR = 'AI_MODEL_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  PAYMENT_ERROR = 'PAYMENT_ERROR',

  // Internal errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom API Error class with enhanced information
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    public message: string,
    public details?: any,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'APIError';
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.userMessage || this.message,
        ...(process.env.NODE_ENV === 'development' && this.details && { details: this.details }),
      },
    };
  }

  /**
   * Check if error is client error (4xx)
   */
  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Check if error is server error (5xx)
   */
  isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

/**
 * Error factory functions for common error scenarios
 */
export const Errors = {
  // Authentication errors
  unauthorized: (message = 'Authentication required') =>
    new APIError(401, ErrorCode.UNAUTHORIZED, message, undefined, 'Please sign in to continue'),

  invalidToken: (message = 'Invalid or expired token') =>
    new APIError(401, ErrorCode.INVALID_TOKEN, message, undefined, 'Your session has expired. Please sign in again.'),

  invalidCredentials: (message = 'Invalid email or password') =>
    new APIError(401, ErrorCode.INVALID_CREDENTIALS, message, undefined, 'Invalid email or password'),

  // Authorization errors
  forbidden: (message = 'Access denied') =>
    new APIError(403, ErrorCode.FORBIDDEN, message, undefined, 'You do not have permission to access this resource'),

  insufficientPermissions: (requiredPermission: string) =>
    new APIError(
      403,
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      `Permission required: ${requiredPermission}`,
      { requiredPermission },
      'You do not have permission to perform this action'
    ),

  // Validation errors
  validation: (details: any, message = 'Validation failed') =>
    new APIError(
      400,
      ErrorCode.VALIDATION_ERROR,
      message,
      details,
      'Please check your input and try again'
    ),

  invalidInput: (field: string, reason: string) =>
    new APIError(
      400,
      ErrorCode.INVALID_INPUT,
      `Invalid ${field}: ${reason}`,
      { field, reason },
      `Invalid ${field}: ${reason}`
    ),

  missingField: (field: string) =>
    new APIError(
      400,
      ErrorCode.MISSING_REQUIRED_FIELD,
      `Missing required field: ${field}`,
      { field },
      `${field} is required`
    ),

  invalidFileType: (allowedTypes: string[]) =>
    new APIError(
      400,
      ErrorCode.INVALID_FILE_TYPE,
      'Invalid file type',
      { allowedTypes },
      `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    ),

  fileTooLarge: (maxSize: number) =>
    new APIError(
      400,
      ErrorCode.FILE_TOO_LARGE,
      'File too large',
      { maxSize },
      `File is too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
    ),

  // Resource errors
  notFound: (resource: string, id?: string) =>
    new APIError(
      404,
      ErrorCode.NOT_FOUND,
      `${resource} not found${id ? `: ${id}` : ''}`,
      { resource, id },
      `${resource} not found`
    ),

  alreadyExists: (resource: string, identifier?: string) =>
    new APIError(
      409,
      ErrorCode.ALREADY_EXISTS,
      `${resource} already exists${identifier ? `: ${identifier}` : ''}`,
      { resource, identifier },
      `${resource} already exists`
    ),

  conflict: (message: string, details?: any) =>
    new APIError(409, ErrorCode.CONFLICT, message, details, message),

  // Rate limiting
  rateLimitExceeded: (resetTime: Date, limit?: number) =>
    new APIError(
      429,
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      { resetTime: resetTime.toISOString(), limit },
      `Too many requests. Please try again after ${resetTime.toLocaleTimeString()}`
    ),

  // External service errors
  externalService: (service: string, error: any) =>
    new APIError(
      502,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      `External service error: ${service}`,
      { service, error: error?.message || error },
      'A third-party service is currently unavailable. Please try again in a few moments.'
    ),

  aiModel: (model: string, error: any) =>
    new APIError(
      502,
      ErrorCode.AI_MODEL_ERROR,
      `AI model error: ${model}`,
      { model, error: error?.message || error },
      'AI service is temporarily unavailable. Please try again.'
    ),

  storage: (operation: string, error: any) =>
    new APIError(
      503,
      ErrorCode.STORAGE_ERROR,
      `Storage error: ${operation}`,
      { operation, error: error?.message || error },
      'File storage is temporarily unavailable. Please try again.'
    ),

  payment: (error: any) =>
    new APIError(
      402,
      ErrorCode.PAYMENT_ERROR,
      'Payment processing failed',
      { error: error?.message || error },
      'Payment processing failed. Please check your payment method and try again.'
    ),

  // Internal errors
  internal: (error: any, context?: string) =>
    new APIError(
      500,
      ErrorCode.INTERNAL_ERROR,
      context ? `Internal error: ${context}` : 'Internal server error',
      { error: error?.message || error, stack: error?.stack },
      'An unexpected error occurred. Our team has been notified and is working on a fix.'
    ),

  database: (operation: string, error: any) =>
    new APIError(
      500,
      ErrorCode.DATABASE_ERROR,
      `Database error: ${operation}`,
      { operation, error: error?.message || error },
      'A database error occurred. Please try again.'
    ),
};

/**
 * Type guard to check if an error is an APIError
 */
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

/**
 * Type guard to check if an error is a Zod validation error
 */
export function isZodError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'issues' in error &&
    Array.isArray((error as any).issues)
  );
}
