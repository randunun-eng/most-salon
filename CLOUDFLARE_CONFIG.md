# Cloudflare Pages Configuration

## Build Configuration (Set in Cloudflare Dashboard)

Go to: https://dash.cloudflare.com → Pages → most-salon → Settings → Builds & deployments

### Build Settings:
- **Framework preset:** `Next.js`
- **Build command:** `npm run build`
- **Build output directory:** `.next`
- **Root directory:** `/` (leave empty)
- **Node version:** `18` or `20`

### Environment Variables:
None required for basic functionality.

---

## Important: Cloudflare Pages + Next.js API Routes

Cloudflare Pages has **experimental** support for Next.js API routes through their build system.

### Current Status:
Your site at https://most-salon.pages.dev/ is deployed but may be showing an old version or having build issues.

### To Fix:

1. **Go to Cloudflare Dashboard:**
   - https://dash.cloudflare.com
   - Pages → most-salon
   - View latest deployment

2. **Check Build Logs:**
   - Click on the latest deployment
   - View build logs
   - Look for errors

3. **Trigger New Deployment:**
   - Go to Deployments tab
   - Click "Retry deployment" on latest
   - OR make a small change and push to GitHub

---

## Alternative: Use Cloudflare Workers for API

If Cloudflare Pages doesn't support the API routes properly, we can:

1. Keep the frontend on Cloudflare Pages (static)
2. Move API routes to Cloudflare Workers
3. Update API calls to point to Workers

This is more complex but fully Cloudflare-compatible.

---

## Quick Fix: Force Redeploy

The easiest solution is to force Cloudflare to rebuild:

1. Make a small change (add a comment to a file)
2. Commit and push to GitHub
3. Cloudflare will auto-rebuild
4. Wait 2-5 minutes
5. Check https://most-salon.pages.dev/booking

---

## Current Deployment Status

**Your site:** https://most-salon.pages.dev/
**Expected:** Should show the new booking system with calendar
**If not working:** Build might have failed or is using old code

**Check build status at:**
https://dash.cloudflare.com → Pages → most-salon → Deployments
