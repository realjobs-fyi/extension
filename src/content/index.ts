// Content script for LinkedIn Job Filter Extension
// This script runs on LinkedIn job search pages and applies filters

import "../../types/track";
import "../utils/tracker";

// Extend Window interface for beforeunload listener tracking
declare global {
  interface Window {
    hasBeforeUnloadListener?: boolean;
  }
}

interface Settings {
  active?: boolean;
  hidePromotedPositions?: boolean;
  sortByDD?: boolean;
  bannedWords?: string[];
}

let isActive = false;
let hidePromotedPositions = true;
let sortByDD = true;
let bannedWords: string[] = [];
let observer: MutationObserver | null = null;

// Observer for the apply container (where the button should be added)
let applyContainerObserver: MutationObserver | null = null;

// Initialize and load settings
const init = (): void => {
  chrome.storage.sync.get(
    ["active", "hidePromotedPositions", "sortByDD", "bannedWords"],
    (result: Settings) => {
      isActive = result.active ?? false;
      hidePromotedPositions = result.hidePromotedPositions !== false;
      sortByDD = result.sortByDD !== false;
      bannedWords = result.bannedWords ?? [];

      if (isActive) {
        applyFilters();
        startObserving();
        startObservingApplyContainer(); // Add this line
      } else {
        stopObservingApplyContainer(); // Add this line
      }
    }
  );
};

// Check if URL needs sortBy=DD parameter
const checkAndUpdateSort = (): boolean => {
  if (
    sortByDD &&
    !window.location.href.includes("&sortBy=DD") &&
    !window.location.href.includes("?sortBy=DD")
  ) {
    const separator = window.location.href.includes("?") ? "&" : "?";
    const newUrl = window.location.href + separator + "sortBy=DD";
    window.location.href = newUrl;
    return true; // page will reload here
  }
  return false;
};

// Hide promoted job cards
const hidePromotedJobs = (): void => {
  if (!hidePromotedPositions) return;

  // Get all job cards using the data-occludable-job-id attribute
  const jobCards = document.querySelectorAll<HTMLLIElement>(
    "li[data-occludable-job-id]"
  );

  jobCards.forEach((card) => {
    // Skip if already hidden
    if (card.style.display === "none") return;

    // Look for spans containing "Promoted" text within this job card
    const spans = card.querySelectorAll("span");
    let isPromoted = false;

    spans.forEach((span) => {
      const spanText = span.textContent?.trim() ?? "";
      // Check if this span contains exactly "Promoted" (case-insensitive)
      if (spanText.toLowerCase() === "promoted") {
        isPromoted = true;
      }
    });

    // If promoted badge found, hide the entire job card
    if (isPromoted) {
      card.style.display = "none";
      console.log("[real jobs] Hidden promoted job");

      // Track the hidden job
      if (window.JobTracker) {
        window.JobTracker.trackHiddenJob("promoted").catch((err: unknown) => {
          console.warn("[real jobs] Failed to track promoted job:", err);
        });
      }
    }
  });
};

// Hide jobs with banned words in title
const hideBannedWordJobs = (): void => {
  if (!bannedWords || bannedWords.length === 0) return;

  // Get all job cards using the data-occludable-job-id attribute
  const jobCards = document.querySelectorAll<HTMLLIElement>(
    "li[data-occludable-job-id]"
  );

  jobCards.forEach((card) => {
    // Skip if already hidden
    if (card.style.display === "none") return;

    // Find job title element - check multiple possible selectors
    const titleElement = card.querySelector<HTMLElement>(
      ".job-card-list__title--link, " +
        ".job-card-container__link, " +
        ".job-card-list__title, " +
        'a[data-control-name="job_card_title"], ' +
        ".job-search-card__title, " +
        "h3.base-search-card__title"
    );

    if (titleElement) {
      const titleText = (titleElement.textContent ?? "").toLowerCase();
      let matchedWord: string | null = null;

      const shouldHide = bannedWords.some((word) => {
        const lowerWord = word.toLowerCase().trim();
        if (lowerWord.length > 0 && titleText.includes(lowerWord)) {
          matchedWord = word; // Store the matched word
          return true;
        }
        return false;
      });

      if (shouldHide && matchedWord) {
        card.style.display = "none";
        console.log(
          "[real jobs] Hidden job with banned word: " + titleText.trim()
        );

        // Track the hidden job
        if (window.JobTracker) {
          window.JobTracker.trackHiddenJob("banned_word", matchedWord).catch(
            (err: unknown) => {
              console.warn("[real jobs] Failed to track banned word job:", err);
            }
          );
        }
      }
    }
  });
};

// Apply all filters
const applyFilters = (): void => {
  if (!isActive) return;

  // Check and update sort parameter first (may cause reload)
  if (checkAndUpdateSort()) {
    return; // Page will reload
  }

  // Small delay to ensure DOM is ready
  setTimeout(() => {
    hidePromotedJobs();
    hideBannedWordJobs();
  }, 100);
};

// Start observing DOM changes for dynamically loaded content
const startObserving = (): void => {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((mutations) => {
    let shouldApplyFilters = false;

    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        // Check if new job cards were added
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Element node
            const element = node as Element;
            if (
              element.matches &&
              (element.matches("li[data-occludable-job-id]") ||
                element.matches(".job-card-container") ||
                element.matches(".jobs-search-results__list-item") ||
                element.querySelector("li[data-occludable-job-id]") !== null ||
                element.querySelector(".job-card-container") !== null)
            ) {
              shouldApplyFilters = true;
            }
          }
        });
      }
    });

    if (shouldApplyFilters) {
      // Debounce filter application
      if (window.filterTimeout) {
        clearTimeout(window.filterTimeout);
      }
      window.filterTimeout = setTimeout(() => {
        applyFilters();
      }, 300);
    }
  });

  // Observe the jobs list container
  const targetNode = document.querySelector(
    ".jobs-search-results-list, .scaffold-layout__list-container, ul.jobs-search__results-list"
  );

  if (targetNode) {
    observer.observe(targetNode, {
      childList: true,
      subtree: true,
    });
  } else {
    // Fallback: observe body if specific container not found
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
};

// Stop observing
const stopObserving = (): void => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
};

// Observer for the apply container (where the button should be added)
const startObservingApplyContainer = (): void => {
  if (applyContainerObserver) {
    applyContainerObserver.disconnect();
  }

  // Debounce function to avoid too many checks
  let checkTimeout: ReturnType<typeof setTimeout> | null = null;

  const checkAndAddButton = () => {
    if (checkTimeout) {
      clearTimeout(checkTimeout);
    }
    checkTimeout = setTimeout(() => {
      // Try multiple selectors for the apply container
      const applyContainers = document.querySelectorAll(
        ".jobs-s-apply.jobs-s-apply--fadein.inline-flex.mr2, " +
          ".jobs-s-apply.inline-flex.mr2, " +
          ".jobs-s-apply"
      );

      // Check if any container is missing the button
      let needsButton = false;
      applyContainers.forEach((container) => {
        if (!container.querySelector(".generate-resume-btn")) {
          needsButton = true;
        }
      });

      if (needsButton) {
      }
    }, 100);
  };

  applyContainerObserver = new MutationObserver((mutations) => {
    // Check if any added nodes might be the apply container or its parent
    let shouldCheck = false;

    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const element = node as Element;
            // Check if the added node is or contains the apply container
            if (
              element.matches?.(".jobs-s-apply") ||
              element.querySelector?.(".jobs-s-apply") ||
              element.closest?.(".jobs-s-apply")
            ) {
              shouldCheck = true;
            }
          }
        });
      }
    });

    if (shouldCheck) {
      checkAndAddButton();
    }
  });

  // Observe the document body for changes to the apply container
  applyContainerObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

};

const stopObservingApplyContainer = (): void => {
  if (applyContainerObserver) {
    applyContainerObserver.disconnect();
    applyContainerObserver = null;
  }
  // Clear the periodic check interval
  if ((window as any).applyContainerCheckInterval) {
    clearInterval((window as any).applyContainerCheckInterval);
    (window as any).applyContainerCheckInterval = null;
  }
};

// Listen for messages from service worker
chrome.runtime.onMessage.addListener(
  (
    request: { action: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: { success: boolean }) => void
  ) => {
    if (request.action === "applyFilters") {
      init();
      sendResponse({ success: true });
    }
    return true; // Keep message channel open for async response
  }
);

// Listen for storage changes (when settings are updated)
chrome.storage.onChanged.addListener(
  (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName === "sync") {
      if (changes.active) {
        isActive = changes.active.newValue ?? false;
        if (isActive) {
          init();
        } else {
          stopObserving();
          stopObservingApplyContainer(); // Add this line

          // Show all hidden jobs (remove display:none)
          const hiddenJobs = document.querySelectorAll<HTMLElement>(
            'li[data-occludable-job-id][style*="display: none"], .job-card-container[style*="display: none"]'
          );
          hiddenJobs.forEach((job) => {
            job.style.display = "";
          });
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

// Initialize when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Also initialize after a short delay to catch dynamically loaded content
setTimeout(init, 1000);

console.log("[real jobs] Content script loaded");
