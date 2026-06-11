import { Subject } from '@/lib/subjects';
import CopyButton from './CopyButton';
import DeepLinkButton from './DeepLinkButton';

interface PromptViewProps {
  promptText: string;
  subject: Subject;
  topic: string;
}

export default function PromptView({ promptText, subject, topic }: PromptViewProps) {
  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 font-medium mb-3">
          <span className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-xs uppercase tracking-wider">
            {subject.label}
          </span>
          <span>/</span>
          <span className="text-zinc-900 dark:text-zinc-100">{topic}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight">
          Your prompt is ready
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-300">
          Copy the prompt below and paste it into ChatGPT, Gemini, or Claude.
        </p>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden flex flex-col mb-6 transition-colors">
        <div className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400 dark:bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-400 dark:bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-400 dark:bg-green-500/80"></div>
          </div>
          <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 select-none">
            {promptText.length} chars
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 relative">
          <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none"></div>
          <pre className="font-mono text-sm sm:text-base text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed pb-4">
            {promptText}
          </pre>
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent z-10 pointer-events-none"></div>
        </div>
      </div>

      <div className="mt-auto pt-4 flex flex-col sm:flex-row gap-4 items-center">
        <CopyButton textToCopy={promptText} subjectId={subject.id} topic={topic} />
        
        <div className="flex w-full gap-4">
          <DeepLinkButton 
            textToCopy={promptText} 
            subjectId={subject.id} 
            topic={topic} 
            targetApp="chatgpt" 
            label="ChatGPT" 
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.073zm-9.022 12.108a4.4735 4.4735 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-2.1466zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829 14.6174 7.2144a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.3927-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L8.809 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.4592a.7948.7948 0 0 0-.3927.6813v6.7225zm1.0855-3.0941l2.6086-1.5034 2.6086 1.5034v3.0069l-2.6086 1.5034-2.6086-1.5034v-3.0069z" />
              </svg>
            }
          />
          <DeepLinkButton 
            textToCopy={promptText} 
            subjectId={subject.id} 
            topic={topic} 
            targetApp="gemini" 
            label="Gemini" 
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2ZM20 6C20 8.20914 18.2091 10 16 10C18.2091 10 20 11.7909 20 14C20 11.7909 21.7909 10 24 10C21.7909 10 20 8.20914 20 6ZM8 18C8 19.1046 7.10457 20 6 20C7.10457 20 8 20.8954 8 22C8 20.8954 8.89543 20 10 20C8.89543 20 8 19.1046 8 18Z"/>
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}
