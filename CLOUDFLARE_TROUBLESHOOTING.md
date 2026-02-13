# Cloudflare Pages Build Configuration

## Build Settings

**Framework preset:** Next.js  
**Build command:** `npm run build`  
**Build output directory:** `.next`  
**Root directory:** `/`  
**Node version:** 18 or 20

## Environment Variables (if needed)

None required for basic functionality.

## Build Status Check

1. Go to https://dash.cloudflare.com
2. Navigate to **Pages** → **most-salon**
3. Check latest deployment status

## Common Issues

### Issue: Build Fails
**Solution:** Check build logs in Cloudflare dashboard

### Issue: Site shows old version
**Solution:** 
- Hard refresh: Ctrl+Shift+R
- Clear Cloudflare cache
- Wait 5-10 minutes for global CDN update

### Issue: API routes don't work
**Solution:** Cloudflare Pages has limited Next.js API route support. May need to:
- Use Cloudflare Workers
- Deploy to Vercel instead
- Use static generation

## Alternative: Test Locally

**Local Development:**
```bash
npm run dev
```

Visit: http://localhost:3000/booking

**From Phone (same network):**
Visit: http://100.125.59.74:3000/booking

## Recommended: Deploy to Vercel

For full Next.js support including API routes:

```bash
npx vercel login
npx vercel --prod
```

Vercel has better Next.js support than Cloudflare Pages.
