'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { SubjectId } from '@/lib/types/branded';
import { TopicInput } from '@/components/TopicInput/TopicInput';
import { useRouter } from 'next/navigation';
import { slugifyTopic } from '@/lib/prompts/slugifier';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { SubjectWithVariables } from './HomePageClient';
import * as Icons from 'lucide-react';
import { soundEngine } from '@/lib/audio';
import { haptics } from '@/lib/haptics';

interface SegmentedControlProps {
  label: string;
  value: string;
  options: readonly string[] | string[];
  onChange: (value: string) => void;
}

function SegmentedControl({ label, value, options, onChange }: SegmentedControlProps) {
  return (
    <div className="w-full flex flex-col gap-1.5 select-none">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 select-none pl-1">
        {label}
      </span>
      <div className="w-full flex p-0.5 bg-zinc-100/60 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl backdrop-blur-md relative">
        {options.map((option) => {
          const isSelected = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                haptics.tap();
                onChange(option);
              }}
              className={`relative flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-300 z-10 cursor-pointer ${
                isSelected
                  ? 'text-zinc-900 dark:text-white font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId={`active-pill-${label}`}
                  className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-250/20 dark:border-zinc-700/50 rounded-lg z-[-1]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="truncate">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GenerateContainer({
  subjectId,
  subjects,
}: {
  subjectId: SubjectId | null;
  subjects: SubjectWithVariables[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'core' | 'clinical' | 'cognitive'>('core');

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('medprompts_user_preferences');
      if (saved) {
        try {
          setSelectedValues(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse user preferences from localStorage', e);
        }
      }
    }
  }, []);

  const handleValueChange = (key: string, value: string) => {
    setSelectedValues((prev) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('medprompts_user_preferences', JSON.stringify(updated));
      return updated;
    });
  };

  // Find dynamic variables for the currently selected subject
  const currentSubject = subjects.find((s) => s.id === subjectId);
  const rawVariables = currentSubject?.requiredVariables ?? [];
  const variables = rawVariables.filter((v) => v.key !== 'TOPIC');

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playSuccess();
    haptics.success();

    const updated = { ...selectedValues };
    variables.forEach((v) => {
      delete updated[v.key];
    });

    setSelectedValues(updated);
    localStorage.setItem('medprompts_user_preferences', JSON.stringify(updated));
  };

  const handleGenerate = (topic: string) => {
    if (!subjectId) return;
    const slug = slugifyTopic(topic);

    const params = new URLSearchParams();
    variables.forEach((v) => {
      const val = selectedValues[v.key] ?? v.defaultValue;
      // Convert UPPER_CASE key to camelCase for query parameter
      let paramKey = v.key.toLowerCase().replace(/_([a-z])/g, (_, char) => char.toUpperCase());

      // Backwards compatibility overrides
      if (v.key === 'OUTPUT_LANGUAGE') paramKey = 'lang';
      if (v.key === 'ANALOGY_DOMAIN') paramKey = 'analogy';
      if (v.key === 'MAX_REMEDIATION_CYCLES') paramKey = 'cycles';

      params.set(paramKey, val);
    });

    startTransition(() => {
      router.push(`/${subjectId}/${slug}?${params.toString()}`);
    });
  };

  // Categorize variables dynamically
  const getCategorizedVariables = () => {
    const core: typeof variables = [];
    const clinical: typeof variables = [];
    const cognitive: typeof variables = [];

    variables.forEach((v) => {
      const key = v.key;
      if (
        key.includes('CLINICAL') ||
        key.includes('VISUAL') ||
        key.includes('SPATIAL') ||
        key.includes('FRAME')
      ) {
        clinical.push(v);
      } else if (
        key.includes('ANALOGY') ||
        key.includes('MEMORY') ||
        key.includes('QUESTION') ||
        key.includes('GRAPH') ||
        key.includes('CYCLE')
      ) {
        cognitive.push(v);
      } else {
        core.push(v);
      }
    });

    return { core, clinical, cognitive };
  };

  const getPreferencesSummary = () => {
    const parts: string[] = [];
    variables.forEach((v) => {
      const val = selectedValues[v.key] ?? v.defaultValue;
      if (val === v.defaultValue) return;

      if (v.key === 'OUTPUT_LANGUAGE') {
        parts.push(val);
      } else if (v.key === 'CLINICAL_DEPTH') {
        parts.push(`${val} Depth`);
      } else if (v.key === 'EXAM_STYLE') {
        parts.push(`${val} Exam`);
      } else if (v.key === 'LEARNER_LEVEL') {
        parts.push(val);
      } else {
        parts.push(val);
      }
    });

    if (parts.length === 0) return 'Standard Config';
    if (parts.length > 3) {
      return parts.slice(0, 3).join(' • ') + ` + ${parts.length - 3} more`;
    }
    return parts.join(' • ');
  };

  const renderVariableControl = (variable: typeof variables[0]) => {
    const currentValue = selectedValues[variable.key] ?? variable.defaultValue;
    const options = variable.options ?? [];

    let icon = <Icons.Sliders className="w-4 h-4" />;
    if (variable.key.includes('LANGUAGE')) icon = <Icons.Globe className="w-4 h-4" />;
    else if (variable.key.includes('ANALOGY')) icon = <Icons.Sparkles className="w-4 h-4" />;
    else if (variable.key.includes('CYCLE') || variable.key.includes('FREQUENCY')) icon = <Icons.RotateCw className="w-4 h-4" />;
    else if (variable.key.includes('LEVEL') || variable.key.includes('DEPTH')) icon = <Icons.GraduationCap className="w-4 h-4" />;
    else if (variable.key.includes('CONTEXT')) icon = <Icons.Activity className="w-4 h-4" />;
    else if (variable.key.includes('STYLE')) icon = <Icons.Award className="w-4 h-4" />;
    else if (variable.key.includes('INTENSITY')) icon = <Icons.Zap className="w-4 h-4" />;
    else if (variable.key.includes('MODE') || variable.key.includes('FRAMING')) icon = <Icons.Eye className="w-4 h-4" />;

    if (options.length > 0 && options.length <= 3) {
      return (
        <SegmentedControl
          key={variable.key}
          label={variable.label}
          value={currentValue}
          options={options}
          onChange={(val) => handleValueChange(variable.key, val)}
        />
      );
    }

    return (
      <div key={variable.key} className="w-full">
        <CustomSelect
          label={variable.label}
          value={currentValue}
          options={options}
          onChange={(val) => handleValueChange(variable.key, val)}
          icon={icon}
        />
      </div>
    );
  };

  const { core, clinical, cognitive } = getCategorizedVariables();
  const summary = getPreferencesSummary();

  const activeVariables =
    activeTab === 'core' ? core : activeTab === 'clinical' ? clinical : cognitive;

  return (
    <div className="w-full flex flex-col items-center">
      <TopicInput key={subjectId || 'none'} subjectId={subjectId} onGenerate={handleGenerate}>
        {variables.length > 0 && (
          <div className="w-full border-t border-zinc-200/60 dark:border-zinc-800/60 pt-4 mt-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  haptics.tap();
                  setIsExpanded(!isExpanded);
                }}
                className="flex items-center gap-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer select-none"
              >
                <Icons.SlidersHorizontal
                  className={`w-4 h-4 transition-transform duration-300 text-zinc-400 dark:text-zinc-500 ${
                    isExpanded ? 'rotate-90 text-blue-500 dark:text-blue-400' : ''
                  }`}
                />
                <span>Customize Options</span>
                {!isExpanded && summary && (
                  <span className="hidden sm:inline text-xs font-normal text-zinc-400 dark:text-zinc-500 border-l border-zinc-200 dark:border-zinc-800 pl-2 ml-1">
                    {summary}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2">
                {currentSubject?.semver && (
                  <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/50 px-2 py-0.5 rounded-md border border-zinc-250/20 dark:border-zinc-700/50">
                    {currentSubject.label} v{currentSubject.semver}
                  </span>
                )}
                {isExpanded && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden mt-4"
                >
                  {variables.length <= 3 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                      {variables.map(renderVariableControl)}
                    </div>
                  ) : (
                    <div className="space-y-4 pb-2">
                      {/* Tab Switcher */}
                      <div className="flex border-b border-zinc-200/50 dark:border-zinc-800/50 px-0.5">
                        {([
                          { id: 'core', label: 'General', icon: <Icons.GraduationCap className="w-3.5 h-3.5" /> },
                          { id: 'clinical', label: 'Clinical', icon: <Icons.Activity className="w-3.5 h-3.5" /> },
                          { id: 'cognitive', label: 'Cognitive', icon: <Icons.Brain className="w-3.5 h-3.5" /> },
                        ] as const).map((tab) => {
                          const isActive = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                soundEngine.playClick();
                                haptics.tap();
                                setActiveTab(tab.id);
                              }}
                              className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors duration-300 cursor-pointer ${
                                isActive
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                              }`}
                            >
                               {tab.icon}
                              <span>{tab.label}</span>
                              {isActive && (
                                <motion.div
                                  layoutId="active-tab-indicator"
                                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"
                                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Tab Panel */}
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                      >
                        {activeVariables.map(renderVariableControl)}
                      </motion.div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </TopicInput>

      {isPending && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 w-full max-w-lg space-y-4"
        >
          <div className="flex flex-col items-center mb-2">
            <h3 className="text-zinc-800 dark:text-zinc-200 font-bold text-lg mb-1">Synthesizing Prompt</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm animate-pulse">Consulting medical frameworks...</p>
          </div>
          <SkeletonLoader variant="prompt" />
        </motion.div>
      )}
    </div>
  );
}
