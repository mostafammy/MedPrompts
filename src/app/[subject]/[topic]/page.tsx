import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSubject } from '@/lib/subjects';
import { generatePrompt } from '@/lib/prompts';
import PromptView from '@/components/PromptView';

interface Props {
  params: Promise<{
    subject: string;
    topic: string;
  }>;
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const resolvedParams = await params;
  const subject = getSubject(resolvedParams.subject);
  if (!subject) return {};

  const displayTopic = decodeURIComponent(resolvedParams.topic).replace(/-/g, ' ');
  // Capitalize each word
  const titleTopic = displayTopic.replace(/\b\w/g, l => l.toUpperCase());

  const title = `${titleTopic} - ${subject.label} Prompt | MedPrompt`;
  const description = `Copy a board-exam ready prompt for ${titleTopic} in ${subject.label} and paste it into ChatGPT or Gemini.`;

  const ogUrl = new URL('https://medprompts.mostafayaser.earth/api/og');
  ogUrl.searchParams.set('subject', subject.label);
  ogUrl.searchParams.set('topic', titleTopic);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl.toString(), width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogUrl.toString()],
    },
  };
}

export default async function GeneratedPromptPage({ params }: Props) {
  const resolvedParams = await params;
  const subject = getSubject(resolvedParams.subject);
  
  if (!subject) {
    notFound();
  }

  // Convert slug back to a displayable topic string
  // Note: the original casing is lost in the URL slug, so we do our best here
  const displayTopic = decodeURIComponent(resolvedParams.topic)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  let promptText = '';
  try {
    promptText = generatePrompt(subject.id, displayTopic);
  } catch {
    notFound();
  }

  return (
    <main className="flex-1 flex flex-col bg-zinc-50 dark:bg-black">
      <PromptView 
        promptText={promptText} 
        subject={subject} 
        topic={displayTopic} 
      />
    </main>
  );
}
