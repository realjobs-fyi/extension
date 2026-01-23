// Type definitions for job tracking

export interface TrackingEntry {
  id: string
  reason: 'promoted' | 'banned_word'
  date: string
  word?: string
}

export interface TrackingOptions {
  reason?: 'promoted' | 'banned_word'
  days?: number
}

export interface TrackingStatistics {
  total: number
  promoted: number
  bannedWords: number
  byDate: Record<string, { promoted: number; bannedWords: number; total: number }>
  bannedWordCounts: Record<string, number>
}

export interface BannedWordCount {
  word: string
  count: number
}

export interface JobTracker {
  trackHiddenJob(reason: 'promoted' | 'banned_word', word?: string): Promise<TrackingEntry>
  getTrackingData(options?: TrackingOptions): Promise<TrackingEntry[]>
  getStatistics(options?: TrackingOptions): Promise<TrackingStatistics>
  getMostCommonBannedWords(limit?: number): Promise<BannedWordCount[]>
  getTimeSeriesData(options?: TrackingOptions): Promise<Record<string, { promoted: number; bannedWords: number; total: number }>>
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
