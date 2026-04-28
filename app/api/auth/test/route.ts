import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json({
        authenticated: false,
        error: error.message,
        session: null
      });
    }

    return NextResponse.json({
      authenticated: !!session,
      user: session?.user?.email || null,
      userId: session?.user?.id || null,
      session: session ? {
        expires_at: session.expires_at,
        access_token: session.access_token ? 'present' : 'missing'
      } : null
    });
  } catch (error: any) {
    return NextResponse.json({
      authenticated: false,
      error: error.message || 'Unknown error',
      session: null
    });
  }
}