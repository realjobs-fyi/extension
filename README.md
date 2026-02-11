<p align="center">
  <img src="/public/icon128.png" alt="Real Jobs Logo" width="120" />
</p>

<h1 align="center">Real Jobs Chrome Extension</h1>

<p align="center">
  A Chrome Extension (Manifest V3) that helps you filter out fake and low-quality jobs on LinkedIn. Built with TypeScript, React, Tailwind CSS, and Vite.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#project-structure">Project Structure</a> •
  <a href="#development">Development</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#chrome-extension-architecture">Architecture</a> •
  <a href="#browser-compatibility">Compatibility</a> •
  <a href="#license">License</a>
</p>

---

## Features

- **Hide Promoted Positions**: Automatically hide all promoted job listings
- **Sort by Most Recent**: Automatically sort job listings by date posted
- **Banned Words Filter**: Hide jobs with titles containing specific words (e.g., "junior", "senior", "staff", "commission only")
- **Ban Companies**: Block specific companies from appearing in job listings with a simple one-click ban button
- **Persistent Filtering**: Filters automatically re-apply on dynamic content changes and page navigation
- **Job Tracking & Analytics**: Track hidden jobs with detailed analytics including time series charts, banned word frequency, banned company statistics, and breakdown by reason
- **Type-Safe**: Full TypeScript support for better development experience

## Tech Stack

- **TypeScript** - Type-safe development
- **React 19** - Modern UI framework
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and dev server
- **CRXJS** - Chrome extension development plugin for Vite
- **Chrome Extension Manifest V3** - Latest extension API

## Installation

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/realjobs-fyi/extension.git
cd extension
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" (toggle in the top right)
6. Click "Load unpacked"
7. Select the `dist` directory from this project
8. The extension icon should appear in your Chrome toolbar

### Production Build

1. Build the extension:
```bash
npm run build
```

2. The built extension will be in the `dist` directory
3. Load the `dist` directory as an unpacked extension in Chrome

## Usage

1. Navigate to a LinkedIn job search page: `https://www.linkedin.com/jobs/search/*`
2. Click the extension icon in your Chrome toolbar
3. Click "Activate Filters" to enable filtering
4. The page will reload and filters will be applied automatically

### Banning Companies

To ban a company from appearing in your job listings:

1. Click on any job listing to view the job details
2. Look for the **Ban** button next to the company name
3. Click the button to ban the company
4. The company will be immediately added to your banned list and all their job listings will be hidden
5. To manage banned companies, go to the Options page (right-click extension icon → Options)

### Analytics

The extension provides detailed analytics in the Options page:

- **Hidden Jobs Over Time**: Time series chart showing jobs hidden over the selected period (7, 14, or 30 days)
- **Most Frequent Words**: Bar chart showing the top banned words that triggered filters
- **Hidden Jobs Breakdown**: Pie chart showing the distribution of hidden jobs by reason (Promoted, Banned Words, Banned Companies)

All analytics data is stored locally and automatically cleaned up after 30 days.

## Configuration

1. Right-click the extension icon and select "Options", or click "Configure Options" in the popup
2. Adjust settings:
   - **Hide Promoted Positions**: Toggle to show/hide promoted jobs
   - **Sort by Most Recent**: Toggle automatic sorting by date
   - **Banned Words**: Enter words to filter out from job titles
   - **Banned Companies**: View and manage companies you've banned. Companies can be removed by clicking the X button on each company tag

## How It Works

- The extension uses a **MutationObserver** to detect dynamically loaded job listings
- Filters are applied automatically when new content is loaded
- Settings are stored in Chrome's sync storage and persist across devices
- Job tracking data is stored locally for analytics (30-day retention)
- The extension only activates on LinkedIn job search pages
- Built with React for a modern, component-based architecture
- TypeScript ensures type safety throughout the codebase
- Company bans are stored in sync storage and work across all your devices

## Technical Details

- **Manifest Version**: 3
- **Content Script**: TypeScript-based script that runs on LinkedIn job search pages
- **Service Worker**: Background script (TypeScript) handles logic and message passing
- **Storage**: 
  - `chrome.storage.sync` for settings and banned companies (cross-device synchronization)
  - `chrome.storage.local` for job tracking data (local only, 30-day retention)
- **Build Tool**: Vite with CRXJS plugin for seamless extension development
- **Styling**: Tailwind CSS for utility-first styling

## Project Structure

```
├── manifest.config.ts              # Extension manifest (Manifest V3)
├── vite.config.ts                  # Vite + CRXJS build config
├── tsconfig.json                   # TypeScript config
├── package.json                    # Dependencies and scripts
│
├── public/                         # Static assets (icons, etc.)
│   ├── icon16.png, icon48.png, icon128.png
│   └── ...
│
├── types/                          # Shared TypeScript types
│   └── track.ts                    # Job tracking types
│
└── src/
    ├── assets/                     # Fonts and images
    │   ├── font/                   # Instrument Sans
    │   └── img/                    # Extension icons
    │
    ├── background/                 # Service worker
    │   └── index.ts                # Lifecycle, messages, storage, tabs
    │
    ├── content/                    # Injected into LinkedIn job search pages
    │   └── index.ts                # DOM filtering, ban buttons, observer
    │
    ├── popup/                      # Toolbar popup UI
    │   ├── index.html, main.tsx, App.tsx, Popup.tsx, index.css
    │
    ├── options/                    # Options/settings page
    │   ├── index.html, main.tsx, App.tsx, Options.tsx, index.css
    │
    ├── components/ui/              # Shared UI (Radix-based)
    │   ├── card.tsx, chart.tsx, select.tsx, switch.tsx, tooltip.tsx
    │
    ├── lib/                        # Shared utilities
    │   └── utils.ts                # cn() and helpers
    │
    └── utils/                      # Feature utilities
        ├── logger.ts               # Logging
        ├── number.ts               # Number helpers
        └── tracker.ts             # Job tracking (storage, analytics)
```

## Development

### Prerequisites

- **Node.js** 18+ (recommend 20 LTS)
- **npm** 9+

### Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server with HMR for popup, options, and content scripts |
| `npm run build` | Type-check and build extension into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run clean` | Remove `dist/` and build artifacts |

### Development Notes

- The extension uses **CRXJS Vite plugin** for seamless Chrome extension development
- Hot module reloading works for popup, options, and content scripts during development
- TypeScript strict mode is enabled for better type safety
- Tailwind CSS is configured via Vite plugin for optimal performance
- The `@` alias is configured to point to `src/` directory for cleaner imports

## Chrome Extension Architecture

This extension follows Chrome's Manifest V3 architecture with three main components: **Service Worker**, **Content Script**, and **Popup**. Understanding how these components work and communicate is essential for development.

### Component Overview

#### 1. Service Worker (Background Script)
**Location**: `src/background/index.ts`

The service worker is the extension's background process that:
- Runs independently of any web page or extension UI
- Handles extension lifecycle events (install, update)
- Manages message passing between components
- Monitors tab updates and navigation
- Performs periodic tasks (data cleanup)
- Manages extension state and settings

**Key Characteristics**:
- Event-driven: Responds to events but doesn't maintain persistent state
- Limited lifetime: May be terminated by Chrome when idle
- No DOM access: Cannot directly interact with web pages

#### 2. Content Script
**Location**: `src/content/index.ts`

The content script runs in the context of web pages:
- Injected into LinkedIn job search pages
- Has access to the page's DOM
- Can read and modify page content
- Runs in an isolated world (separate from page's JavaScript)
- Communicates with service worker via messages

**Key Characteristics**:
- Runs on specific pages (defined in manifest)
- Has access to both DOM and Chrome extension APIs
- Cannot access page's JavaScript variables/functions directly
- Can inject elements and styles into the page

#### 3. Popup
**Location**: `src/popup/App.tsx`

The popup is the UI that appears when clicking the extension icon:
- React-based user interface
- Provides controls to activate/deactivate filters
- Displays statistics and settings
- Opens options page and analytics

**Key Characteristics**:
- Only exists while open (closes when user clicks away)
- Has access to Chrome extension APIs
- Cannot directly access web page content
- Communicates via messages and storage

### Communication Patterns

The three components communicate using three main mechanisms:

#### 1. Message Passing (`chrome.runtime.sendMessage` / `chrome.runtime.onMessage`)

Messages are used for real-time communication between components.

**Popup → Service Worker**:
```typescript
// In popup (src/popup/App.tsx)
chrome.runtime.sendMessage(
  { action: "activate" },
  (response: MessageResponse) => {
    if (response?.success) {
      // Handle success
    }
  }
);
```

```typescript
// In service worker (src/background/index.ts)
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'activate') {
    chrome.storage.sync.set({ active: true }, () => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }
});
```

**Service Worker → Content Script**:
```typescript
// In service worker (src/background/index.ts)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('linkedin.com/jobs/search')) {
    chrome.tabs.sendMessage(tabId, { action: 'applyFilters' }).catch(() => {
      // Content script might not be ready, that's okay
    });
  }
});
```

```typescript
// In content script (src/content/index.ts)
chrome.runtime.onMessage.addListener(
  (request: { action: string }, _sender, sendResponse) => {
    if (request.action === "applyFilters") {
      init();
      sendResponse({ success: true });
    }
    return true; // Keep message channel open
  }
);
```

**Popup → Service Worker → Content Script** (Indirect):
```typescript
// Popup sends message to service worker
chrome.runtime.sendMessage({ action: "activate" }, () => {
  // Service worker sets storage, which triggers content script via storage listener
});
```

#### 2. Storage Events (`chrome.storage.onChanged`)

Storage events allow components to react to settings changes without direct messaging.

**Content Script Listening to Storage Changes**:
```typescript
// In content script (src/content/index.ts)
chrome.storage.onChanged.addListener(
  (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName === "sync") {
      if (changes.active) {
        isActive = changes.active.newValue ?? false;
        if (isActive) {
          init(); // Re-initialize filters
        } else {
          stopObserving();
          // Show all hidden jobs
        }
      } else {
        // Settings changed, reload filters
        if (isActive) {
          init();
        }
      }
    }
  }
);
```

**Options Page Saving Settings**:
```typescript
// In options page (src/options/Options.tsx)
chrome.storage.sync.set(
  {
    hidePromotedPositions: hidePromoted,
    sortByDD: sortByDD,
    bannedWords: bannedWordsArray,
    bannedCompanies: bannedCompaniesArray,
  },
  () => {
    // Settings saved - content script will automatically react via storage listener
  }
);
```

#### 3. Direct Storage Access

Components can directly read/write storage without events.

**Reading Settings**:
```typescript
// In content script (src/content/index.ts)
chrome.storage.sync.get(
  ["active", "hidePromotedPositions", "sortByDD", "bannedWords", "bannedCompanies"],
  (result: Settings) => {
    isActive = result.active ?? false;
    hidePromotedPositions = result.hidePromotedPositions !== false;
    bannedCompanies = result.bannedCompanies ?? [];
    // Apply settings...
  }
);
```

**Writing Tracking Data**:
```typescript
// In content script using tracker utility
window.JobTracker.trackHiddenJob("promoted").catch((err) => {
  console.warn("Failed to track:", err);
});

// Track banned company
window.JobTracker.trackHiddenJob("banned_company", "Company Name").catch((err) => {
  console.warn("Failed to track:", err);
});

// Tracker uses chrome.storage.local internally
chrome.storage.local.get([STORAGE_KEY], (result) => {
  const trackingData = result[STORAGE_KEY] || [];
  trackingData.push(newEntry);
  chrome.storage.local.set({ [STORAGE_KEY]: trackingData });
});
```

**Banning a Company**:
```typescript
// In content script (src/content/index.ts)
const banCompany = async (companyName: string) => {
  const normalizedName = companyName.toLowerCase().trim();
  bannedCompanies.push(normalizedName);
  
  // Save to chrome.storage.sync
  chrome.storage.sync.set({ bannedCompanies }, () => {
    // Company banned - filters will automatically hide their jobs
  });
};
```

### Communication Flow Examples

#### Activating Filters

1. **User clicks "Activate" in Popup**
   ```typescript
   // Popup sends message to service worker
   chrome.runtime.sendMessage({ action: "activate" });
   ```

2. **Service Worker receives message**
   ```typescript
   // Service worker sets active state
   chrome.storage.sync.set({ active: true }, () => {
     // Reloads current tab if on LinkedIn jobs page
     chrome.tabs.reload(tabs[0].id);
   });
   ```

3. **Content Script initializes on page load**
   ```typescript
   // Content script reads settings from storage
   chrome.storage.sync.get(["active", "bannedCompanies", ...], (result) => {
     if (result.active) {
       applyFilters();
       startObserving();
       addBanButtonToJobDetails(); // Add ban button to job detail pages
     }
   });
   ```

4. **Storage change triggers update** (if page already loaded)
   ```typescript
   // Content script listens for storage changes
   chrome.storage.onChanged.addListener((changes) => {
     if (changes.active) {
       // React to activation change
     }
   });
   ```

#### Updating Settings

1. **User changes settings in Options Page**
   ```typescript
   // Options page saves to storage
   chrome.storage.sync.set({ hidePromotedPositions: true });
   ```

2. **Content Script reacts automatically**
   ```typescript
   // Content script storage listener fires
   chrome.storage.onChanged.addListener((changes) => {
     if (changes.hidePromotedPositions || changes.bannedCompanies) {
       // Re-apply filters with new settings
       init();
     }
   });
   ```

#### Tab Navigation Handling

1. **Service Worker monitors tab updates**
   ```typescript
   // Service worker watches for completed page loads
   chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
     if (changeInfo.status === 'complete' && isLinkedInJobsPage(tab.url)) {
       // Send message to content script
       chrome.tabs.sendMessage(tabId, { action: 'applyFilters' });
     }
   });
   ```

2. **Content Script applies filters**
   ```typescript
   // Content script receives message and applies filters
   chrome.runtime.onMessage.addListener((request) => {
     if (request.action === 'applyFilters') {
       init();
     }
   });
   ```

### Important Notes

- **Async Communication**: Always use `return true` in message listeners when sending async responses
- **Storage Sync vs Local**: 
  - `chrome.storage.sync` - Settings that sync across devices (limited to 100KB)
  - `chrome.storage.local` - Local data like tracking (unlimited, but device-specific)
- **Content Script Isolation**: Content scripts run in an isolated world - they can't access page JavaScript variables, but can modify DOM
- **Service Worker Lifecycle**: Service workers may be terminated - don't rely on persistent state, use storage instead
- **Message Channel**: Keep message channels open for async operations by returning `true` from listeners

## Contributing

Contributions are welcome. Here’s how to get started:

1. **Fork and clone** the repo (see [Installation](#installation)).
2. **Create a branch**: `git checkout -b feature/your-feature` or `fix/your-fix`.
3. **Make your changes**: follow existing code style (TypeScript, React, Tailwind). Run `npm run build` to ensure it compiles.
4. **Test** by loading the `dist` folder in Chrome (`chrome://extensions` → Load unpacked) and trying the flow on LinkedIn job search.
5. **Commit** with clear messages, then open a **Pull Request** against `main`.
6. **Report bugs or ideas** via [GitHub Issues](https://github.com/realjobs-fyi/extension/issues).

### Quick tips for contributors

- **Popup/Options**: Edit files in `src/popup/` and `src/options/`; HMR will reload the extension UI.
- **Content script**: Changes in `src/content/index.ts` or `src/utils/tracker.ts` need a LinkedIn job search page refresh (or reload the extension).
- **Background**: Service worker changes often require a click on “Service worker” in `chrome://extensions` to reload, or reload the extension.
- **Types**: Shared types live in `types/` and `src/lib/`; keep Chrome API usage type-safe with `@types/chrome`.

## Publishing (for maintainers)

To ship a new version to the Chrome Web Store:

1. **Bump version** in `package.json` (the manifest uses this version).
2. **Build**: `npm run build`. This produces `dist/` and a store-ready zip in `release/` (e.g. `real-jobs-v0.0.1.zip`).
3. **Chrome Web Store**: [Developer Dashboard](https://chrome.google.com/webstore/devconsole) → your extension → “Upload new package” and upload the zip from `release/` (or zip `dist/` yourself).
4. **Submit for review** and fill in any required store fields (description, screenshots, privacy policy if needed).

Test in a clean profile with “Load unpacked” from `dist/` before uploading.

## Browser Compatibility

- **Chrome** (Manifest V3)
- **Edge** (Chromium-based)

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
