import { describe, it, expect, vi, beforeEach } from 'vitest';

let historyState: any[] = [];
let bookmarksState: any[] = [];
let isLoadedState = false;

const setHistoryMock = vi.fn((updater) => {
  if (typeof updater === 'function') {
    historyState = updater(historyState);
  } else {
    historyState = updater;
  }
});

const setBookmarksMock = vi.fn((updater) => {
  if (typeof updater === 'function') {
    bookmarksState = updater(bookmarksState);
  } else {
    bookmarksState = updater;
  }
});

const setIsLoadedMock = vi.fn((val) => {
  isLoadedState = val;
});

vi.mock('react', () => {
  let stateCallCount = 0;
  return {
    useState: (initial: any) => {
      const call = stateCallCount % 3;
      stateCallCount++;
      if (call === 0) {
        return [historyState, setHistoryMock];
      } else if (call === 1) {
        return [bookmarksState, setBookmarksMock];
      } else {
        return [isLoadedState, setIsLoadedMock];
      }
    },
    useEffect: (fn: any) => {
      fn();
    },
    useCallback: (fn: any) => fn,
  };
});

// Import the hook
import { usePromptHistory } from '../../src/hooks/usePromptHistory';

describe('usePromptHistory', () => {
  const localStorageMock: Record<string, string> = {};

  beforeEach(() => {
    historyState = [];
    bookmarksState = [];
    isLoadedState = false;
    setHistoryMock.mockClear();
    setBookmarksMock.mockClear();
    setIsLoadedMock.mockClear();
    
    // Clear localStorageMock
    for (const key in localStorageMock) {
      delete localStorageMock[key];
    }

    // Stub localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
    });
    
    vi.stubGlobal('window', {});
  });

  it('should initialize and load items from localStorage', () => {
    localStorageMock['medprompts_history'] = JSON.stringify([{ id: 'pathology:asthma', subject: 'pathology', topic: 'asthma', promptText: 'abc', wordCount: 10, timestamp: 123 }]);
    localStorageMock['medprompts_bookmarks'] = JSON.stringify([{ id: 'pathology:bronchitis', subject: 'pathology', topic: 'bronchitis', promptText: 'def', wordCount: 15, timestamp: 456 }]);

    usePromptHistory();
    
    expect(localStorage.getItem).toHaveBeenCalledWith('medprompts_history');
    expect(localStorage.getItem).toHaveBeenCalledWith('medprompts_bookmarks');
  });

  it('should add history items and save them to localStorage', () => {
    const hook = usePromptHistory();
    hook.addHistoryItem({
      subject: 'Pathology',
      topic: 'Asthma',
      promptText: 'Asthma prompt',
      wordCount: 100
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'medprompts_history',
      expect.stringContaining('asthma')
    );
  });

  it('should toggle bookmarks correctly', () => {
    const hook = usePromptHistory();
    const item = {
      subject: 'Pathology',
      topic: 'Asthma',
      promptText: 'Asthma prompt',
      wordCount: 100
    };

    hook.toggleBookmark(item);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'medprompts_bookmarks',
      expect.stringContaining('asthma')
    );
  });
});
