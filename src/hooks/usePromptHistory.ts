'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SavedPromptItem {
  id: string; // subject + ':' + topic
  subject: string;
  topic: string;
  timestamp: number;
  wordCount: number;
  promptText: string;
}

const HISTORY_KEY = 'medprompts_history';
const BOOKMARKS_KEY = 'medprompts_bookmarks';
const MAX_HISTORY = 30;

export function usePromptHistory() {
  const [history, setHistory] = useState<SavedPromptItem[]>([]);
  const [bookmarks, setBookmarks] = useState<SavedPromptItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_KEY);
      const storedBookmarks = localStorage.getItem(BOOKMARKS_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
      if (storedBookmarks) {
        setBookmarks(JSON.parse(storedBookmarks));
      }
    } catch (e) {
      console.error('Failed to load history/bookmarks from localStorage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const addHistoryItem = useCallback((item: Omit<SavedPromptItem, 'timestamp' | 'id'>) => {
    if (typeof window === 'undefined') return;
    
    const timestamp = Date.now();
    const id = `${item.subject.toLowerCase()}:${item.topic.toLowerCase()}`;
    const newItem: SavedPromptItem = { ...item, id, timestamp };

    setHistory(prev => {
      // Remove any existing duplicate of this subject + topic
      const filtered = prev.filter(p => p.id !== id);
      // Prepend the new one, and cap at MAX_HISTORY
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save history item:', e);
      }
      return updated;
    });
  }, []);

  const removeHistoryItem = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to remove history item:', e);
      }
      return updated;
    });
  }, []);

  const restoreHistoryItem = useCallback((item: SavedPromptItem) => {
    setHistory(prev => {
      const exists = prev.some(p => p.id === item.id);
      if (exists) return prev;
      
      const updated = [item, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to restore history item:', e);
      }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.error('Failed to clear history:', e);
    }
  }, []);

  const toggleBookmark = useCallback((item: Omit<SavedPromptItem, 'timestamp' | 'id'>) => {
    if (typeof window === 'undefined') return;

    const id = `${item.subject.toLowerCase()}:${item.topic.toLowerCase()}`;
    
    setBookmarks(prev => {
      const exists = prev.some(p => p.id === id);
      let updated: SavedPromptItem[];
      
      if (exists) {
        updated = prev.filter(p => p.id !== id);
      } else {
        const timestamp = Date.now();
        const newItem: SavedPromptItem = { ...item, id, timestamp };
        updated = [newItem, ...prev];
      }

      try {
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update bookmarks:', e);
      }
      return updated;
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const updated = prev.filter(item => item.id !== id);
      try {
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to remove bookmark:', e);
      }
      return updated;
    });
  }, []);

  const restoreBookmark = useCallback((item: SavedPromptItem) => {
    setBookmarks(prev => {
      const exists = prev.some(p => p.id === item.id);
      if (exists) return prev;
      
      const updated = [item, ...prev].sort((a, b) => b.timestamp - a.timestamp);
      try {
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to restore bookmark:', e);
      }
      return updated;
    });
  }, []);

  const isBookmarked = useCallback((subject: string, topic: string) => {
    const id = `${subject.toLowerCase()}:${topic.toLowerCase()}`;
    return bookmarks.some(item => item.id === id);
  }, [bookmarks]);

  return {
    history,
    bookmarks,
    isLoaded,
    addHistoryItem,
    removeHistoryItem,
    restoreHistoryItem,
    clearHistory,
    toggleBookmark,
    removeBookmark,
    restoreBookmark,
    isBookmarked,
  };
}
