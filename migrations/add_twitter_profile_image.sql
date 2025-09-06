-- Migration: Add Twitter profile image to accounts table
-- Run this to add profile image support to existing database

-- Add twitter_profile_image column to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS twitter_profile_image TEXT;

-- Add twitter_username column to accounts table (if not already exists)
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS twitter_username TEXT;

-- Add twitter_name column to accounts table (if not already exists)
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS twitter_name TEXT;
