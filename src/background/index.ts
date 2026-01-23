interface Entry {
  id: string;
  reason: "promoted" | "banned_word";
  date: string;
  word?: string;
}

// Cleanup old tracking data (runs periodically)
const cleanupTrackingData = () => {
    chrome.storage.local.get(['jobTrackingData'], (result) => {
      const trackingData = result.jobTrackingData || [];
      const DATA_RETENTION_DAYS = 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);
      
      const filteredData = trackingData.filter((entry: Entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= cutoffDate;
      });
      
      if (filteredData.length !== trackingData.length) {
        chrome.storage.local.set({ jobTrackingData: filteredData }, () => {
          console.log(`[real jobs] Cleaned up ${trackingData.length - filteredData.length} old tracking entries`);
        });
      }
    });
  };
  
  // Initialize default settings on installation
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install' || details.reason === 'update') {
      chrome.storage.sync.get(['hidePromotedPositions', 'sortByDD', 'bannedWords', 'active'], (result) => {
        const defaults = {
          hidePromotedPositions: result.hidePromotedPositions !== undefined ? result.hidePromotedPositions : true,
          sortByDD: result.sortByDD !== undefined ? result.sortByDD : true,
          bannedWords: result.bannedWords || [],
          active: result.active !== undefined ? result.active : false,
          lang: result.lang !== undefined ? result.lang : 'en'
        };
        
        chrome.storage.sync.set(defaults, () => {
          console.log('[real jobs] Default settings initialized');
        });
      });
      
      // Clean up old tracking data on install/update
      cleanupTrackingData();
    }
  });
  
  // Clean up tracking data periodically (every hour)
  chrome.alarms.create('cleanupTrackingData', { periodInMinutes: 60 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanupTrackingData') {
      cleanupTrackingData();
    }
  });
  
  // Clean up on startup
  cleanupTrackingData();
  
  // Listen for messages from popup and content script
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'activate') {
      // Activate the extension
      chrome.storage.sync.set({ active: true }, () => {
        // Get current tab and reload if on LinkedIn jobs page
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].url && tabs[0].url.includes('linkedin.com/jobs/search')) {
            chrome.tabs.reload(tabs[0].id as number);
          }
        });
        sendResponse({ success: true });
      });
      return true; // Keep message channel open for async response
    }
    
    if (request.action === 'deactivate') {
      chrome.storage.sync.set({ active: false }, () => {
        sendResponse({ success: true });
      });
      return true;
    }
    
    if (request.action === 'getState') {
      chrome.storage.sync.get(['active'], (result) => {
        sendResponse({ active: result.active || false });
      });
      return true;
    }
    
    if (request.action === 'checkUrl') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const isValid = tabs[0] && tabs[0].url && tabs[0].url.match(/https:\/\/www\.linkedin\.com\/jobs\/search\/.*/);
        sendResponse({ isValid: !!isValid });
      });
      return true;
    }
  });
  
  // Listen for tab updates to apply filters on navigation
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.match(/https:\/\/www\.linkedin\.com\/jobs\/search\/.*/)) {
      chrome.storage.sync.get(['active', 'sortByDD'], (result) => {
        if (result.active) {
          // Check if sortByDD is enabled and URL doesn't have it
          if (result.sortByDD && !tab.url?.includes('&sortBy=DD') && !tab.url?.includes('?sortBy=DD')) {
            const separator = tab.url?.includes('?') ? '&' : '?';
            const newUrl = tab.url + separator + 'sortBy=DD' as string;
            chrome.tabs.update(tabId, { url: newUrl });
          } else {
            // Inject content script to apply filters
            chrome.tabs.sendMessage(tabId, { action: 'applyFilters' }).catch(() => {
              // Content script might not be ready, that's okay
            });
          }
        }
      });   
    }
  });
  
  
