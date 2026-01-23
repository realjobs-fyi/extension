// Tracking system for LinkedIn Job Filter Extension
// Tracks hidden jobs (promoted and banned words) for analytics

/**
 * Tracking entry structure:
 * {
 *   id: string,           // Locally generated unique ID
 *   reason: string,       // "promoted", "banned_word", or "banned_company"
 *   date: string,         // ISO 8601 date string
 *   word?: string         // Optional: banned word that triggered the filter (only for banned_word reason)
 *   company?: string       // Optional: banned company that triggered the filter (only for banned_company reason)
 * }
 */

import type {
  TrackingEntry,
  TrackingOptions,
  TrackingStatistics,
  BannedWordCount,
  BannedCompanyCount,
  JobTracker,
} from "../../types/track";

const STORAGE_KEY = "jobTrackingData";
const DATA_RETENTION_DAYS = 30;

/**
 * Generate a unique local ID for a tracking entry
 */
const generateLocalId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Get current date as ISO string (UTC)
 * Note: This stores in UTC, but we convert to local dates when grouping
 */
const getCurrentDate = (): string => {
  return new Date().toISOString();
};

/**
 * Convert UTC ISO string to local date string (YYYY-MM-DD)
 * This ensures dates are grouped by the user's local date, not UTC date
 */
const getLocalDateString = (isoString: string): string => {
  // Create Date object from ISO string (automatically converts to local timezone)
  const date = new Date(isoString);
  // Use local date methods (not UTC methods) to get the date in user's timezone
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate(); // getDate() returns local day
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * Check if a date is older than the retention period
 */
const isOlderThanRetention = (dateString: string): boolean => {
  const entryDate = new Date(dateString);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);
  return entryDate < cutoffDate;
};

/**
 * Clean up old tracking data (older than 30 days)
 */
const cleanupOldData = async (): Promise<number> => {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const trackingData = (result[STORAGE_KEY] as TrackingEntry[]) || [];
      const filteredData = trackingData.filter(
        (entry) => !isOlderThanRetention(entry.date)
      );

      chrome.storage.local.set({ [STORAGE_KEY]: filteredData }, () => {
        resolve(filteredData.length);
      });
    });
  });
};

/**
 * Track a hidden job
 * @param reason - "promoted", "banned_word", or "banned_company"
 * @param wordOrCompany - Banned word or company name (required if reason is "banned_word" or "banned_company")
 */
const trackHiddenJob = async (
  reason: "promoted" | "banned_word" | "banned_company",
  wordOrCompany?: string
): Promise<TrackingEntry> => {
  if (!reason) {
    console.warn("[Tracker] Invalid tracking data: reason is required", {
      reason,
    });
    return Promise.reject(new Error("Reason is required"));
  }

  if (reason === "banned_word" && !wordOrCompany) {
    console.warn("[Tracker] Banned word required for banned_word reason");
    return Promise.reject(
      new Error("Banned word is required for banned_word reason")
    );
  }

  if (reason === "banned_company" && !wordOrCompany) {
    console.warn("[Tracker] Company name required for banned_company reason");
    return Promise.reject(
      new Error("Company name is required for banned_company reason")
    );
  }

  // Clean up old data first
  await cleanupOldData();

  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const trackingData = (result[STORAGE_KEY] as TrackingEntry[]) || [];

      const entry: TrackingEntry = {
        id: generateLocalId(),
        reason: reason,
        date: getCurrentDate(),
      };

      if (reason === "banned_word" && wordOrCompany) {
        entry.word = wordOrCompany.toLowerCase().trim();
      }

      if (reason === "banned_company" && wordOrCompany) {
        entry.company = wordOrCompany.toLowerCase().trim();
      }

      trackingData.push(entry);

      chrome.storage.local.set({ [STORAGE_KEY]: trackingData }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(entry);
        }
      });
    });
  });
};

/**
 * Get all tracking data (with optional filtering)
 * @param options - Filter options
 * @returns Array of tracking entries
 */
const getTrackingData = async (
  options: TrackingOptions = {}
): Promise<TrackingEntry[]> => {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      let trackingData = (result[STORAGE_KEY] as TrackingEntry[]) || [];

      // Clean up old data
      trackingData = trackingData.filter(
        (entry) => !isOlderThanRetention(entry.date)
      );

      // Filter by reason if specified
      if (options.reason) {
        trackingData = trackingData.filter(
          (entry) => entry.reason === options.reason
        );
      }

      // Filter by days if specified
      if (options.days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - options.days);
        trackingData = trackingData.filter(
          (entry) => new Date(entry.date) >= cutoffDate
        );
      }

      resolve(trackingData);
    });
  });
};

/**
 * Get statistics for tracking data
 * @param options - Filter options (same as getTrackingData)
 * @returns Statistics object
 */
const getStatistics = async (
  options: TrackingOptions = {}
): Promise<TrackingStatistics> => {
  const data = await getTrackingData(options);

  const stats: TrackingStatistics = {
    total: data.length,
    promoted: data.filter((entry) => entry.reason === "promoted").length,
    bannedWords: data.filter((entry) => entry.reason === "banned_word").length,
    bannedCompanies: data.filter((entry) => entry.reason === "banned_company").length,
    byDate: {},
    bannedWordCounts: {},
    bannedCompanyCounts: {},
  };

  // Group by date (YYYY-MM-DD) - convert UTC dates to local dates
  data.forEach((entry) => {
    // Convert UTC ISO string to local date string (YYYY-MM-DD)
    const dateKey = getLocalDateString(entry.date);
    if (!stats.byDate[dateKey]) {
      stats.byDate[dateKey] = { promoted: 0, bannedWords: 0, bannedCompanies: 0, total: 0 };
    }
    stats.byDate[dateKey].total++;

    if (entry.reason === "promoted") {
      stats.byDate[dateKey].promoted++;
    } else if (entry.reason === "banned_word") {
      stats.byDate[dateKey].bannedWords++;
    } else if (entry.reason === "banned_company") {
      stats.byDate[dateKey].bannedCompanies++;
    }
  });

  // Count banned words
  data
    .filter((entry) => entry.reason === "banned_word" && entry.word)
    .forEach((entry) => {
      const word = entry.word!;
      stats.bannedWordCounts[word] = (stats.bannedWordCounts[word] || 0) + 1;
    });

  // Count banned companies
  data
    .filter((entry) => entry.reason === "banned_company" && entry.company)
    .forEach((entry) => {
      const company = entry.company!;
      stats.bannedCompanyCounts[company] = (stats.bannedCompanyCounts[company] || 0) + 1;
    });

  return stats;
};

/**
 * Get most common banned words
 * @param limit - Number of top words to return (default: 5)
 * @returns Array of { word, count } objects, sorted by count
 */
const getMostCommonBannedWords = async (
  limit = 5
): Promise<BannedWordCount[]> => {
  const stats = await getStatistics();
  const wordCounts = stats.bannedWordCounts;

  return Object.entries(wordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * Get most common banned companies
 * @param limit - Number of top companies to return (default: 5)
 * @returns Array of { company, count } objects, sorted by count
 */
const getMostCommonBannedCompanies = async (
  limit = 5
): Promise<BannedCompanyCount[]> => {
  const stats = await getStatistics();
  const companyCounts = stats.bannedCompanyCounts;

  return Object.entries(companyCounts)
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * Get time series data for graphs
 * @param options - Filter options
 * @returns Time series data grouped by date
 */
const getTimeSeriesData = async (
  options: TrackingOptions = {}
): Promise<
  Record<string, { promoted: number; bannedWords: number; bannedCompanies: number; total: number }>
> => {
  const stats = await getStatistics(options);
  return stats.byDate;
};

/**
 * Clear all tracking data
 */
const clearAllTrackingData = async (): Promise<boolean> => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: [] }, () => {
      resolve(true);
    });
  });
};


// Create the JobTracker object
const JobTracker: JobTracker = {
  trackHiddenJob,
  getTrackingData,
  getStatistics,
  getMostCommonBannedWords,
  getMostCommonBannedCompanies,
  getTimeSeriesData,
  clearAllTrackingData,
  cleanupOldData,
};

// Export for module usage
export default JobTracker;

// For content script usage, attach to window
if (typeof window !== "undefined") {
  window.JobTracker = JobTracker;
}
