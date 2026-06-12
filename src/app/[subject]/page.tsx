import { notFound, redirect } from 'next/navigation';
import { getSubject, SUBJECTS } from '@/lib/subjects';

export function generateStaticParams() {
  return SUBJECTS.map((s) => ({
    subject: s.slug,
  }));
}

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const resolvedParams = await params;
  const subject = getSubject(resolvedParams.subject);

  if (!subject) {
    notFound();
  }

  redirect(`/?subject=${subject.id}`);
}
