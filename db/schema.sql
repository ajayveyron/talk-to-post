-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create accounts table for OAuth tokens
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('twitter')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  screen_name TEXT,
  twitter_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create recordings table
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  status TEXT CHECK (status IN ('uploaded','transcribing','drafting','ready','posted','failed')) DEFAULT 'uploaded',
  file_size BIGINT,
  duration_seconds DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transcripts table
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  confidence DECIMAL,
  language TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create drafts table
CREATE TABLE drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
  mode TEXT CHECK (mode IN ('tweet','thread')) NOT NULL,
  thread JSONB NOT NULL, -- array of tweets
  original_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES recordings(id),
  account_id UUID REFERENCES accounts(id),
  draft_id UUID REFERENCES drafts(id),
  twitter_tweet_ids TEXT[],
  posted_at TIMESTAMPTZ,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_status ON recordings(status);
CREATE INDEX idx_transcripts_recording_id ON transcripts(recording_id);
CREATE INDEX idx_drafts_recording_id ON drafts(recording_id);
CREATE INDEX idx_posts_recording_id ON posts(recording_id);
CREATE INDEX idx_posts_account_id ON posts(account_id);

-- Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Accounts: Users can only access their own accounts
CREATE POLICY "Users can view own accounts" ON accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts" ON accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Recordings: Users can only access their own recordings
CREATE POLICY "Users can view own recordings" ON recordings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recordings" ON recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recordings" ON recordings
  FOR UPDATE USING (auth.uid() = user_id);

-- Transcripts: Users can only access transcripts of their recordings
CREATE POLICY "Users can view own transcripts" ON transcripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = transcripts.recording_id 
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own transcripts" ON transcripts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = transcripts.recording_id 
      AND recordings.user_id = auth.uid()
    )
  );

-- Drafts: Users can only access drafts of their recordings
CREATE POLICY "Users can view own drafts" ON drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = drafts.recording_id 
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own drafts" ON drafts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = drafts.recording_id 
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own drafts" ON drafts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = drafts.recording_id 
      AND recordings.user_id = auth.uid()
    )
  );

-- Posts: Users can only access posts of their recordings/accounts
CREATE POLICY "Users can view own posts" ON posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = posts.recording_id 
      AND recordings.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = posts.account_id
      AND accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own posts" ON posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = posts.recording_id 
      AND recordings.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = posts.account_id
      AND accounts.user_id = auth.uid()
    )
  );

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recordings_updated_at BEFORE UPDATE ON recordings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-recordings', 'audio-recordings', false);

-- Create storage policy for audio recordings
CREATE POLICY "Users can upload own audio files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio-recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own audio files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio-recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own audio files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'audio-recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
