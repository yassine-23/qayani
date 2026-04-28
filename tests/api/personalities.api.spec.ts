import { test, expect } from '@playwright/test';
import { createAuthenticatedUser, TestUser } from './helpers/auth-helpers';
import { authenticatedRequest } from './helpers/api-helpers';

test.describe('Personalities API', () => {

  test.describe('POST /api/personalities/create', () => {

    test('should create a personality with valid authentication', async ({ request }) => {
      // Create authenticated user
      const user: TestUser = await createAuthenticatedUser(request, 'personality-create');

      // Create personality
      const response = await authenticatedRequest(
        request,
        'POST',
        '/api/personalities/create',
        user.accessToken!,
        {
          name: 'John Doe',
          dateOfBirth: '1950-01-01',
          dateOfPassing: '2020-12-31',
          relationshipToCreator: 'father',
          personalityTraits: {
            humor: 'witty',
            temperament: 'calm',
            values: ['family', 'honesty']
          },
          memories: [
            {
              title: 'First memory',
              content: 'A beautiful summer day',
              date: '1960-06-15'
            }
          ],
          preferences: {
            favoriteColor: 'blue',
            hobbies: ['fishing', 'reading']
          },
          speechPatterns: {
            commonPhrases: ['Well, you know...', 'Back in my day...'],
            tone: 'gentle'
          }
        }
      );

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.message).toBe('Personality created successfully');
      expect(body.personality).toBeDefined();
      expect(body.personality.id).toBeDefined();
      expect(body.personality.name).toBe('John Doe');
      expect(body.personality.relationshipToCreator).toBe('father');
      expect(body.usage).toBeDefined();
      expect(body.usage.personalityCount).toBe(1);
      expect(body.usage.personalityLimit).toBeGreaterThan(0);
    });

    test('should fail without authentication', async ({ request }) => {
      const response = await request.post('/api/personalities/create', {
        data: {
          name: 'Test Personality'
        }
      });

      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toBe('Authentication required');
    });

    test('should fail with invalid authentication token', async ({ request }) => {
      const response = await authenticatedRequest(
        request,
        'POST',
        '/api/personalities/create',
        'invalid-token-12345',
        {
          name: 'Test Personality'
        }
      );

      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toBe('Invalid authentication');
    });

    test('should fail without required name field', async ({ request }) => {
      const user: TestUser = await createAuthenticatedUser(request, 'personality-no-name');

      const response = await authenticatedRequest(
        request,
        'POST',
        '/api/personalities/create',
        user.accessToken!,
        {
          dateOfBirth: '1950-01-01'
        }
      );

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.error).toBe('Name is required');
    });

    test('should create personality with minimal required fields', async ({ request }) => {
      const user: TestUser = await createAuthenticatedUser(request, 'personality-minimal');

      const response = await authenticatedRequest(
        request,
        'POST',
        '/api/personalities/create',
        user.accessToken!,
        {
          name: 'Minimal Personality'
        }
      );

      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.personality.name).toBe('Minimal Personality');
      expect(body.personality.id).toBeDefined();
    });

    test('should trim whitespace from personality name', async ({ request }) => {
      const user: TestUser = await createAuthenticatedUser(request, 'personality-trim');

      const response = await authenticatedRequest(
        request,
        'POST',
        '/api/personalities/create',
        user.accessToken!,
        {
          name: '  John Doe  '
        }
      );

      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.personality.name).toBe('John Doe');
    });

    test('should handle complex personality traits', async ({ request }) => {
      const user: TestUser = await createAuthenticatedUser(request, 'personality-complex');

      const complexTraits = {
        name: 'Complex Personality',
        personalityTraits: {
          bigFive: {
            openness: 8,
            conscientiousness: 7,
            extraversion: 6,
            agreeableness: 9,
            neuroticism: 3
          },
          temperament: 'optimistic',
          communicationStyle: 'direct'
        },
        memories: Array.from({ length: 5 }, (_, i) => ({
          title: `Memory ${i + 1}`,
          content: `This is memory content ${i + 1}`,
          date: `202${i}-01-01`
        })),
        speechPatterns: {
          vocabulary: ['excellent', 'wonderful', 'marvelous'],
          pace: 'moderate',
          volume: 'soft'
        }
      };

      const response = await authenticatedRequest(
        request,
        'POST',
        '/api/personalities/create',
        user.accessToken!,
        complexTraits
      );

      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.personality.personalityTraits).toEqual(complexTraits.personalityTraits);
      expect(body.personality.memories.length).toBe(5);
      expect(body.personality.speechPatterns).toEqual(complexTraits.speechPatterns);
    });

  });

  test.describe('Personality Subscription Limits', () => {

    test('should enforce free tier limit (1 personality)', async ({ request }) => {
      const user: TestUser = await createAuthenticatedUser(request, 'personality-limit-free');

      // Create first personality (should succeed)
      const firstResponse = await authenticatedRequest(
        request,
        'POST',
        '/api/personalities/create',
        user.accessToken!,
        {
          name: 'First Personality'
        }
      );

      expect(firstResponse.ok()).toBeTruthy();

      const firstBody = await firstResponse.json();
      expect(firstBody.usage.personalityCount).toBe(1);
      expect(firstBody.usage.personalityLimit).toBe(1);
      expect(firstBody.usage.remainingPersonalities).toBe(0);

      // Create second personality (should fail for free tier)
      const secondResponse = await authenticatedRequest(
        request,
        'POST',
        '/api/personalities/create',
        user.accessToken!,
        {
          name: 'Second Personality'
        }
      );

      expect(secondResponse.status()).toBe(429);

      const secondBody = await secondResponse.json();
      expect(secondBody.error).toContain('Personality limit reached');
      expect(secondBody.limit_reached).toBe(true);
      expect(secondBody.current_count).toBe(1);
      expect(secondBody.limit).toBe(1);
    });

    test('should track usage correctly', async ({ request }) => {
      const user: TestUser = await createAuthenticatedUser(request, 'personality-usage');

      const response = await authenticatedRequest(
        request,
        'POST',
        '/api/personalities/create',
        user.accessToken!,
        {
          name: 'Usage Test Personality'
        }
      );

      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.usage).toBeDefined();
      expect(body.usage.personalityCount).toBeGreaterThan(0);
      expect(body.usage.personalityLimit).toBeGreaterThan(0);
      expect(body.usage.remainingPersonalities).toBeGreaterThanOrEqual(0);
      expect(
        body.usage.personalityCount + body.usage.remainingPersonalities
      ).toBe(body.usage.personalityLimit);
    });

  });

  test.describe('Personality Data Validation', () => {

    test('should accept valid date formats', async ({ request }) => {
      const user: TestUser = await createAuthenticatedUser(request, 'personality-dates');

      const response = await authenticatedRequest(
        request,
        'POST',
        '/api/personalities/create',
        user.accessToken!,
        {
          name: 'Date Test',
          dateOfBirth: '1950-06-15',
          dateOfPassing: '2023-12-25'
        }
      );

      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.personality.dateOfBirth).toBe('1950-06-15');
      expect(body.personality.dateOfPassing).toBe('2023-12-25');
    });

    test('should handle null dates gracefully', async ({ request }) => {
      const user: TestUser = await createAuthenticatedUser(request, 'personality-null-dates');

      const response = await authenticatedRequest(
        request,
        'POST',
        '/api/personalities/create',
        user.accessToken!,
        {
          name: 'Null Dates Test',
          dateOfBirth: null,
          dateOfPassing: null
        }
      );

      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.personality.name).toBe('Null Dates Test');
    });

    test('should store relationship correctly', async ({ request }) => {
      const user: TestUser = await createAuthenticatedUser(request, 'personality-relationship');

      const relationships = ['father', 'mother', 'grandparent', 'sibling', 'friend'];

      for (const relationship of relationships) {
        const response = await authenticatedRequest(
          request,
          'POST',
          '/api/personalities/create',
          user.accessToken!,
          {
            name: `${relationship} personality`,
            relationshipToCreator: relationship
          }
        );

        // Only first one should succeed due to free tier limit
        if (relationship === relationships[0]) {
          expect(response.ok()).toBeTruthy();
          const body = await response.json();
          expect(body.personality.relationshipToCreator).toBe(relationship);
        }
      }
    });

  });

});
