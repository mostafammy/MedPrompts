'use client';

export interface HistoryItem {
  subjectId: string;
  subjectLabel: string;
  topic: string;
  slug: string;
  timestamp: number;
}

/**
 * Retrieves the recently generated medical prompts from LocalStorage.
 */
export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('medprompt_generation_history');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Adds a new item to the generation history, maintaining a maximum list size of 5 items.
 */
export function addHistoryItem(item: Omit<HistoryItem, 'timestamp'>) {
  if (typeof window === 'undefined') return;
  try {
    const history = getHistory();
    // Filter out duplicates (same subject and topic)
    const filtered = history.filter(
      (h) => !(h.subjectId === item.subjectId && h.topic.toLowerCase() === item.topic.toLowerCase())
    );
    const updated = [
      { ...item, timestamp: Date.now() },
      ...filtered
    ].slice(0, 5);
    
    localStorage.setItem('medprompt_generation_history', JSON.stringify(updated));
    
    // Dispatch a custom storage event to sync other listening components immediately
    window.dispatchEvent(new Event('medprompt_history_updated'));
  } catch {
    // Ignore storage blocker limits
  }
}
