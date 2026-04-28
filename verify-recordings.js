// Simple script to verify recordings are being saved to database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bkpyrvmptpncujciueyc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrcHlydm1wdHBuY3VqY2l1ZXljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODI0MzY3MSwiZXhwIjoyMDczODE5NjcxfQ.Aq_XNAvmEpetOmvy7wlt8ULN9fkU05A9z_2JsVaySwo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyRecordings() {
  try {
    console.log('🔍 Checking database connection...');

    // Test database connection
    const { data: healthCheck, error: healthError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (healthError) {
      console.error('❌ Database connection failed:', healthError.message);
      return;
    }

    console.log('✅ Database connection successful');

    // Check for users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .limit(5);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
    } else {
      console.log(`👥 Found ${users.length} users in database`);
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.full_name || 'No name'})`);
      });
    }

    // Check for personalities
    const { data: personalities, error: personalitiesError } = await supabase
      .from('personalities')
      .select('id, name, user_id')
      .limit(5);

    if (personalitiesError) {
      console.error('❌ Error fetching personalities:', personalitiesError.message);
    } else {
      console.log(`🎭 Found ${personalities.length} personalities in database`);
      personalities.forEach(personality => {
        console.log(`   - ${personality.name} (ID: ${personality.id})`);
      });
    }

    // Check for recordings
    const { data: recordings, error: recordingsError } = await supabase
      .from('recordings')
      .select('id, personality_id, file_url, duration, transcript, processing_status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recordingsError) {
      console.error('❌ Error fetching recordings:', recordingsError.message);
    } else {
      console.log(`🎤 Found ${recordings.length} recordings in database`);
      recordings.forEach(recording => {
        const date = new Date(recording.created_at).toLocaleString();
        console.log(`   - ${recording.id} (${recording.duration}s, ${recording.processing_status}) - ${date}`);
        if (recording.transcript) {
          console.log(`     Transcript: ${recording.transcript.substring(0, 100)}...`);
        }
      });
    }

    // Check storage bucket
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error checking storage:', bucketsError.message);
    } else {
      console.log('🗄️ Storage buckets:');
      buckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      });

      // Check recordings bucket
      const recordingsBucket = buckets.find(b => b.name === 'recordings');
      if (recordingsBucket) {
        const { data: files, error: filesError } = await supabase
          .storage
          .from('recordings')
          .list('', { limit: 10 });

        if (filesError) {
          console.error('❌ Error listing recording files:', filesError.message);
        } else {
          console.log(`📁 Found ${files.length} files in recordings bucket`);
          files.forEach(file => {
            console.log(`   - ${file.name} (${(file.metadata?.size || 0 / 1024).toFixed(1)}KB)`);
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyRecordings();