import { MetadataRoute } from 'next';
import { SUBJECTS } from '@/lib/subjects';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://medprompts.mostafayaser.earth';

  // Base routes
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
  ];

  // Subject routes
  const subjectRoutes = SUBJECTS.map((subject) => ({
    url: `${baseUrl}/${subject.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [...routes, ...subjectRoutes];
}
