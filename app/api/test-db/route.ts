import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection and schema...');

    // Test 1: Check if users table exists
    const { data: usersTest, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    // Test 2: Check if personalities table exists
    const { data: personalitiesTest, error: personalitiesError } = await supabaseAdmin
      .from('personalities')
      .select('id')
      .limit(1);

    // Test 3: Check if conversations table exists
    const { data: conversationsTest, error: conversationsError } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .limit(1);

    // Test 4: Try to create a test user to verify permissions
    const testUserId = '00000000-0000-0000-0000-000000000000';
    const { data: createTest, error: createError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: testUserId,
        email: 'test@example.com',
        full_name: 'Test User',
        subscription_tier: 'free'
      }, {
        onConflict: 'id',
        ignoreDuplicates: true
      });

    const results = {
      database_connection: 'success',
      tables: {
        users: {
          exists: !usersError,
          error: usersError?.message,
          data_count: usersTest?.length || 0
        },
        personalities: {
          exists: !personalitiesError,
          error: personalitiesError?.message,
          data_count: personalitiesTest?.length || 0
        },
        conversations: {
          exists: !conversationsError,
          error: conversationsError?.message,
          data_count: conversationsTest?.length || 0
        }
      },
      user_creation_test: {
        success: !createError,
        error: createError?.message
      },
      environment: {
        supabase_admin_key: !!process.env.SUPABASE_SERVICE_KEY,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
      }
    };

    return NextResponse.json(results);

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      error: 'Database test failed',
      message: error.message
    }, { status: 500 });
  }
}