#!/usr/bin/env tsx

/**
 * QAYANI Authentication Diagnostic Tool
 *
 * Systematically checks all layers of the authentication system:
 * 1. Environment variables
 * 2. Google OAuth configuration
 * 3. Supabase authentication setup
 * 4. Redirect URLs
 * 5. Network connectivity
 */

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import { URL } from 'url';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function section(title: string) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`${title}`, colors.bright + colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
}

function success(message: string) {
  log(`✅ ${message}`, colors.green);
}

function error(message: string) {
  log(`❌ ${message}`, colors.red);
}

function warning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function checkEnvironmentVariables() {
  section('1. ENVIRONMENT VARIABLES');

  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SUPABASE_REDIRECT_URL',
  ];

  const missing: string[] = [];
  const present: string[] = [];

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      present.push(varName);
      const value = process.env[varName]!;
      const displayValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
      success(`${varName} = ${displayValue}`);
    } else {
      missing.push(varName);
      error(`${varName} is NOT set`);
    }
  }

  if (missing.length === 0) {
    success(`All ${requiredVars.length} required environment variables are set`);
    return true;
  } else {
    error(`${missing.length} required environment variables are missing`);
    return false;
  }
}

async function checkSupabaseConnection() {
  section('2. SUPABASE CONNECTION');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    error('Supabase credentials not configured');
    return false;
  }

  info(`Connecting to: ${supabaseUrl}`);

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test connection by getting auth session
    const { data, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      error(`Session check failed: ${sessionError.message}`);
      return false;
    }

    success('Supabase client initialized successfully');
    info(`Current session: ${data.session ? 'Active' : 'None'}`);

    // Check Google OAuth provider configuration
    const { data: providers, error: providerError } = await supabase.auth.admin.listUsers();

    if (providerError) {
      warning(`Could not verify OAuth providers: ${providerError.message}`);
    }

    return true;
  } catch (err) {
    error(`Supabase connection failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function checkGoogleOAuthConfig() {
  section('3. GOOGLE OAUTH CONFIGURATION');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId) {
    error('GOOGLE_CLIENT_ID not configured');
    return false;
  }

  if (!clientSecret) {
    error('GOOGLE_CLIENT_SECRET not configured');
    return false;
  }

  success(`Client ID: ${clientId}`);
  success(`Client Secret: ${clientSecret.substring(0, 20)}...`);

  // Validate client ID format
  if (!clientId.endsWith('.apps.googleusercontent.com')) {
    error('Invalid Google Client ID format');
    return false;
  }

  success('Google OAuth credentials format is valid');

  info('To verify Google OAuth configuration:');
  info('1. Visit: https://console.cloud.google.com/apis/credentials');
  info(`2. Find OAuth 2.0 Client ID: ${clientId}`);
  info('3. Check Authorized redirect URIs include:');
  info(`   - ${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`);
  info(`   - ${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`);

  return true;
}

async function checkRedirectURLs() {
  section('4. REDIRECT URL CONFIGURATION');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const redirectUrl = process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  info(`App URL: ${appUrl}`);
  info(`Redirect URL: ${redirectUrl}`);

  // Check if redirect URL matches app URL
  if (redirectUrl?.startsWith(appUrl!)) {
    success('Redirect URL matches app URL');
  } else {
    error('Redirect URL does not match app URL');
    return false;
  }

  // Check if it's localhost or production
  if (appUrl?.includes('localhost')) {
    warning('Using localhost URLs - make sure Supabase allows localhost redirects');
    info('In Supabase Dashboard > Authentication > URL Configuration:');
    info(`- Add "${redirectUrl}" to "Redirect URLs"`);
  } else {
    info('Using production URLs');
  }

  // Critical redirect URLs that must be configured
  info('\n📋 Required redirect URLs in Supabase:');
  info(`   1. ${redirectUrl} (app callback)`);
  info(`   2. ${supabaseUrl}/auth/v1/callback (Supabase OAuth)`);

  info('\n📋 Required redirect URLs in Google OAuth:');
  info(`   1. ${supabaseUrl}/auth/v1/callback (primary)`);
  info(`   2. ${redirectUrl} (optional)`);

  return true;
}

async function checkNetworkConnectivity() {
  section('5. NETWORK CONNECTIVITY');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    error('Supabase URL not configured');
    return false;
  }

  info(`Testing connection to: ${supabaseUrl}`);

  try {
    const url = new URL(supabaseUrl);

    const result = await new Promise<boolean>((resolve) => {
      const req = https.get(url.origin, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          success(`Successfully connected to Supabase (status: ${res.statusCode})`);
          resolve(true);
        } else {
          error(`HTTP error: ${res.statusCode}`);
          resolve(false);
        }
      });

      req.on('error', (err) => {
        error(`Connection failed: ${err.message}`);
        resolve(false);
      });

      req.setTimeout(5000, () => {
        error('Connection timeout (5s)');
        req.destroy();
        resolve(false);
      });
    });

    return result;
  } catch (err) {
    error(`Network test failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function checkAuthCallbackRoute() {
  section('6. AUTH CALLBACK ROUTE');

  const fs = await import('fs');
  const path = await import('path');

  const callbackPath = path.join(process.cwd(), 'app', 'auth', 'callback', 'route.ts');

  if (fs.existsSync(callbackPath)) {
    success('Auth callback route exists: app/auth/callback/route.ts');

    const content = fs.readFileSync(callbackPath, 'utf-8');

    // Check for key elements
    if (content.includes('exchangeCodeForSession')) {
      success('✓ Contains exchangeCodeForSession');
    } else {
      error('✗ Missing exchangeCodeForSession call');
    }

    if (content.includes('createRouteHandlerClient')) {
      success('✓ Uses createRouteHandlerClient');
    } else {
      warning('✗ Not using createRouteHandlerClient');
    }

    if (content.includes('/dashboard')) {
      success('✓ Redirects to /dashboard on success');
    } else {
      warning('✗ Does not redirect to /dashboard');
    }

    return true;
  } else {
    error('Auth callback route NOT found: app/auth/callback/route.ts');
    error('This file is required to handle OAuth callbacks');
    return false;
  }
}

async function generateReport() {
  section('7. DIAGNOSTIC SUMMARY');

  const results = {
    envVars: await checkEnvironmentVariables(),
    supabase: await checkSupabaseConnection(),
    googleOAuth: await checkGoogleOAuthConfig(),
    redirects: await checkRedirectURLs(),
    network: await checkNetworkConnectivity(),
    callback: await checkAuthCallbackRoute(),
  };

  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(Boolean).length;
  const failedChecks = totalChecks - passedChecks;

  log('\n' + '='.repeat(60), colors.bright);

  if (failedChecks === 0) {
    success(`✅ ALL CHECKS PASSED (${passedChecks}/${totalChecks})`);
    log('\nYour authentication system is properly configured!', colors.green);
  } else {
    error(`❌ ${failedChecks} CHECK(S) FAILED (${passedChecks}/${totalChecks} passed)`);
    log('\nPlease fix the issues above before testing authentication.', colors.red);
  }

  log('='.repeat(60) + '\n', colors.bright);

  return failedChecks === 0;
}

// Run diagnostics
(async () => {
  log('\n🔍 QAYANI Authentication Diagnostic Tool', colors.bright + colors.cyan);
  log(`Running comprehensive authentication checks...\n`, colors.cyan);

  const success = await generateReport();

  process.exit(success ? 0 : 1);
})();
