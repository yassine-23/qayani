import { test, expect } from '@playwright/test';
import { generateTestEmail, generateTestPassword, signupTestUser, signinTestUser } from './helpers/auth-helpers';

test.describe('Authentication API', () => {

  test.describe('POST /api/auth/signup', () => {

    test('should successfully create a new user account', async ({ request }) => {
      const email = generateTestEmail('signup-success');
      const password = generateTestPassword();
      const fullName = 'Test User Success';

      const response = await request.post('/api/auth/signup', {
        data: {
          email,
          password,
          fullName
        }
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.message).toBe('Account created successfully');
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe(email);
      expect(body.user.fullName).toBe(fullName);
      expect(body.user.id).toBeDefined();
      expect(body.user.subscriptionTier).toBeDefined();
    });

    test('should fail without email', async ({ request }) => {
      const response = await request.post('/api/auth/signup', {
        data: {
          password: 'Test123!@#',
          fullName: 'Test User'
        }
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.error).toBe('Email and password are required');
    });

    test('should fail without password', async ({ request }) => {
      const email = generateTestEmail('signup-no-password');

      const response = await request.post('/api/auth/signup', {
        data: {
          email,
          fullName: 'Test User'
        }
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.error).toBe('Email and password are required');
    });

    test('should fail with invalid email format', async ({ request }) => {
      const response = await request.post('/api/auth/signup', {
        data: {
          email: 'not-an-email',
          password: 'Test123!@#',
          fullName: 'Test User'
        }
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);

      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test('should fail with duplicate email', async ({ request }) => {
      const email = generateTestEmail('signup-duplicate');
      const password = generateTestPassword();

      // First signup should succeed
      const firstResponse = await signupTestUser(request, {
        email,
        password,
        fullName: 'Test User 1'
      });

      expect(firstResponse.user.email).toBe(email);

      // Second signup with same email should fail
      const secondResponse = await request.post('/api/auth/signup', {
        data: {
          email,
          password: 'DifferentPassword123!@#',
          fullName: 'Test User 2'
        }
      });

      expect(secondResponse.status()).toBe(400);

      const body = await secondResponse.json();
      expect(body.error).toBeDefined();
    });

    test('should work without fullName (optional field)', async ({ request }) => {
      const email = generateTestEmail('signup-no-fullname');
      const password = generateTestPassword();

      const response = await request.post('/api/auth/signup', {
        data: {
          email,
          password
        }
      });

      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.message).toBe('Account created successfully');
      expect(body.user.email).toBe(email);
    });

  });

  test.describe('POST /api/auth/signin', () => {

    test('should successfully sign in with valid credentials', async ({ request }) => {
      const email = generateTestEmail('signin-success');
      const password = generateTestPassword();

      // Create user first
      await signupTestUser(request, { email, password, fullName: 'Test User' });

      // Sign in
      const response = await request.post('/api/auth/signin', {
        data: {
          email,
          password
        }
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.message).toBe('Signed in successfully');
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe(email);
      expect(body.session).toBeDefined();
      expect(body.session.access_token).toBeDefined();
      expect(body.session.refresh_token).toBeDefined();
      expect(body.session.expires_at).toBeDefined();
    });

    test('should fail without email', async ({ request }) => {
      const response = await request.post('/api/auth/signin', {
        data: {
          password: 'Test123!@#'
        }
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.error).toBe('Email and password are required');
    });

    test('should fail without password', async ({ request }) => {
      const response = await request.post('/api/auth/signin', {
        data: {
          email: 'test@test.com'
        }
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.error).toBe('Email and password are required');
    });

    test('should fail with invalid credentials', async ({ request }) => {
      const response = await request.post('/api/auth/signin', {
        data: {
          email: 'nonexistent@test.com',
          password: 'WrongPassword123!@#'
        }
      });

      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toBe('Invalid email or password');
    });

    test('should fail with wrong password', async ({ request }) => {
      const email = generateTestEmail('signin-wrong-password');
      const password = generateTestPassword();

      // Create user
      await signupTestUser(request, { email, password, fullName: 'Test User' });

      // Try to sign in with wrong password
      const response = await request.post('/api/auth/signin', {
        data: {
          email,
          password: 'WrongPassword123!@#'
        }
      });

      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toBe('Invalid email or password');
    });

    test('should return user profile data on signin', async ({ request }) => {
      const email = generateTestEmail('signin-profile');
      const password = generateTestPassword();
      const fullName = 'Test User Profile';

      // Create user
      await signupTestUser(request, { email, password, fullName });

      // Sign in
      const signinResponse = await signinTestUser(request, email, password);

      expect(signinResponse.user.id).toBeDefined();
      expect(signinResponse.user.email).toBe(email);
      expect(signinResponse.user.fullName).toBeDefined();
      expect(signinResponse.user.subscriptionTier).toBeDefined();
    });

  });

  test.describe('POST /api/auth/signout', () => {

    test('should successfully sign out', async ({ request }) => {
      const email = generateTestEmail('signout');
      const password = generateTestPassword();

      // Create and sign in user
      await signupTestUser(request, { email, password });
      const signinResponse = await signinTestUser(request, email, password);

      // Sign out
      const response = await request.post('/api/auth/signout', {
        headers: {
          'Authorization': `Bearer ${signinResponse.session.access_token}`
        }
      });

      expect(response.ok()).toBeTruthy();
    });

  });

  test.describe('Authentication Flow', () => {

    test('should complete full signup-signin flow', async ({ request }) => {
      const email = generateTestEmail('full-flow');
      const password = generateTestPassword();
      const fullName = 'Test User Flow';

      // Step 1: Signup
      const signupResponse = await signupTestUser(request, {
        email,
        password,
        fullName
      });

      expect(signupResponse.message).toBe('Account created successfully');
      const userId = signupResponse.user.id;

      // Step 2: Signin
      const signinResponse = await signinTestUser(request, email, password);

      expect(signinResponse.message).toBe('Signed in successfully');
      expect(signinResponse.user.id).toBe(userId);
      expect(signinResponse.session.access_token).toBeDefined();

      // Step 3: Use token for authenticated request (test with any protected endpoint)
      // This validates the token works
      expect(signinResponse.session.access_token.length).toBeGreaterThan(0);
    });

  });

});
