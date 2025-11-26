# Edura Setup Guide

This guide will help you set up the Edura project with Supabase and Gemini AI integration.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Gemini API key (already provided)

## Step 1: Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Gemini API Configuration
VITE_GEMINI_API_KEY=AIzaSyA4JkBg8fAjNik4L3ceCJwZaNFiwcgW4BE
VITE_GEMINI_MODEL=gemini-2.5-flash

# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Step 2: Set Up Supabase

1. **Create a Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the project to be fully provisioned

2. **Get Your Supabase Credentials:**
   - Go to Project Settings → API
   - Copy the "Project URL" → This is your `VITE_SUPABASE_URL`
   - Copy the "anon public" key → This is your `VITE_SUPABASE_ANON_KEY`
   - Update your `.env` file with these values

3. **Set Up the Database Schema:**
   - Go to SQL Editor in your Supabase dashboard
   - Copy the contents of `supabase-schema.sql`
   - Paste and run it in the SQL Editor
   - This will create all necessary tables, indexes, and security policies

4. **Set Up Storage:**
   - The schema includes storage bucket creation
   - If needed, you can also create it manually:
     - Go to Storage in Supabase dashboard
     - Create a new bucket named "notes"
     - Make it public if you want public file access

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Run the Development Server

```bash
npm run dev
```

The app should now be running at `http://localhost:8080`

## Step 5: Test the Integration

1. **Test Authentication:**
   - Go to `/register` and create a new account
   - Check Supabase Auth → Users to see if the user was created
   - Check the `users` table to see if the profile was created

2. **Test AI Features:**
   - Go to `/ai-bot` and send a message
   - It should get a response from Gemini AI
   - Go to `/notes` and upload a text file
   - Generate a summary, flashcards, or quiz

3. **Test Roadmap:**
   - Go to `/roadmap`
   - Enter a learning goal
   - Generate a roadmap (uses Gemini AI)

## Troubleshooting

### Authentication Issues

- **Error: "Supabase credentials not configured"**
  - Make sure your `.env` file has the correct Supabase URL and anon key
  - Restart the dev server after updating `.env`

- **Error: "Failed to create user"**
  - Check Supabase dashboard → Authentication → Settings
  - Ensure email authentication is enabled
  - Check if email confirmation is required (disable for testing)

### AI/Gemini Issues

- **Error: "Failed to get response from AI"**
  - Check if the Gemini API key is correct
  - Verify you have API quota remaining
  - Check browser console for detailed error messages

### Database Issues

- **Error: "relation does not exist"**
  - Make sure you ran the `supabase-schema.sql` file
  - Check Supabase dashboard → Database → Tables to verify tables exist

- **Error: "permission denied"**
  - Check Row Level Security (RLS) policies
  - Ensure you're authenticated when making requests
  - Verify RLS policies in `supabase-schema.sql` were created

## Next Steps

- [ ] Set up Google Translate API (optional)
- [ ] Implement file upload for PDFs/images
- [ ] Add real-time features for community
- [ ] Set up analytics tracking
- [ ] Deploy to production (Vercel/Netlify)

## Project Structure

```
src/
├── lib/
│   ├── supabase.ts      # Supabase client configuration
│   └── gemini.ts        # Gemini AI service functions
├── services/
│   ├── authService.ts   # Authentication functions
│   ├── userService.ts   # User profile functions
│   ├── notesService.ts  # Notes and AI generation
│   └── roadmapService.ts # Roadmap generation
├── pages/               # React page components
├── components/          # Reusable UI components
└── store/               # Zustand state management
```

## API Keys Security

⚠️ **Important:** Never commit your `.env` file to version control!**

The `.env` file is already in `.gitignore`, but make sure:
- Don't share your API keys publicly
- Use environment variables in production
- Rotate keys if they're accidentally exposed

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Check Supabase logs (Dashboard → Logs)
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed

