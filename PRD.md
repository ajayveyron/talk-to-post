Here’s a full PRD (product requirements document) you can drop straight into Cursor or any AI coding assistant. I’ve written it as if you’re briefing an engineer team, with enough technical precision that a code editor can scaffold the system for you.

⸻

PRD: Voice-to-Twitter AI Posting Platform

1. Overview

A personal-use platform that lets a user:
	1.	Record raw thoughts via voice (web or mobile).
	2.	Convert audio → text using OpenAI Speech-to-Text.
	3.	Refine transcript into a polished Tweet or thread using an AI editor.
	4.	Post directly to their Twitter/X account via OAuth.

Target usage: ~300 posts/month. Single-user (yourself), but designed to be extendable for multi-user later.

⸻

2. Goals & Non-Goals

Goals
	•	Minimal friction: record, auto-generate draft, one-tap post.
	•	Keep system secure (OAuth, token refresh).
	•	Fit inside Free tier of X API (≤500 tweets/month).
	•	Allow manual edit before posting.

Non-Goals
	•	Multi-tenant SaaS scale.
	•	Analytics or scheduling beyond MVP.
	•	Cross-posting to LinkedIn, etc. (future extension).

⸻

3. User Flow (MVP)
	1.	Login
	•	Authenticate via X OAuth 2.0 (scopes: tweet.write, users.read, offline.access).
	•	Store tokens (encrypted) in DB.
	2.	Record Voice
	•	User taps “Hold to Record” or “Start Recording.”
	•	Audio saved as .webm/Opus via browser MediaRecorder.
	3.	Upload
	•	Client uploads audio file → backend via presigned URL (Supabase Storage or S3).
	•	Recording metadata saved in DB.
	4.	Transcription
	•	Backend worker calls openai.audio.transcriptions.create.
	•	Store transcript in DB.
	5.	Drafting
	•	AI takes transcript → cleans it → formats as tweet or thread.
	•	Output JSON { mode: "tweet"|"thread", tweets: [ ... ] }.
	•	Enforce ≤280 chars each, re-split if needed.
	6.	Review & Edit
	•	User sees draft, can edit inline.
	•	Char counter per tweet.
	7.	Post
	•	On confirm, backend calls POST /2/tweets using stored OAuth token.
	•	If thread, replies sequentially.
	•	Store tweet IDs in DB.

⸻

4. System Architecture

Frontend
	•	Next.js (React, PWA).
	•	Mic recording, file upload, draft preview, edit, post.

Backend
	•	Next.js API routes (or Node/Express).
	•	Supabase/Postgres DB.
	•	BullMQ + Redis for background tasks (transcribe, draft, post).
	•	OpenAI API for STT + LLM editing.
	•	Twitter/X API (OAuth 2.0, v2 endpoints).

Storage
	•	Supabase Storage for audio.
	•	Postgres for users, recordings, drafts, posts.

⸻

5. Data Model (SQL, Postgres/Supabase)

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  provider text not null, -- 'twitter'
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  screen_name text,
  created_at timestamptz default now()
);

create table recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  storage_key text not null,
  status text check (status in ('uploaded','transcribing','drafting','ready','posted','failed')) default 'uploaded',
  created_at timestamptz default now()
);

create table transcripts (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid references recordings(id) on delete cascade,
  text text not null,
  confidence numeric,
  created_at timestamptz default now()
);

create table drafts (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid references recordings(id) on delete cascade,
  mode text check (mode in ('tweet','thread')),
  thread jsonb, -- array of tweets
  created_at timestamptz default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid references recordings(id),
  account_id uuid references accounts(id),
  twitter_tweet_ids text[],
  posted_at timestamptz,
  error text
);


⸻

6. APIs

Auth
	•	GET /api/auth/twitter/login → redirect to X OAuth.
	•	GET /api/auth/twitter/callback → exchange code → store tokens.

Recording
	•	POST /api/recordings → create recording, return presigned upload URL.
	•	POST /api/recordings/:id/ingest → enqueue transcription job.

Draft
	•	GET /api/drafts/:recordingId → fetch draft JSON.
	•	POST /api/drafts/:id/post → publish to Twitter.

⸻

7. AI Prompts

Transcription
	•	Use gpt-4o-transcribe or whisper-1.

Drafting Prompt

You are an editor for startup/tech Twitter.
- Remove filler, hedging, repetition.
- Output either single tweet or thread (1 idea per tweet).
- Max 280 chars per tweet.
- Keep proper nouns as-is.
- Output JSON: { "mode": "tweet"|"thread", "tweets": [ ... ] }.


⸻

8. Posting Logic

async function postThread(account, tweets) {
  let replyTo: string | undefined;
  const posted: string[] = [];
  for (const t of tweets) {
    const res = await twitterClient.v2.tweet(t, replyTo ? { reply: { in_reply_to_tweet_id: replyTo } } : {});
    posted.push(res.data.id);
    replyTo = res.data.id;
    await sleep(500); // pacing
  }
  return posted;
}


⸻

9. Error Handling
	•	Token expired → refresh with refresh_token, retry once.
	•	Tweet >280 chars → server auto-split before posting.
	•	API 429 (rate limit) → exponential backoff.
	•	STT failure → retry once, else mark as failed.

⸻

10. Security
	•	Encrypt tokens at rest.
	•	All uploads via presigned URLs.
	•	Delete audio after transcription (optional).
	•	RLS policies in Supabase by user_id.

⸻

11. Milestones

MVP
	•	OAuth with X.
	•	Voice record + upload.
	•	Transcription.
	•	Draft AI (tweet/thread). - using Openrouter - Chatgpt model
	•	Post to X.

V2
	•	Scheduling.
	•	Style presets (“spicy,” “neutral”).
	•	Multi-user.

⸻

12. Tech Stack
	•	Frontend: Next.js + Tailwind + PWA
	•	Backend: Node/TS (Next API routes or Express)
	•	DB/Auth/Storage: Supabase
	•	Queue: BullMQ + Redis
	•	AI: OpenAI (STT + LLM)
	•	Social: Twitter/X API v2 (OAuth 2.0, write tweets)

⸻

Do you want me to write this PRD in a Cursor-ready repo scaffold format (with /frontend, /backend, /db/schema.sql, /docs/PRD.md) so you can just paste and let it generate files?