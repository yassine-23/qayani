import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    console.log('Checking database schema status...');

    const results = [];

    // Test each table to see if it exists
    const tables = ['users', 'personalities', 'recordings', 'conversations'];

    for (const table of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('id')
          .limit(1);

        if (error) {
          results.push({
            table,
            exists: false,
            error: error.message
          });
        } else {
          results.push({
            table,
            exists: true,
            row_count: data?.length || 0
          });
        }
      } catch (error) {
        results.push({
          table,
          exists: false,
          error: error.message
        });
      }
    }

    // Count how many tables are missing
    const missingTables = results.filter(r => !r.exists);

    return NextResponse.json({
      status: missingTables.length === 0 ? 'ready' : 'needs_setup',
      tables: results,
      missing_count: missingTables.length,
      setup_required: missingTables.length > 0,
      instructions: missingTables.length > 0 ?
        'Run the SQL script in production-database-setup.sql in your Supabase SQL editor' :
        'Database schema is properly configured'
    });

  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json({
      error: error.message,
      status: 'error',
      instructions: 'Check Supabase connection and permissions'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: 'Please run the database setup manually',
    instructions: [
      '1. Go to your Supabase dashboard',
      '2. Navigate to SQL Editor',
      '3. Run the script from production-database-setup.sql',
      '4. This will create all required tables and policies'
    ],
    sql_file: 'production-database-setup.sql'
  });
}