#!/bin/bash

# Deployment script for Vercel

echo "🚀 Starting Sapphire Frontend Deployment..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local not found. Creating from .env.example..."
    cp .env.example .env.local
    echo "📝 Please update .env.local with your backend URL and API keys"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Update .env.local with your production backend URL"
    echo "2. Commit and push to GitHub"
    echo "3. Deploy on Vercel:"
    echo "   - Import your GitHub repository"
    echo "   - Add environment variables:"
    echo "     * NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com"
    echo "     * GOOGLE_GEMINI_API_KEY=your_key (optional)"
    echo "     * YOUTUBE_API_KEY=your_key (optional)"
    echo "4. Deploy!"
    echo ""
    echo "🌐 Your frontend will be live at: https://your-project.vercel.app"
else
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi
