import { APIRequestContext } from '@playwright/test';

/**
 * Make authenticated API request
 */
export async function authenticatedRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  accessToken: string,
  data?: any
) {
  const options: any = {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.data = data;
  }

  switch (method) {
    case 'GET':
      return await request.get(url, options);
    case 'POST':
      return await request.post(url, options);
    case 'PUT':
      return await request.put(url, options);
    case 'PATCH':
      return await request.patch(url, options);
    case 'DELETE':
      return await request.delete(url, options);
  }
}

/**
 * Assert response status and return JSON
 */
export async function assertResponseOk<T = any>(
  response: any,
  expectedStatus: number = 200
): Promise<T> {
  const body = await response.json();

  if (response.status() !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status()}. Body: ${JSON.stringify(body)}`
    );
  }

  return body;
}

/**
 * Wait for a condition with timeout
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error('Condition not met within timeout');
}
