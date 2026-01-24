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
  bannedCompanies?: string[];
}

let isActive = false;
let hidePromotedPositions = true;
let sortByDD = true;
let bannedWords: string[] = [];
let bannedCompanies: string[] = [];
let observer: MutationObserver | null = null;

// Observer for the apply container (where the button should be added)
let applyContainerObserver: MutationObserver | null = null;

// Initialize and load settings
const init = (): void => {
  chrome.storage.sync.get(
    ["active", "hidePromotedPositions", "sortByDD", "bannedWords", "bannedCompanies"],
    (result: Settings) => {
      isActive = result.active ?? false;
      hidePromotedPositions = result.hidePromotedPositions !== false;
      sortByDD = result.sortByDD !== false;
      bannedWords = result.bannedWords ?? [];
      bannedCompanies = result.bannedCompanies ?? [];

      if (isActive) {
        applyFilters();
        startObserving();
        startObservingApplyContainer();
        addBanButtonToJobDetails();
      } else {
        stopObservingApplyContainer();
        removeBanButtons();
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

// Hide jobs from banned companies in search results
const hideBannedCompanyJobs = (): void => {
  if (!bannedCompanies || bannedCompanies.length === 0) return;

  // Get all job cards using the data-occludable-job-id attribute
  const jobCards = document.querySelectorAll<HTMLLIElement>(
    "li[data-occludable-job-id]"
  );

  jobCards.forEach((card) => {
    // Skip if already hidden
    if (card.style.display === "none") return;

    // Find company name element - uses the artdeco-entity-lockup__subtitle class
    const companyElement = card.querySelector<HTMLElement>(
      ".artdeco-entity-lockup__subtitle span, " +
        ".job-card-container__primary-description, " +
        ".job-card-container__company-name"
    );

    if (companyElement) {
      const companyText = (companyElement.textContent ?? "").toLowerCase().trim();
      let matchedCompany: string | null = null;

      const shouldHide = bannedCompanies.some((company) => {
        const lowerCompany = company.toLowerCase().trim();
        if (lowerCompany.length > 0 && companyText.includes(lowerCompany)) {
          matchedCompany = company;
          return true;
        }
        return false;
      });

      if (shouldHide && matchedCompany) {
        card.style.display = "none";
        console.log(
          "[real jobs] Hidden job from banned company: " + companyText
        );

        // Track the hidden job
        if (window.JobTracker) {
          window.JobTracker.trackHiddenJob("banned_company", matchedCompany).catch(
            (err: unknown) => {
              console.warn("[real jobs] Failed to track banned company job:", err);
            }
          );
        }
      }
    }
  });
};

// Get company name from DOM (reads fresh from the current page state)
const getCompanyNameFromDOM = (button: HTMLElement): string | null => {
  // First try to find the company container in the same parent as the button
  const parentContainer = button.closest(".display-flex");
  const companyContainer = parentContainer?.querySelector<HTMLElement>(
    ".job-details-jobs-unified-top-card__company-name"
  ) || document.querySelector<HTMLElement>(
    ".job-details-jobs-unified-top-card__company-name"
  );

  if (!companyContainer) {
    console.warn("[real jobs] Could not find company container");
    return null;
  }

  // Get company name from the link
  const companyLink = companyContainer.querySelector("a");
  if (!companyLink) {
    console.warn("[real jobs] Could not find company link");
    return null;
  }

  const companyName = (companyLink.textContent ?? "").trim();
  if (!companyName) {
    console.warn("[real jobs] Company name is empty");
    return null;
  }

  console.log("[real jobs] Reading company name from DOM:", companyName);
  return companyName;
};

// Add ban button to company name in job details view
const addBanButtonToJobDetails = (): void => {
  const companyContainer = document.querySelector<HTMLElement>(
    ".job-details-jobs-unified-top-card__company-name"
  );

  if (!companyContainer) return;

  const parentContainer = companyContainer.closest(".display-flex");
  
  if (parentContainer) {
    const existingButtons = parentContainer.querySelectorAll(".real-jobs-ban-btn");
    existingButtons.forEach(btn => btn.remove());
  }
  
  const companyLink = companyContainer.querySelector("a");
  if (!companyLink) return;

  const companyName = (companyLink.textContent ?? "").trim();
  if (!companyName) return;

  const isAlreadyBanned = bannedCompanies.some(
    (c) => c.toLowerCase() === companyName.toLowerCase()
  );

  const banButton = document.createElement("button");
  banButton.className = "real-jobs-ban-btn";
  
  // Define Colors (Mapping Tailwind: red-500, red-100, green-500, etc.)
  const colors = {
    redText: "#ef4444",
    redBg: "#fee2e2",
    redHover: "#fecaca",
    greenText: "#22c55e",
    greenBg: "#dcfce7",
  };

  // Create SVG Icon
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" 
      style="margin-right: 4px; display: inline-block; vertical-align: middle;">
      ${isAlreadyBanned 
        ? '<polyline points="20 6 9 17 4 12"></polyline>' // Checkmark for banned
        : '<path d="M4.929 4.929 19.07 19.071"/><circle cx="12" cy="12" r="10"/>' // Ban icon
      }
    </svg>
  `;

  banButton.innerHTML = `${svgIcon}<span>${isAlreadyBanned ? "Banned" : "Ban"}</span>`;
  banButton.title = isAlreadyBanned ? `${companyName} is banned` : `Ban ${companyName}`;
  banButton.disabled = isAlreadyBanned;

  // Modern Tailwind Styling converted to CSS
  banButton.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 1px;
    margin-left: 12px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    border-radius: 9999px; /* rounded-xl/full */
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: ${isAlreadyBanned ? "default" : "pointer"};
    border: 1px solid ${isAlreadyBanned ? colors.greenText : colors.redText};
    background-color: ${isAlreadyBanned ? colors.greenBg : colors.redBg};
    color: ${isAlreadyBanned ? colors.greenText : colors.redText};
    vertical-align: middle;
    outline: none;
  `;

  if (!isAlreadyBanned) {
    banButton.addEventListener("mouseenter", () => {
      banButton.style.backgroundColor = colors.redHover;
    });
    banButton.addEventListener("mouseleave", () => {
      banButton.style.backgroundColor = colors.redBg;
    });
    banButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const currentCompanyName = getCompanyNameFromDOM(banButton);
      if (currentCompanyName) banCompany(currentCompanyName, banButton);
    });
  }

  if (parentContainer) {
    parentContainer.appendChild(banButton);
  } else {
    companyContainer.parentElement?.appendChild(banButton);
  }
};

// Ban a company
const banCompany = async (companyName: string, button: HTMLButtonElement): Promise<void> => {
  const normalizedName = companyName.toLowerCase().trim();
  
  console.log("[real jobs] Banning company - Original:", companyName, "Normalized:", normalizedName);

  // Check if already banned
  if (bannedCompanies.some((c) => c.toLowerCase() === normalizedName)) {
    console.log("[real jobs] Company already banned:", companyName);
    return;
  }

  // Add to local list
  bannedCompanies.push(normalizedName);
  console.log("[real jobs] Updated local bannedCompanies array:", bannedCompanies);

  // Save to chrome.storage.sync
  chrome.storage.sync.set({ bannedCompanies }, () => {
    if (chrome.runtime.lastError) {
      console.error("[real jobs] Error saving banned company:", chrome.runtime.lastError);
      return;
    }
    console.log("[real jobs] Company banned and saved to storage:", companyName, "Array:", bannedCompanies);

    // Update button appearance
    button.innerHTML = "✓ Banned";
    button.title = `${companyName} is banned`;
    button.disabled = true;
    button.style.borderColor = "#22c55e";
    button.style.backgroundColor = "#dcfce7";
    button.style.color = "#15803d";
    button.style.cursor = "default";

    // Apply filters to hide jobs from this company
    hideBannedCompanyJobs();
  });
};

// Remove all ban buttons (when extension is deactivated)
const removeBanButtons = (): void => {
  const banButtons = document.querySelectorAll(".real-jobs-ban-btn");
  banButtons.forEach((btn) => btn.remove());
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
    hideBannedCompanyJobs();
    addBanButtonToJobDetails();
  }, 100);
};

// Start observing DOM changes for dynamically loaded content
const startObserving = (): void => {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((mutations) => {
    let shouldApplyFilters = false;
    let shouldAddBanButton = false;

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
            // Check if job details view was loaded (for ban button)
            if (
              element.matches?.(".job-details-jobs-unified-top-card__company-name") ||
              element.querySelector?.(".job-details-jobs-unified-top-card__company-name")
            ) {
              shouldAddBanButton = true;
            }
          }
        });
      }
    });

    if (shouldApplyFilters || shouldAddBanButton) {
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
          stopObservingApplyContainer();
          removeBanButtons();

          // Show all hidden jobs (remove display:none)
          const hiddenJobs = document.querySelectorAll<HTMLElement>(
            'li[data-occludable-job-id][style*="display: none"], .job-card-container[style*="display: none"]'
          );
          hiddenJobs.forEach((job) => {
            job.style.display = "";
          });
        }
      } else if (changes.bannedCompanies) {
        // Banned companies list changed, update local list and apply filters
        bannedCompanies = changes.bannedCompanies.newValue ?? [];
        if (isActive) {
          hideBannedCompanyJobs();
          addBanButtonToJobDetails();
        }
      } else {
        // Other settings changed, reload filters
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
