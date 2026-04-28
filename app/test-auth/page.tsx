'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase/client';
import Link from 'next/link';

export default function TestAuth() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        setError(error.message);
      } else {
        setSession(session);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Test Page</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          {session ? (
            <>
              <p className="text-green-600 font-semibold mb-2">✅ Authenticated</p>
              <div className="bg-gray-50 p-4 rounded mb-4">
                <p><strong>User Email:</strong> {session.user.email}</p>
                <p><strong>User ID:</strong> {session.user.id}</p>
                <p><strong>Session Expires:</strong> {new Date(session.expires_at * 1000).toLocaleString()}</p>
              </div>
              <button
                onClick={signOut}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <p className="text-red-600 font-semibold mb-4">❌ Not Authenticated</p>
              <Link href="/auth" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 inline-block">
                Go to Login Page
              </Link>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Protected Pages</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/dashboard" className="bg-gray-100 p-4 rounded hover:bg-gray-200 text-center">
              <div className="text-2xl mb-2">📊</div>
              <p>Dashboard</p>
            </Link>
            <Link href="/capture" className="bg-gray-100 p-4 rounded hover:bg-gray-200 text-center">
              <div className="text-2xl mb-2">🎤</div>
              <p>Capture</p>
            </Link>
            <Link href="/eternal" className="bg-gray-100 p-4 rounded hover:bg-gray-200 text-center">
              <div className="text-2xl mb-2">💬</div>
              <p>Chat</p>
            </Link>
            <Link href="/profile" className="bg-gray-100 p-4 rounded hover:bg-gray-200 text-center">
              <div className="text-2xl mb-2">👤</div>
              <p>Profile</p>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
          <button
            onClick={checkSession}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mb-4"
          >
            Refresh Session
          </button>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify({ session, error }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}