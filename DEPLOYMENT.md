# Deployment Guide

Complete guide for deploying Tick Time Tracker to various hosting platforms.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Build for Production](#build-for-production)
3. [Deployment Options](#deployment-options)
4. [Platform-Specific Guides](#platform-specific-guides)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

Before deploying, ensure:

- ✅ All features tested locally
- ✅ Production build runs without errors
- ✅ Environment variables configured
- ✅ Icons/images optimized
- ✅ API endpoints verified
- ✅ HTTPS available for target domain
- ✅ Service worker tested

## Build for Production

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Production Build

```bash
npm run build
```

This creates an optimized build in the `build/` directory with:
- Minified JavaScript and CSS
- Optimized images
- Service worker
- Source maps

### 3. Test Production Build Locally

```bash
# Install serve globally
npm install -g serve

# Serve the build
serve -s build

# Open http://localhost:3000
```

Verify:
- All features work
- Service worker registers
- PWA installable
- No console errors

## Deployment Options

### Option 1: Static Hosting (Recommended)
Best for: Simple deployment, automatic HTTPS, CDN

**Platforms:**
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages

### Option 2: Cloud Platforms
Best for: Scalability, custom domains, advanced features

**Platforms:**
- AWS S3 + CloudFront
- Azure Static Web Apps
- Google Cloud Storage + CDN

### Option 3: Traditional Hosting
Best for: Existing infrastructure, full control

**Platforms:**
- Nginx
- Apache
- IIS

### Option 4: Containerized
Best for: Microservices, Kubernetes environments

**Platforms:**
- Docker
- Kubernetes

## Platform-Specific Guides

### Netlify (Easiest)

**Via Git Integration:**

1. Push code to GitHub/GitLab/Bitbucket

2. Go to [Netlify](https://app.netlify.com/)

3. Click "New site from Git"

4. Connect repository

5. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `build`

6. Click "Deploy site"

7. (Optional) Configure custom domain

**Via Drag & Drop:**

1. Build locally: `npm run build`

2. Go to [Netlify Drop](https://app.netlify.com/drop)

3. Drag `build/` folder to the upload area

4. Done! Site is live

**Configuration:**

Create `netlify.toml` in project root:

```toml
[build]
  command = "npm run build"
  publish = "build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/service-worker.js"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

---

### Vercel

**Via CLI:**

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Build and deploy:
```bash
npm run build
vercel --prod
```

**Via Git Integration:**

1. Push code to GitHub

2. Go to [Vercel](https://vercel.com/)

3. Import project

4. Configure:
   - **Framework Preset:** Create React App
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

5. Deploy

**Configuration:**

Create `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache"
        }
      ]
    }
  ]
}
```

---

### GitHub Pages

**Setup:**

1. Install gh-pages package:
```bash
npm install --save-dev gh-pages
```

2. Add to `package.json`:
```json
{
  "homepage": "https://yourusername.github.io/tick-client",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

3. Deploy:
```bash
npm run deploy
```

4. Enable GitHub Pages in repo settings:
   - Settings → Pages
   - Source: gh-pages branch

**Note:** GitHub Pages only supports project paths, not root domains.

---

### AWS S3 + CloudFront

**1. Create S3 Bucket:**

```bash
# Create bucket
aws s3 mb s3://tick-tracker

# Enable static website hosting
aws s3 website s3://tick-tracker \
  --index-document index.html \
  --error-document index.html
```

**2. Upload Build:**

```bash
npm run build
aws s3 sync build/ s3://tick-tracker --delete
```

**3. Set Bucket Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::tick-tracker/*"
    }
  ]
}
```

**4. Create CloudFront Distribution:**

- Origin: S3 bucket
- Viewer Protocol: Redirect HTTP to HTTPS
- Default Root Object: index.html
- Error Pages: 404 → /index.html (for SPA routing)

**5. Configure Custom Domain (Optional):**

- Add CNAME record to DNS
- Request SSL certificate in ACM
- Add alternate domain to CloudFront

---

### Docker

**Create Dockerfile:**

```dockerfile
# Build stage
FROM node:16-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Create nginx.conf:**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /service-worker.js {
        add_header Cache-Control "no-cache";
        expires 0;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Build and Run:**

```bash
# Build image
docker build -t tick-tracker .

# Run container
docker run -d -p 80:80 tick-tracker

# Or with docker-compose
docker-compose up -d
```

**docker-compose.yml:**

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
```

---

### Traditional Server (Nginx)

**1. Build Application:**

```bash
npm run build
```

**2. Upload to Server:**

```bash
# Via SCP
scp -r build/* user@server:/var/www/tick-tracker/

# Or via SFTP, FTP, etc.
```

**3. Configure Nginx:**

Create `/etc/nginx/sites-available/tick-tracker`:

```nginx
server {
    listen 80;
    server_name tick.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tick.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/tick.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tick.yourdomain.com/privkey.pem;
    
    root /var/www/tick-tracker;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/javascript application/json;
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Service worker - no cache
    location /service-worker.js {
        add_header Cache-Control "no-cache";
        expires 0;
    }
    
    # Static assets - long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**4. Enable Site:**

```bash
sudo ln -s /etc/nginx/sites-available/tick-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**5. Setup SSL with Let's Encrypt:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tick.yourdomain.com
```

---

## Post-Deployment

### 1. Verify Deployment

- [ ] Site loads correctly
- [ ] HTTPS works
- [ ] All pages accessible
- [ ] Login works
- [ ] API calls succeed
- [ ] Service worker registers
- [ ] PWA installable

### 2. Test PWA Features

**Desktop:**
- Install app from browser
- Launch installed app
- Test offline mode

**Mobile:**
- Add to home screen
- Launch from home screen
- Test touch interactions

### 3. Performance Testing

Use [Google PageSpeed Insights](https://pagespeed.web.dev/):

```
Target Scores:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90
```

### 4. Monitor

Set up monitoring for:
- Uptime (UptimeRobot, Pingdom)
- Errors (Sentry)
- Analytics (Google Analytics)
- Performance (Web Vitals)

### 5. Setup Analytics (Optional)

Add to `.env.production`:

```env
REACT_APP_GA_TRACKING_ID=UA-XXXXXXXXX-X
```

Update `index.html` to include analytics script.

## Environment Variables

### Production Environment

Create `.env.production`:

```env
# API Configuration
REACT_APP_TICK_BASE_URL=https://www.tickspot.com

# Optional: Analytics
REACT_APP_GA_TRACKING_ID=

# Optional: Error Tracking
REACT_APP_SENTRY_DSN=
```

**Note:** Variables must start with `REACT_APP_` to be included in build.

## Troubleshooting

### Service Worker Not Updating

**Solution:**
1. Increment version in `package.json`
2. Rebuild: `npm run build`
3. Clear browser cache
4. Hard refresh (Ctrl+Shift+R)

### Routing Issues (404 on Refresh)

**Problem:** Direct URLs return 404

**Solution:** Configure server to redirect all routes to index.html
- See platform-specific guides above

### PWA Not Installable

**Checklist:**
- [ ] Served over HTTPS
- [ ] manifest.json accessible
- [ ] Service worker registered
- [ ] Icons present (192x192, 512x512)
- [ ] Valid manifest fields

### CORS Errors

**Problem:** API requests blocked by CORS

**Solution:**
- Tick API should allow CORS by default
- Ensure requests include proper headers
- Check User-Agent header format

### Build Fails

**Common Issues:**

1. **Out of memory:**
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

2. **TypeScript errors:**
```bash
# Skip type checking (not recommended)
SKIP_PREFLIGHT_CHECK=true npm run build
```

3. **Missing dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Slow Load Times

**Optimizations:**

1. Enable Gzip compression on server
2. Use CDN for static assets
3. Implement code splitting
4. Optimize images
5. Enable browser caching

## Security Checklist

Pre-deployment security:

- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] No credentials in code
- [ ] Environment variables secured
- [ ] Dependencies updated
- [ ] CORS configured correctly
- [ ] CSP headers set (optional)
- [ ] Rate limiting (server-side)

## Backup Strategy

**What to Backup:**
- Source code (Git repository)
- Build artifacts (optional)
- Environment variables
- SSL certificates
- Server configuration

**Where:**
- Git: GitHub/GitLab/Bitbucket
- Builds: S3/Cloud Storage
- Configs: Encrypted repository

## Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Deploy to Netlify
      uses: netlify/actions/cli@master
      with:
        args: deploy --prod --dir=build
      env:
        NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
        NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

---

## Support

For deployment issues:

1. Check platform documentation
2. Review error logs
3. Test locally first
4. Verify DNS/SSL configuration
5. Check browser console

---

**Congratulations on deploying Tick Time Tracker!** 🚀

Your application is now live and ready for users to track their time efficiently.