/* eslint-disable @typescript-eslint/no-explicit-any */
import { Search } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";
import { createClient } from "@/lib/supabase-server";
import { generateSlug } from "@/lib/slug";

interface SearchPageProps {
  params: Promise<{
    term: string;
  }>;
}

export default async function SearchPage({ params }: SearchPageProps) {
  const { term } = await params;
  const decodedTerm = decodeURIComponent(term);
  
  const supabase = await createClient();
  let query = supabase
    .from('courses')
    .select(`
      *,
      instructor:users!instructor_id (
        full_name,
        avatar_url
      )
    `)
    .eq('is_published', true);

  if (decodedTerm.toLowerCase() !== 'courses' && decodedTerm.toLowerCase() !== 'all') {
    query = query.ilike('title', `%${decodedTerm}%`);
  }

  const { data: courses } = await query;

  return (
    <div className="h-full pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Search className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">
              {decodedTerm.toLowerCase() === 'courses' ? 'Explore Curriculum' : 'Search Results'}
            </h1>
            <p className="text-muted-foreground">
              {decodedTerm.toLowerCase() === 'courses' 
                ? `Discover our ${courses?.length || 0} professional engineering training courses`
                : `Found ${courses?.length || 0} result${courses?.length === 1 ? "" : "s"} for "${decodedTerm}"`
              }
            </p>
          </div>
        </div>

        {!courses || courses.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">No courses found</h2>
            <p className="text-muted-foreground mb-8">
              Try searching with different keywords
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course: any) => (
              <CourseCard
                key={course.id}
                course={course}
                href={`/courses/${generateSlug(course.title)}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
