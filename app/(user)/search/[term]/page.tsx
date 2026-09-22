import { Search } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { eq, ilike, and } from "drizzle-orm";
import { generateSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  params: Promise<{
    term: string;
  }>;
}

export default async function SearchPage({ params }: SearchPageProps) {
  const { term } = await params;
  const decodedTerm = decodeURIComponent(term);

  let searchResults: any[] = [];
  try {
    if (decodedTerm.toLowerCase() !== "courses" && decodedTerm.toLowerCase() !== "all") {
      searchResults = await db.query.courses.findMany({
        where: and(eq(courses.isPublished, true), ilike(courses.title, `%${decodedTerm}%`)),
      });
    } else {
      searchResults = await db.query.courses.findMany({
        where: eq(courses.isPublished, true),
      });
    }
  } catch (err) {
    console.error("Search error:", err);
  }

  return (
    <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#014a62]/10 text-[#014a62] rounded-2xl">
              <Search className="h-7 w-7 text-[#014a62]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-instrument-serif text-[#014a62]">
                {decodedTerm.toLowerCase() === "courses" ? "Airbharath Curriculum" : "Search Results"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {decodedTerm.toLowerCase() === "courses"
                  ? `Discover ${searchResults.length} professional aviation & technical training courses`
                  : `Found ${searchResults.length} result${searchResults.length === 1 ? "" : "s"} for "${decodedTerm}"`}
              </p>
            </div>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 border border-dashed rounded-3xl space-y-4">
              <h2 className="text-xl font-bold text-foreground">No courses found</h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Try searching for different keywords or explore our featured courses.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {searchResults.map((course: any) => (
                <CourseCard
                  key={course.id}
                  course={{
                    id: course.id,
                    title: course.title,
                    description: course.description,
                    thumbnailUrl: course.thumbnailUrl,
                    price: course.price,
                    accessDays: course.accessDays,
                  }}
                  href={`/courses/${course.slug || generateSlug(course.title)}`}
                />
              ))}
            </div>
          )}
        </div>
      </main>
  );
}
