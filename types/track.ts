// Type definitions for job tracking

// this interface is getting too generic, I don't like this
// should I break it down into smaller interfaces? idk I'll think about it later
export interface TrackingEntry {
  id: string
  reason: 'promoted' | 'banned_word' | 'banned_company'
  date: string
  word?: string
  company?: string
}

export interface TrackingOptions {
  reason?: 'promoted' | 'banned_word' | 'banned_company'
  days?: number
}

export interface TrackingStatistics {
  total: number
  promoted: number
  bannedWords: number
  bannedCompanies: number
  byDate: Record<string, { promoted: number; bannedWords: number; bannedCompanies: number; total: number }>
  bannedWordCounts: Record<string, number>
  bannedCompanyCounts: Record<string, number>
}

export interface BannedWordCount {
  word: string
  count: number
}

export interface BannedCompanyCount {
  company: string
  count: number
}

export interface JobTracker {
  trackHiddenJob(reason: 'promoted' | 'banned_word' | 'banned_company', wordOrCompany?: string): Promise<TrackingEntry>
  getTrackingData(options?: TrackingOptions): Promise<TrackingEntry[]>
  getStatistics(options?: TrackingOptions): Promise<TrackingStatistics>
  getMostCommonBannedWords(limit?: number): Promise<BannedWordCount[]>
  getMostCommonBannedCompanies(limit?: number): Promise<BannedCompanyCount[]>
  getTimeSeriesData(options?: TrackingOptions): Promise<Record<string, { promoted: number; bannedWords: number; bannedCompanies: number; total: number }>>
  clearAllTrackingData(): Promise<boolean>
  cleanupOldData(): Promise<number>
}

declare global {
  interface Window {
    JobTracker?: JobTracker
    filterTimeout?: ReturnType<typeof setTimeout>
  }
}

export {}
