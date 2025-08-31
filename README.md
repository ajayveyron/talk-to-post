# TalkToPost 🎤➡️🐦

Transform your voice into polished Twitter posts using AI. Record audio, get instant transcription, AI-powered refinement, and direct posting to Twitter.

## 🌟 Features

- **🎤 Voice Recording**: Browser-based audio recording with real-time feedback
- **📝 AI Transcription**: Automatic speech-to-text conversion
- **🤖 Smart Drafting**: AI-powered text refinement for social media
- **🐦 Twitter Integration**: Direct posting to Twitter with OAuth authentication
- **📊 History Tracking**: Complete recording and posting history
- **☁️ Cloud Storage**: Secure audio storage with Supabase
- **📱 Responsive Design**: Works on desktop and mobile devices

## 🚀 Live Demo

Visit the live application: [https://talk-to-post.vercel.app](https://talk-to-post.vercel.app)

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Material-UI
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Twitter OAuth 2.0
- **AI/ML**: OpenRouter API for transcription and text refinement
- **Deployment**: Vercel
- **Styling**: Material-UI, CSS-in-JS

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Twitter Developer account and app
- OpenRouter API account

## ⚙️ Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Twitter OAuth Configuration
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key
```

## 🏗️ Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `db/schema.sql`
3. Create a storage bucket named `audio-recordings`
4. Set up Row Level Security (RLS) policies as needed

## 🐦 Twitter App Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/portal)
2. Create a new app with OAuth 2.0 enabled
3. Add these callback URLs:
   - `http://localhost:3000/api/auth/twitter/direct-oauth` (development)
   - `https://talk-to-post.vercel.app/api/auth/twitter/direct-oauth` (production)
4. Copy your Client ID and Client Secret to environment variables

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/talk-to-post.git
   cd talk-to-post
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your actual values
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── recordings/   # Recording management
│   │   ├── transcribe/   # Transcription service
│   │   ├── draft/        # AI draft generation
│   │   └── post/         # Twitter posting
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main application page
├── components/           # React components
├── contexts/            # React context providers
└── lib/                 # Utility functions and configurations
```

## 🔧 API Endpoints

- `POST /api/recordings` - Create new recording
- `POST /api/recordings/[id]/ingest` - Process uploaded audio
- `POST /api/transcribe` - Transcribe audio to text
- `POST /api/draft` - Generate AI-refined draft
- `POST /api/post` - Post to Twitter
- `GET /api/auth/twitter/direct-login` - Initiate Twitter OAuth
- `GET /api/auth/twitter/direct-oauth` - Twitter OAuth callback

## 🎯 How It Works

1. **Record**: Click the microphone button to start recording your voice
2. **Upload**: Audio is automatically uploaded to secure cloud storage
3. **Transcribe**: AI converts your speech to text
4. **Refine**: AI polishes the text into an engaging social media post
5. **Review**: Check the generated draft and make any edits
6. **Post**: One-click publishing directly to your Twitter account

## 🔒 Security Features

- OAuth 2.0 authentication with Twitter
- Secure token storage and management
- Row Level Security (RLS) in Supabase
- Environment-based configuration
- Stable redirect URIs for production deployment

## 📈 Performance Optimizations

- Next.js App Router for optimal performance
- Efficient audio compression and streaming
- Lazy loading of heavy components
- Optimized bundle splitting
- CDN deployment via Vercel

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository to Vercel**
2. **Add environment variables** in Vercel dashboard
3. **Deploy** - automatic deployments on push to main

### Manual Deployment

```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Supabase](https://supabase.com/) for backend-as-a-service
- [Material-UI](https://mui.com/) for beautiful React components
- [OpenRouter](https://openrouter.ai/) for AI API services
- [Vercel](https://vercel.com/) for seamless deployment

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/talk-to-post/issues) page
2. Create a new issue with detailed description
3. Join our community discussions

---

**Made with ❤️ and ☕ - Turn your voice into viral tweets!**
