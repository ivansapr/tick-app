# Changelog

All notable changes to Tick Time Tracker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2024

### ✨ Added

- **Infinite Scroll Timeline** - Smooth horizontal scrolling through unlimited days
  - Days load dynamically as you scroll left or right
  - Automatic loading of 14 days at a time when approaching the edge
  - Smart scroll position preservation when loading past dates
  - Initial view shows 14 days before and after today (29 days total)
  
- **Today Highlight** - Current date is now visually highlighted
  - Pin icon (📍) in the day label
  - Distinctive border and shadow
  - Different header background color
  - Easier to identify current day at a glance

- **Go to Today Button** - Quick navigation back to current date
  - Replaces previous/next navigation buttons
  - Smooth scroll animation to today's column
  - Shows helpful scroll hint text

- **Drag to Copy Button** - Intuitive duplication via drag
  - "Copy" button on left side of each entry card
  - Drag the Copy button to duplicate the entry
  - Can drag to same day or different day
  - More intuitive than click-based duplication
  - Similar to Notion and other modern apps

- **Resize to Adjust Hours** - Visual time adjustment via drag
  - Hover over bottom edge of entry card to reveal resize handle
  - Three dots (⋮⋮⋮) appear at the bottom
  - Drag up/down to adjust entry hours
  - 30-minute increments (0.5h steps)
  - Live preview shows "Old → New" hours while dragging
  - Automatic save on release
  - No need to open edit modal for quick time adjustments

- **Data Enrichment** - Entries now properly display task and project information
  - Automatic mapping of task and project objects to entries
  - Project colors assigned consistently
  - Full task and project details available on entry cards

- **Enhanced Drag & Drop**
  - Simplified to move-only behavior (more reliable)
  - Drop zones on entire day columns (not just entries)
  - Visual feedback when hovering over valid drop targets
  - Better UX for dragging to empty days

### 🔧 Changed

- **Drag behavior split into two modes**:
  - Drag entry card = Move entry
  - Drag "Copy" button = Create duplicate
- **No keyboard modifiers needed** - More intuitive and cross-platform
- Removed fixed day view selector (3/5/7/14 days)
- Removed Previous/Next navigation buttons
- Timeline now starts with 29 days visible (14 before, today, 14 after)
- Streamlined controls bar with centered layout
- Improved loading indicators for better user feedback

### 🐛 Fixed

- **Entry Display Issue** - Fixed entries not showing task and project names
  - Fixed ID type mismatch (string vs number) in task matching
  - Changed from `task.id.toString() === entry.task_id` to `Number(task.id) === entry.task_id`
  - Added proper data enrichment after API calls
  - Tasks now linked to their projects
  - Projects assigned unique colors
  
- **Drag behavior** - Simplified and made more reliable
  - Removed complex Ctrl/Cmd key detection
  - Drag now only moves entries
  - Added dedicated duplicate button for copying

- **Authentication Error** - Fixed undefined subscription name error
  - Added safe navigation operators
  - Improved fallback values
  - Better error handling in selectSubscription

### 📚 Documentation

- Updated README.md with infinite scroll feature
- Added scroll navigation instructions
- Updated feature list and roadmap
- Created CHANGELOG.md for version tracking

### 🏗️ Technical

- Refactored Timeline component for infinite scroll
- Created DayColumn component for better modularity
- Implemented useCallback for optimized data loading
- Added scroll event listeners with proper cleanup
- Improved state management for date ranges
- Added loading indicators for async operations
- Enhanced entry enrichment logic across all CRUD operations

---

## [0.1.0] - 2024

### 🎉 Initial Release

#### Core Features

- **Authentication System**
  - Login with Tick credentials
  - Multi-subscription support
  - Session persistence with localStorage
  - Automatic token management

- **Horizontal Timeline View**
  - Visual representation of time entries
  - Entry cards sized by hours
  - 8-hour day visualization
  - Progress bars for daily capacity

- **Entry Management (CRUD)**
  - Create new entries
  - Edit existing entries
  - Delete entries with confirmation
  - View entries in timeline format

- **Drag & Drop Interface**
  - Move entries between dates
  - Copy entries with Ctrl/Cmd modifier
  - Visual feedback during operations

- **Repeated Entries**
  - Bulk creation across date ranges
  - Multiple frequency options (Daily, Weekdays, Weekly, Monthly)
  - Entry count preview

- **PWA Capabilities**
  - Service Worker for offline support
  - Installable on desktop and mobile
  - Background sync ready
  - Web App Manifest

#### Components

- Login component
- Timeline component
- TimelineEntry component
- AddEntryModal component
- EditEntryModal component
- AddRepeatedEntryModal component
- AuthContext for state management

#### API Integration

- Complete Tick API v2 client
- TypeScript type definitions
- Error handling
- Authentication flow
- CRUD operations for entries, tasks, and projects

#### Documentation

- Comprehensive README
- Quick start guide
- Detailed setup instructions
- API reference
- Deployment guides for multiple platforms
- Troubleshooting guide

---

## Release Notes

### v0.2.0 - Infinite Scroll Update

This update transforms the timeline experience from a fixed-window view to an infinite, smooth-scrolling interface. Users can now browse through days seamlessly without clicking navigation buttons. The timeline intelligently loads more days as you scroll, creating a fluid and intuitive experience.

Key improvements include better visual identification of today's date, simplified drag-and-drop with a drag-to-copy button, resize functionality for quick time adjustments, and proper display of task/project information on entry cards. The "Copy" button and resize handle provide intuitive ways to manage entries without opening modal dialogs - similar to modern apps like Notion and Linear.

### v0.1.0 - Initial Release

First production release of Tick Time Tracker PWA. Includes all core features for time tracking, drag-and-drop entry management, repeated entry creation, and PWA capabilities for offline use and native app installation.

---

## Upcoming Features

See [README.md](./README.md#roadmap) for planned features and improvements.

## Contributing

See [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md#contributing-guidelines) for contribution guidelines.

---

**Project**: Tick Time Tracker  
**License**: MIT  
**Repository**: [GitHub URL]