# Netlify Deployment Guide

This guide explains how to deploy the Mandarin Exam Practice app to Netlify with environment variables.

**Repository:** [https://github.com/TIMOVIS/mandarin_exam.git](https://github.com/TIMOVIS/mandarin_exam.git)

## Prerequisites

1. A Netlify account
2. Your Supabase project URL and anon key
3. Your Google Gemini API key

## Deployment Steps

### 1. Connect Your Repository

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" > "Import an existing project"
3. Select GitHub and authorize Netlify if needed
4. Search for and select the repository: `TIMOVIS/mandarin_exam`
5. Netlify will automatically detect the build settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`

### 2. Set Environment Variables

In your Netlify dashboard, go to:
**Site Settings > Environment Variables**

Add the following environment variables:

#### Client-side Variables (exposed to browser)
These must be prefixed with `VITE_` to be accessible in the React app:

- `VITE_SUPABASE_URL` - Your Supabase project URL
  - Example: `https://your-project.supabase.co`
  
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key
  - Example format: `sb_publishable_...` or a JWT token starting with `eyJ...`
  - Get this from your Supabase project settings
  
- `VITE_GEMINI_API_KEY` - Your Google Gemini API key
  - Get this from [Google AI Studio](https://makersuite.google.com/app/apikey)

#### Server-side Variables (Netlify functions only)
These are only accessible in serverless functions:

- `GEMINI_API_KEY` - Your Google Gemini API key (same as above, but without VITE_ prefix)
  - This is used by the Netlify function at `netlify/functions/gemini.ts`

### 3. Deploy

1. After setting environment variables, trigger a new deployment:
   - If connected to Git: push a commit or click "Trigger deploy" > "Deploy site"
   - If manual: drag and drop your `dist` folder after running `npm run build`

2. Wait for the build to complete

3. Your app will be live at `https://your-site-name.netlify.app`

## Local Development

For local development, create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
GEMINI_API_KEY=your-gemini-api-key
```

**Important:** Never commit your `.env` file to Git. It should be in `.gitignore`.

## Environment Variable Reference

| Variable | Type | Description |
|----------|------|-------------|
| `VITE_SUPABASE_URL` | Client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client | Supabase anonymous/public key |
| `VITE_GEMINI_API_KEY` | Client | Google Gemini API key (for client-side AI calls) |
| `GEMINI_API_KEY` | Server | Google Gemini API key (for Netlify functions) |

## Troubleshooting

### Build Fails
- Check that all required environment variables are set in Netlify
- Verify the variable names match exactly (case-sensitive)
- Check the build logs in Netlify dashboard

### App Works Locally but Not on Netlify
- Ensure environment variables are set in Netlify (not just locally)
- Verify `VITE_` prefix is used for client-side variables
- Check browser console for errors related to missing environment variables

### Supabase Connection Issues
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check Supabase dashboard for your project credentials
- Ensure your Supabase project allows connections from your Netlify domain

### AI API Issues
- Verify both `VITE_GEMINI_API_KEY` and `GEMINI_API_KEY` are set
- Check that your API key is valid and has proper permissions
- Review Netlify function logs for server-side errors

## Security Notes

- **Never commit API keys or secrets to Git**
- The `VITE_` prefixed variables are exposed to the browser - only use public keys
- Use Supabase Row Level Security (RLS) to protect your data
- Consider using Netlify's environment variable scoping (production vs. preview)

