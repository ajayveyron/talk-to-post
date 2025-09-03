-- Migration: Add attachments functionality
-- Run this to add attachment support to existing database

-- Create attachments table for media files
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES drafts(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'gif')) NOT NULL,
  twitter_media_id TEXT, -- Stored after uploading to Twitter
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for attachments
CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_draft_id ON attachments(draft_id);

-- Enable RLS for attachments
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attachments
CREATE POLICY "Users can view own attachments" ON attachments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attachments" ON attachments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attachments" ON attachments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments" ON attachments
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for attachments
CREATE POLICY "Users can upload own attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );