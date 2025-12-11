export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication errors
export class AuthInvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password') {
    super('AUTH_INVALID_CREDENTIALS', 401, message);
  }
}

export class AuthTokenExpiredError extends AppError {
  constructor(message = 'Token has expired') {
    super('AUTH_TOKEN_EXPIRED', 401, message);
  }
}

export class AuthTokenInvalidError extends AppError {
  constructor(message = 'Invalid or malformed token') {
    super('AUTH_TOKEN_INVALID', 401, message);
  }
}

// Resource errors
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    const code = resource.toUpperCase().replace(/\s+/g, '_') + '_NOT_FOUND';
    super(code, 404, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to access this resource') {
    super('FORBIDDEN', 403, message);
  }
}

// Validation errors
export class ValidationError extends AppError {
  constructor(details: Record<string, unknown>) {
    super('VALIDATION_ERROR', 400, 'Invalid input data', details);
  }
}

// Business logic errors
export class AnalysisNoPhotosError extends AppError {
  constructor() {
    super('ANALYSIS_NO_PHOTOS', 400, 'Project has no photos to analyze');
  }
}

export class AnalysisAlreadyRunningError extends AppError {
  constructor() {
    super('ANALYSIS_ALREADY_RUNNING', 409, 'An analysis job is already in progress for this project');
  }
}

export class N8nTriggerFailedError extends AppError {
  constructor(message = 'Failed to trigger n8n workflow') {
    super('N8N_TRIGGER_FAILED', 502, message);
  }
}

export class UploadFailedError extends AppError {
  constructor(message = 'Failed to upload file to storage') {
    super('UPLOAD_FAILED', 500, message);
  }
}

export class ConflictError extends AppError {
  constructor(resource: string, field: string) {
    super('CONFLICT', 409, `${resource} with this ${field} already exists`);
  }
}
