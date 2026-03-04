# Tick Time Tracker - React PWA

A Progressive Web App (PWA) for managing time entries with the Tick API. Features a horizontal timeline view, drag-and-drop functionality, and support for repeated entries.

## Features

- 🔐 **Authentication** - Secure login with Tick credentials
- 📅 **Infinite Timeline** - Smooth horizontal scrolling through unlimited days
- 🎯 **Visual Hours** - Entry cards sized proportionally to hours (max 8 hours per day)
- 🖱️ **Drag & Drop** - Move entries between dates
- ⌨️ **Drag & Copy** - Hold Ctrl while dragging to copy entries
- 🔁 **Repeated Entries** - Create entries across date ranges with frequency options
- ✏️ **Full CRUD** - Add, edit, and delete entries
- 📱 **PWA Support** - Install as standalone app, offline capability
- 💾 **Local Storage** - Automatic authentication persistence
- ♾️ **Smart Loading** - Days load dynamically as you scroll

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Tick account with API access

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tick-client
```

2. Install dependencies:
```bash
npm install
```

## Running the App

### Development Mode

```bash
npm start
```

Opens at [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
```

Creates optimized production build in the `build/` directory.

### Serve Production Build

```bash
npm install -g serve
serve -s build
```

## Usage

### Login

1. Enter your Tick email and password
2. If you have multiple subscriptions, select one
3. Credentials are stored securely in localStorage

### Timeline Navigation

- **Horizontal Scroll** - Scroll left or right to navigate through days
- **Go to Today** - Click to jump back to today's date (highlighted with 📍)
- **Infinite Loading** - Days automatically load as you scroll
- **Today Highlight** - Current day is highlighted with a border and pin icon

### Managing Entries

#### Add Entry
1. Click the "+ Add" button on any day column
2. Select a project (optional filter)
3. Choose a task
4. Enter hours (e.g., 2.5)
5. Add notes (optional)
6. Click "Create Entry"

#### Edit Entry
1. Click the ✏️ icon on any entry card
2. Modify the details
3. Click "Update Entry"

#### Delete Entry
1. Click the 🗑️ icon on any entry card
2. Confirm deletion

#### Drag & Drop
- **Move**: Drag an entry to another day
- **Copy**: Hold Ctrl/Cmd while dragging to copy instead of move

#### Repeated Entries
1. Click "+ Repeated Entry" in the header
2. Select task and hours
3. Choose frequency:
   - Daily
   - Weekdays Only (Mon-Fri)
   - Weekly
   - Monthly
4. Set start and end dates
5. Click "Create Repeated Entries"

## Project Structure

```
tick-client/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── Login.tsx
│   │   ├── Timeline.tsx
│   │   ├── TimelineEntry.tsx
│   │   ├── AddEntryModal.tsx
│   │   ├── EditEntryModal.tsx
│   │   └── AddRepeatedEntryModal.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   └── api.ts
│   ├── types/
│   │   └── tick.ts
│   ├── App.tsx
│   ├── App.css
│   ├── index.tsx
│   ├── index.css
│   ├── service-worker.ts
│   ├── serviceWorkerRegistration.ts
│   └── reportWebVitals.ts
├── package.json
├── tsconfig.json
└── README.md
```

## API Integration

The app uses the Tick API v2. See [API_ENDPOINTS.md](./API_ENDPOINTS.md) for full API documentation.

### Authentication

```typescript
POST https://www.tickspot.com/api/v2/roles.json
Authorization: Basic <base64(email:password)>
```

### API Endpoints

All authenticated requests use:
```
Base URL: https://www.tickspot.com/{subscriptionId}/api/v2
Authorization: Token token={api_token}
User-Agent: TickClient ({email})
```

## PWA Features

### Offline Support
- Service worker caches app shell and API responses
- Works offline after initial load
- Auto-syncs when connection restored

### Installable
- Install as standalone app on desktop and mobile
- Custom app icon and splash screen
- Runs in fullback mode without browser chrome

### Caching Strategy
- **App Shell**: Precached for instant loading
- **API Calls**: Network-first with cache fallback (5 min TTL)
- **Images**: Stale-while-revalidate (30 day TTL)

## Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **React DnD** - Drag and drop functionality
- **Workbox** - Service worker and PWA utilities
- **Create React App** - Build tooling

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers with PWA support

## Development

### Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from CRA (irreversible)

### Environment Variables

Create `.env.local` for custom configuration:

```env
REACT_APP_TICK_BASE_URL=https://www.tickspot.com
```

## Troubleshooting

### Authentication Issues
- Verify credentials are correct
- Check if API access is enabled for your account
- Ensure subscription is active

### Service Worker Not Updating
- Clear browser cache
- Unregister service worker in DevTools
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### Drag & Drop Not Working
- Ensure JavaScript is enabled
- Try using a supported browser
- Check console for errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- Check existing GitHub issues
- Create a new issue with detailed description
- Include browser version and error messages

## Roadmap

- [x] Infinite scroll timeline
- [ ] Dark mode support
- [ ] Keyboard shortcuts
- [ ] Export to CSV/PDF
- [ ] Time tracking timer
- [ ] Weekly/monthly reports
- [ ] Multi-user support
- [ ] Task templates
- [ ] Notifications
- [ ] Week/month view modes

---

**Note**: This is a third-party client for Tick. It is not officially affiliated with or endorsed by Tick.