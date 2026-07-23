# Vercel Deployment Guide

## Current Error: MongoDB Authentication Failed

**Error:** `Internal Server Error: bad auth : authentication failed`

This means MongoDB Atlas is rejecting your credentials.

---

## Step 1: Fix MongoDB Atlas Connection

### Option A: Update Your MONGODB_URI Format

Your current URI:
```
mongodb+srv://hadiyalnilesh6061_db_user:Nilesh%401212@cluster0.kpyolsu.mongodb.net/?appName=Cluster0
```

**Ensure it matches this format:**
```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority
```

**Example for your setup:**
```
mongodb+srv://hadiyalnilesh6061_db_user:Nilesh%401212@cluster0.kpyolsu.mongodb.net/sports-venue-booking-platform?retryWrites=true&w=majority
```

### Option B: Check MongoDB Atlas Credentials

1. Go to https://cloud.mongodb.com/
2. Select your cluster
3. Click **Database Access** → Verify username and password
4. Click **Network Access** → Add `0.0.0.0/0` to allow Vercel connections
5. Copy the correct connection string

---

## Step 2: Update Vercel Environment Variables

1. Go to **Vercel Dashboard** → Your Project
2. Click **Settings** → **Environment Variables**
3. Add/Update these variables:

| Variable Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://...` (from step 1) |
| `SESSION_SECRET` | A long random string (e.g., generate one at https://generate-random.org/) |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Your Gmail app password (from https://myaccount.google.com/apppasswords) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_FROM_NAME` | `Sports Venue Booking Platform` |
| `SMTP_FROM_EMAIL` | Your Gmail address |
| `BOOKING_ADVANCE_PERCENT` | `25` |
| `APP_URL` | Your Vercel URL (e.g., `https://sport-venue-booking.vercel.app`) |

---

## Step 3: Deploy

1. **Commit and push** your changes to GitHub:
```bash
git add .
git commit -m "Fix MongoDB connection and Vercel deployment"
git push
```

2. Vercel will **auto-redeploy**

3. Check deployment logs:
   - Go to Vercel Dashboard
   - Click on your project
   - Select the latest deployment
   - View **Logs** to see detailed error messages

---

## Step 4: Verify MongoDB Connection

After deployment, if you still see errors:

1. Check Vercel **Deployments** tab
2. Open the **Runtime Logs**
3. Look for `[DB]` messages
4. Common errors:
   - `bad auth` → Check username/password
   - `ENOTFOUND` → Check MongoDB URI format
   - `ECONNREFUSED` → Network Access not allowed in MongoDB

---

## Quick Checklist

- [ ] MongoDB Atlas Network Access includes `0.0.0.0/0`
- [ ] Vercel has correct `MONGODB_URI` environment variable
- [ ] Vercel has `SESSION_SECRET` (not default)
- [ ] Git changes pushed to GitHub
- [ ] Vercel auto-deployed successfully
- [ ] Deployment logs show `[DB] MongoDB connected successfully`

---

## Still Having Issues?

1. **Reset MongoDB Password:**
   - MongoDB Atlas → Database Access
   - Edit user → Regenerate password
   - Copy new password, URL-encode if needed
   - Update `MONGODB_URI` in Vercel

2. **Check IP Whitelist:**
   - MongoDB Atlas → Network Access
   - Ensure `0.0.0.0/0` or `0.0.0.0/0` is added

3. **Test Locally:**
   - Copy exact `MONGODB_URI` from Vercel env vars
   - Paste into `.env` file locally
   - Run: `npm start`
   - Check if connection works locally

---

## Database Connection Details

- **Host:** `cluster0.kpyolsu.mongodb.net`
- **Database:** `sports-venue-booking-platform`
- **Authentication:** SCRAM-SHA-1
