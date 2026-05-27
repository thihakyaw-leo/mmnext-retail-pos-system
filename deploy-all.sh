#!/bin/bash

# MMNext Enterprise POS - Master Deployment Script

echo "🚀 Deploying MMnext Enterprise POS System..."

# Check if user is logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "❌ Please login to Cloudflare first: wrangler auth login"
    exit 1
fi

# Deploy backend first
echo "📡 Deploying backend (Cloudflare Workers)..."
cd backend
npm run deploy

if [ $? -eq 0 ]; then
    echo "✅ Backend deployed successfully!"
else
    echo "❌ Backend deployment failed!"
    exit 1
fi

# Deploy frontend
echo "🎨 Deploying frontend (Cloudflare Pages)..."
cd ../frontend
npm run deploy

if [ $? -eq 0 ]; then
    echo "✅ Frontend deployed successfully!"
else
    echo "❌ Frontend deployment failed!"
    exit 1
fi

cd ..

echo ""
echo "🎉 Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Frontend: https://mmnext-enterprise-pos.pages.dev"
echo "📡 Backend API: https://mmnext-enterprise-pos-backend.your-subdomain.workers.dev"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔧 Next steps:"
echo "1. Update frontend .env with your backend API URL"
echo "2. Run health check: npm run health"
echo "3. Access admin panel with default credentials"
echo "" 