# Getting Started with Tick Time Tracker PWA

Welcome to Tick Time Tracker! This guide will help you get the application up and running quickly.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [First Run](#first-run)
4. [Using the Application](#using-the-application)
5. [PWA Installation](#pwa-installation)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 16.x or higher)
  - Check: `node --version`
  - Download: https://nodejs.org/

- **npm** (usually comes with Node.js)
  - Check: `npm --version`

- **Tick Account**
  - You need an active Tick account with API access
  - Get your account at: https://www.tickspot.com/

## Installation

### Step 1: Clone or Download the Project

If you have the project as a zip file:
```bash
# Extract the zip file and navigate to the directory
cd tick-client
```

If cloning from Git:
```bash
git clone <repository-url>
cd tick-client
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React
- TypeScript
- React DnD (drag and drop)
- Workbox (PWA features)

**Note:** Installation may take 2-5 minutes depending on your internet connection.

## First Run

### Start the Development Server

```bash
npm start
```

The application will automatically open in your browser at:
```
http://localhost:3000
```

If it doesn't open automatically, manually navigate to that URL.

### Initial Setup

1. **Login Screen**
   - You'll see the Tick login screen
   - Enter your Tick email address
   - Enter your Tick password

2. **Subscription Selection** (if applicable)
   - If you have multiple Tick subscriptions, select one
   - This will be saved for future sessions

3. **Timeline View**
   - After successful login, you'll see the timeline view
   - Initial load may take a few seconds while fetching data

## Using the Application

### Understanding the Timeline

The timeline displays your time entries horizontally across multiple days:

- **Day Columns**: Each column represents one day
- **Entry Cards**: Each card shows a time entry
- **Card Height**: Proportional to hours logged (max 8 hours per day)
- **Progress Bar**: Shows total hours vs. 8-hour day

### Navigation Controls

**Top Navigation Bar:**
- `← Previous` - Move back in time
- `Today` - Jump to current date
- `Next →` - Move forward in time
- `View` dropdown - Choose 3, 5, 7, or 14 day view

### Adding Entries

**Single Entry:**
1. Click `+ Add` button on any day column
2. Select a project (optional filter)
3. Choose a task
4. Enter hours (e.g., 2.5)
5. Add notes (optional)
6. Click `Create Entry`

**Repeated Entry:**
1. Click `+ Repeated Entry` in the header
2. Select task and hours
3. Choose frequency:
   - **Daily** - Every day
   - **Weekdays Only** - Monday through Friday
   - **Weekly** - Once per week
   - **Monthly** - Once per month
4. Set start and end dates
5. Click `Create Repeated Entries`

### Editing Entries

1. Click the ✏️ (pencil) icon on any entry card
2. Modify the details
3. Click `Update Entry`

### Deleting Entries

1. Click the 🗑️ (trash) icon on any entry card
2. Confirm the deletion

### Drag and Drop
#### Move Entries

**Drag & Drop:**
- Click and drag the entry card to another day
- Release to drop and move the entry
- Simple and intuitive!

#### Duplicate Entries

**Drag to Copy:**
- Click and drag the "Copy" button (on the left side of each entry)
- Drag to any day (same day or different day)
- Release to create a duplicate
- The original entry stays in place

#### Resize Entry Hours

**Drag to Resize:**
- Hover over the bottom edge of any entry card
- Three dots (⋮⋮⋮) appear at the bottom
- Click and drag up (decrease) or down (increase) to adjust hours
- Changes happen in 30-minute increments (0.5h steps)
- A preview appears above the card showing "OldHours → NewHours"
- Release to save the new time automatically
- No need to click edit!

## PWA Installation

Install the app on your device for a native-like experience:

### Desktop (Chrome/Edge)

1. Look for the install icon in the address bar
2. Click it and select `Install`
3. The app will open in its own window
4. Find it in your applications menu

### Mobile (iOS Safari)

1. Tap the Share button
2. Scroll and tap `Add to Home Screen`
3. Name it and tap `Add`
4. Launch from your home screen

### Mobile (Android Chrome)

1. Tap the menu (three dots)
2. Select `Add to Home Screen`
3. Confirm the name and tap `Add`
4. Launch from your home screen

### PWA Benefits

- **Offline Access**: View cached data without internet
- **Faster Loading**: Pre-cached assets load instantly
- **Native Feel**: Full-screen experience without browser UI
- **Background Sync**: Data syncs when connection restored

## Troubleshooting

### Login Issues

**Problem:** "Invalid email or password"
- Verify your credentials are correct
- Try logging in at tickspot.com directly first
- Check if your account has API access enabled

**Problem:** Login succeeds but no subscriptions
- Contact Tick support to verify your account status
- Ensure you have an active subscription

### Data Not Loading

**Problem:** Timeline is empty
- Check your internet connection
- Verify the date range (try clicking "Today")
- Check browser console for errors (F12 → Console tab)

**Problem:** Tasks/Projects not appearing
- Ensure your Tick account has tasks and projects set up
- Refresh the page (the data loads on mount)

### Drag and Drop Not Working

**Problem:** Can't drag entries
- Ensure you're using a supported browser (Chrome, Edge, Firefox, Safari)
- Try refreshing the page
- Check if JavaScript is enabled
- Make sure you're clicking and holding on the entry card (not the Copy button)

**Problem:** Copy button not working
- Make sure you're dragging the "Copy" button (not clicking it)
- The Copy button is on the left side of each entry card
- Check browser console for errors (F12 → Console tab)
- Try refreshing the page

**Problem:** Resize not working
- Hover over the bottom edge of the entry card (not the middle)
- Look for the three dots (⋮⋮⋮) to appear
- Make sure you're dragging vertically (up/down not sideways)
- The resize handle only appears on hover

### Service Worker Issues

**Problem:** App not updating after changes
- Clear browser cache
- Unregister service worker:
  1. Open DevTools (F12)
  2. Go to Application → Service Workers
  3. Click "Unregister"
  4. Refresh the page

**Problem:** Offline mode not working
- Ensure you've visited the app online at least once
- Check Service Worker status in DevTools
- PWA features only work in production build or HTTPS

### Performance Issues

**Problem:** App is slow
- Try reducing the view days (use 3 or 5 day view)
- Clear browser cache
- Check if you have many entries (thousands)

**Problem:** High memory usage
- Refresh the page periodically
- Close unused browser tabs
- Use a smaller view range

## Building for Production

When you're ready to deploy:

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

### Serve Production Build Locally

```bash
npm install -g serve
serve -s build
```

Access at: http://localhost:3000

### Deploy to a Server

Upload the contents of the `build/` directory to your web server.

**Requirements:**
- HTTPS (required for PWA features)
- Support for client-side routing (redirect all routes to index.html)

## Advanced Configuration

### Environment Variables

Create `.env.local` in the project root:

```env
# Custom Tick API base URL (if using a proxy)
REACT_APP_TICK_BASE_URL=https://www.tickspot.com

# Enable service worker in development
REACT_APP_DEV_SERVICE_WORKER=true
```

Restart the dev server after changes.

### Customization

**Colors:**
Edit `src/lib/utils.ts` → `generateProjectColor()` to customize project colors.

**Max Hours:**
Edit `src/components/Timeline.tsx` → `MAX_DAY_HOURS` constant (default: 8).

**View Options:**
Edit `src/components/Timeline.tsx` → view dropdown options.

## Getting Help

### Common Resources

- **Tick API Docs**: See `API_ENDPOINTS.md`
- **React Docs**: https://react.dev/
- **React DnD**: https://react-dnd.github.io/react-dnd/

### Reporting Issues

When reporting issues, include:

1. Browser name and version
2. Operating system
3. Steps to reproduce
4. Error messages (check console)
5. Screenshots if applicable

### Feature Requests

Have an idea? Consider:

- Checking if it's already in the roadmap (README.md)
- Creating a detailed description of the feature
- Explaining the use case and benefits

## Next Steps

Now that you're set up:

1. ✅ Log in with your Tick credentials
2. ✅ Explore the timeline view
3. ✅ Create your first time entry
4. ✅ Try drag and drop
5. ✅ Install as PWA for easy access
6. ✅ Create a repeated entry for regular tasks

Happy time tracking! 🎉