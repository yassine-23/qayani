import { APIRequestContext } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  fullName?: string;
  accessToken?: string;
  userId?: string;
}

export interface SignupResponse {
  message: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    subscriptionTier: string;
  };
}

export interface SigninResponse extends SignupResponse {
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

/**
 * Sign up a new test user
 */
export async function signupTestUser(
  request: APIRequestContext,
  user: TestUser
): Promise<SignupResponse> {
  const response = await request.post('/api/auth/signup', {
    data: {
      email: user.email,
      password: user.password,
      fullName: user.fullName || 'Test User'
    }
  });

  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Signup failed: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

/**
 * Sign in an existing test user
 */
export async function signinTestUser(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<SigninResponse> {
  const response = await request.post('/api/auth/signin', {
    data: {
      email,
      password
    }
  });

  if (!response.ok()) {
    const error = await response.json();
    throw new Error(`Signin failed: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

/**
 * Create a test user and return with access token
 */
export async function createAuthenticatedUser(
  request: APIRequestContext,
  emailPrefix: string = 'test'
): Promise<TestUser> {
  const timestamp = Date.now();
  const email = `${emailPrefix}-${timestamp}@test.com`;
  const password = 'Test123!@#';
  const fullName = `Test User ${timestamp}`;

  // Signup
  const signupResponse = await signupTestUser(request, {
    email,
    password,
    fullName
  });

  // Signin to get access token
  const signinResponse = await signinTestUser(request, email, password);

  return {
    email,
    password,
    fullName,
    accessToken: signinResponse.session.access_token,
    userId: signinResponse.user.id
  };
}

/**
 * Generate random test email
 */
export function generateTestEmail(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
}

/**
 * Generate random test password
 */
export function generateTestPassword(): string {
  return `Test${Date.now()}!@#`;
}
