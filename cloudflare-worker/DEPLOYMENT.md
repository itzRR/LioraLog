# 🚀 Cloudflare Worker Deployment Guide

## ⚠️ SECURITY WARNING
**Your API key was shared in chat. Please generate a NEW key after setup:**
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Delete the old key: `AIzaSyBxIin8CLGwvgXfcJQjR0hYLXwUP1es5Is`
4. Use the new key in Step 3 below

---

## 📋 Prerequisites
- Cloudflare account (free): https://dash.cloudflare.com/sign-up
- Node.js installed
- Your LioraLog project

---

## 🔧 Step-by-Step Setup

### Step 1: Install Wrangler CLI
```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare
```bash
wrangler login
```
This will open your browser to authenticate.

### Step 3: Set API Key (Secure!)
```bash
cd cloudflare-worker
wrangler secret put GEMINI_API_KEY
```
When prompted, paste your **NEW** API key (not the one from chat!)

### Step 4: Deploy Worker
```bash
wrangler deploy
```

You'll get a URL like: `https://liora-ai-worker.YOUR-NAME.workers.dev`

### Step 5: Update Frontend
Copy your worker URL and update it in the frontend code (see INTEGRATION.md)

---

## 🧪 Test Your Worker

### Test Chat Endpoint
```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi Liora, how are you?"}'
```

### Test Summarize Endpoint
```bash
curl -X POST https://YOUR-WORKER-URL.workers.dev/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {"date": "2024-02-15", "tasksCompleted": "Wrote introduction", "taskStatus": "done"}
    ],
    "timeframe": "week"
  }'
```

---

## 📊 Monitor Usage
View your worker stats:
```bash
wrangler tail
```

Or check the dashboard:
https://dash.cloudflare.com/ → Workers & Pages → liora-ai-worker

---

## 🔄 Update Worker
After making changes to `worker.js`:
```bash
wrangler deploy
```

---

## 💰 Cost
- **Free tier**: 100,000 requests/day
- **Current usage**: ~0 (you haven't deployed yet!)
- **Gemini API**: Also free tier (60 requests/min)

---

## 🆘 Troubleshooting

### "Error: No .toml file found"
Make sure you're in the `cloudflare-worker` directory.

### "CORS error"
Update the `Access-Control-Allow-Origin` in worker.js to:
- `https://lioralogg.web.app` (production)
- `http://localhost:5173` (development)

### "API key invalid"
Run `wrangler secret put GEMINI_API_KEY` again with correct key.

---

## 🎯 Next Steps
1. ✅ Deploy worker
2. ✅ Test endpoints
3. ✅ Integrate with frontend (see INTEGRATION.md)
4. ✅ Enjoy AI-powered LioraLog!
