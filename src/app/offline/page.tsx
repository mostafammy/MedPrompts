import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-zinc-400 dark:text-zinc-600 mb-6">
        <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.364 5.636a9 9 0 00-12.728 0M12 2v2m0 16v2m10-10h-2M4 12H2m15.364 6.364l-1.414-1.414M5.636 5.636l1.414 1.414m12.728 0l-1.414 1.414M5.636 18.364l1.414-1.414" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
        You&apos;re Offline
      </h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-md">
        It looks like you&apos;ve lost your internet connection. We couldn&apos;t load this prompt because it hasn&apos;t been cached yet.
      </p>
      <Link 
        href="/"
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
      >
        Go to Home
      </Link>
    </main>
  );
}
