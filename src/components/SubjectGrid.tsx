import { SUBJECTS } from '@/lib/subjects';
import SubjectTile from './SubjectTile';

export default function SubjectGrid() {
  const sortedSubjects = [...SUBJECTS].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full max-w-5xl mx-auto px-4 py-8">
      {sortedSubjects.map((subject, index) => (
        <div
          key={subject.id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <SubjectTile subject={subject} />
        </div>
      ))}
    </div>
  );
}
