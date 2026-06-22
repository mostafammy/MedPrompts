'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { SubjectId } from '@/lib/types/branded';
import { SubjectGridClient } from '@/components/SubjectGrid/SubjectGridClient';
import { GenerateContainer } from './GenerateContainer';
import { usePromptHistory } from '@/hooks/usePromptHistory';
import { TemplateVariableDefinition } from '@/lib/prompts/variable-schema';

export interface SubjectWithVariables {
  id: string;
  label: string;
  icon: string;
  semver: string | null;
  requiredVariables: TemplateVariableDefinition[];
}
import { SwipeableItem } from '@/components/ui/SwipeableItem';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { haptics } from '@/lib/haptics';
import { soundEngine } from '@/lib/audio';


export function HomePageClient({ subjects }: { subjects: SubjectWithVariables[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<SubjectId | null>(null);
  const { history, bookmarks, isLoaded, removeHistoryItem, restoreHistoryItem, removeBookmark, restoreBookmark, toggleBookmark, isBookmarked } = usePromptHistory();
  const [activeTab, setActiveTab] = useState<'saved' | 'recent'>('saved');
  const [mounted, setMounted] = useState(false);

  // Read URL initially if present
  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject');
    if (subject) {

      setSelectedId(subject as SubjectId);
    }
  }, []);

  // Dispatch custom event when selected subject changes to update ambient background
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('medprompts-subject-change', { detail: selectedId });
      window.dispatchEvent(event);
    }
  }, [selectedId]);

  const handleSelect = useCallback((id: string) => {
    const typedId = id as SubjectId;
    setSelectedId(prev => prev === typedId ? null : typedId);
  }, []);

  if (subjects.length === 0) {
    return (
      <div className="w-full text-center p-8 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl text-zinc-500">
        No subjects found in the database. 
        <br />
        <span className="text-sm mt-2 block">If you are in production, ensure you have run the seed script against your remote Turso database.</span>
      </div>
    );
  }

  return (
    <>
      <section className={`w-full mb-10 transition-all duration-700 ease-in-out ${selectedId ? 'scale-[0.97] opacity-60 blur-[1px] translate-y-[-1rem]' : 'animate-fade-in-up delay-100'}`}>
        <div className="text-center mb-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            1. Choose a Subject
          </h2>
        </div>
        <SubjectGridClient
          subjects={subjects}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </section>

      <section className="w-full animate-fade-in-up delay-200">
        {selectedId && (
          <div className="text-center mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              2. Enter a Topic
            </h2>
          </div>
        )}
        <GenerateContainer subjectId={selectedId} subjects={subjects} />
      </section>

      {/* Saved & Recent Prompts Dashboard */}
      {mounted && isLoaded && (bookmarks.length > 0 || history.length > 0) && (
        <section className="w-full mt-16 max-w-4xl border-t border-zinc-200 dark:border-zinc-800/80 pt-12 animate-fade-in-up">
          <div className="flex flex-col items-center mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4">
              3. Your Dashboard
            </h2>
            
            {/* Tab Toggles */}
            <div className="flex gap-2 p-1 bg-zinc-200/60 dark:bg-zinc-900/60 backdrop-blur rounded-xl border border-zinc-300/40 dark:border-zinc-850/40">
              <button
                onClick={() => { haptics.tap(); setActiveTab('saved'); }}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer ${
                  activeTab === 'saved'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-md'
                    : 'text-zinc-550 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Saved Prompts ({bookmarks.length})
              </button>
              <button
                onClick={() => { haptics.tap(); setActiveTab('recent'); }}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer ${
                  activeTab === 'recent'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-md'
                    : 'text-zinc-555 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Recent History ({history.length})
              </button>
            </div>
          </div>

          {/* Grid Content */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeTab === 'saved' ? (
              bookmarks.length === 0 ? (
                <div className="col-span-full text-center py-12 px-4 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl text-zinc-500 text-sm">
                  No bookmarked prompts yet.
                  <span className="block text-xs text-zinc-400 dark:text-zinc-500 mt-1">Tap the star icon on any prompt to save it.</span>
                </div>
              ) : (
                bookmarks.map((item) => (
                  <SwipeableItem
                    key={item.id}
                    onSwipeLeft={() => {
                      removeBookmark(item.id);
                      toast.success('Removed bookmark', {
                        action: {
                          label: 'Undo',
                          onClick: () => restoreBookmark(item)
                        }
                      });
                    }}
                    leftActionComponent={
                      <div className="flex flex-col items-center">
                        <Icons.Trash2 className="w-5 h-5 text-white mb-1" />
                        <span className="text-white text-[10px] font-semibold uppercase">Delete</span>
                      </div>
                    }
                  >
                    <div
                      onClick={() => {
                        haptics.tap();
                        soundEngine.playClick();
                        router.push(`/${item.subject.toLowerCase()}/${item.topic.toLowerCase()}`);
                      }}
                      className="relative h-full group p-5 bg-white dark:bg-zinc-900/60 backdrop-blur border border-zinc-200 dark:border-zinc-800/80 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wide rounded-md">
                            {item.subject}
                          </span>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              haptics.warning();
                              soundEngine.playSwoop();
                              removeBookmark(item.id);
                              toast.success('Removed bookmark', {
                                action: {
                                  label: 'Undo',
                                  onClick: () => restoreBookmark(item)
                                }
                              });
                            }}
                            aria-label="Delete bookmark"
                            className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-805 transition-colors cursor-pointer"
                          >
                            <Icons.Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <h3 className="font-bold text-zinc-950 dark:text-white capitalize mt-3 text-base">
                          {item.topic}
                        </h3>
                        
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                          {item.promptText}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 pt-3 mt-4 text-[11px] text-zinc-450 dark:text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Icons.FileText className="w-3.5 h-3.5" />
                          {item.wordCount} words
                        </span>
                        <span>
                          {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </SwipeableItem>
                ))
              )
            ) : (
              history.length === 0 ? (
                <div className="col-span-full text-center py-12 px-4 border border-dashed border-zinc-300 dark:border-zinc-805 rounded-2xl text-zinc-500 text-sm">
                  No recently generated prompts yet.
                </div>
              ) : (
                history.map((item) => {
                  const bookmarked = isBookmarked(item.subject, item.topic);
                  return (
                    <SwipeableItem
                      key={item.id}
                      onSwipeLeft={() => {
                        removeHistoryItem(item.id);
                        toast.success('Removed from history', {
                          action: {
                            label: 'Undo',
                            onClick: () => restoreHistoryItem(item)
                          }
                        });
                      }}
                      onSwipeRight={() => {
                        toggleBookmark(item);
                        toast.success(bookmarked ? 'Removed bookmark' : 'Saved bookmark');
                      }}
                      leftActionComponent={
                        <div className="flex flex-col items-center">
                          <Icons.Trash2 className="w-5 h-5 text-white mb-1" />
                          <span className="text-white text-[10px] font-semibold uppercase">Delete</span>
                        </div>
                      }
                      rightActionComponent={
                        <div className="flex flex-col items-center">
                          <Icons.Star className="w-5 h-5 text-white mb-1" />
                          <span className="text-white text-[10px] font-semibold uppercase">{bookmarked ? 'Unsave' : 'Save'}</span>
                        </div>
                      }
                    >
                      <div
                        onClick={() => {
                          haptics.tap();
                          soundEngine.playClick();
                          router.push(`/${item.subject.toLowerCase()}/${item.topic.toLowerCase()}`);
                        }}
                        className="relative h-full group p-5 bg-white dark:bg-zinc-900/60 backdrop-blur border border-zinc-200 dark:border-zinc-800/80 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-4">
                            <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 text-[10px] font-extrabold uppercase tracking-wide rounded-md">
                              {item.subject}
                            </span>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                haptics.warning();
                                soundEngine.playSwoop();
                                removeHistoryItem(item.id);
                                toast.success('Removed from history', {
                                  action: {
                                    label: 'Undo',
                                    onClick: () => restoreHistoryItem(item)
                                  }
                                });
                              }}
                              aria-label="Delete history item"
                              className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              <Icons.Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <h3 className="font-bold text-zinc-950 dark:text-white capitalize mt-3 text-base">
                            {item.topic}
                          </h3>
                          
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                            {item.promptText}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/60 pt-3 mt-4 text-[11px] text-zinc-450 dark:text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Icons.FileText className="w-3.5 h-3.5" />
                            {item.wordCount} words
                          </span>
                          <span>
                            {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </SwipeableItem>
                  );
                })
              )
            )}
          </div>
        </section>
      )}
    </>
  );
}
