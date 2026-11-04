import Link from 'next/link';
import { Search, Compass } from 'lucide-react';
import { CourseCard, type CourseCardProps } from '@/components/CourseCard';
import { type CatalogParams, difficulties } from '@/lib/discovery/model';
export type CatalogCourseItem = CourseCardProps['course'] & { slug?:string|null };
export function CourseCatalogClient({courses,categories,total,params:p}:{courses:CatalogCourseItem[];categories:string[];total:number;params:CatalogParams}) {
 const pageLink=(page:number)=>`/courses?${new URLSearchParams({q:p.q,category:p.category,difficulty:p.difficulty,sort:p.sort,page:String(page)})}`;
 const pages=Math.max(1,Math.ceil(total/12));
 return <div className="space-y-7">
  <form action="/courses" className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
   <div className="sm:col-span-2 lg:col-span-4"><label htmlFor="catalog-search" className="mb-2 block text-sm font-semibold">Find your next skill</label><div className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"/><input id="catalog-search" name="q" defaultValue={p.q} maxLength={120} placeholder="Search courses, topics or skills" className="h-11 w-full rounded-xl border bg-background pl-10 pr-3"/></div></div>
   <label className="text-sm font-medium">Category<select aria-label="Category" name="category" defaultValue={p.category} className="mt-2 h-11 w-full rounded-xl border bg-background px-3"><option value="">All categories</option>{categories.map(v=><option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select></label>
   <label className="text-sm font-medium">Difficulty<select aria-label="Difficulty" name="difficulty" defaultValue={p.difficulty} className="mt-2 h-11 w-full rounded-xl border bg-background px-3"><option value="">Any difficulty</option>{difficulties.map(v=><option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select></label>
   <label className="text-sm font-medium">Sort by<select aria-label="Sort by" name="sort" defaultValue={p.sort} className="mt-2 h-11 w-full rounded-xl border bg-background px-3"><option value="relevance">Recommended / relevance</option><option value="rating">Learner rating</option><option value="popularity">Popularity</option><option value="newest">Newest</option></select></label>
   <div className="flex items-end gap-3"><button className="h-11 flex-1 rounded-xl bg-primary px-4 font-semibold text-primary-foreground">Find courses</button><Link href="/courses" className="py-3 text-sm underline">Reset</Link></div>
  </form>
  <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground"><p>{total} {total===1?'course':'courses'} to explore</p><p>Verified learner feedback · New courses welcome</p></div>
  {courses.length?<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{courses.map(c=><CourseCard key={c.id} course={c} href={`/courses/${c.slug||c.id}`}/>)}</div>:<div className="rounded-3xl border border-dashed bg-card px-6 py-16 text-center"><Compass className="mx-auto mb-4 text-primary"/><h2 className="text-xl font-bold">{total?'No courses on this page':'No matching courses yet'}</h2><p className="my-3 text-muted-foreground">Try a broader topic or reset your filters.</p><Link href="/courses" className="text-primary underline">Explore all courses</Link></div>}
  {pages>1&&<nav aria-label="Catalog pagination" className="flex items-center justify-center gap-5">{p.page>1&&<Link className="rounded-xl border px-4 py-3" href={pageLink(p.page-1)}>Previous</Link>}<span>Page {p.page} of {pages}</span>{p.page<pages&&<Link className="rounded-xl border px-4 py-3" href={pageLink(p.page+1)}>Next</Link>}</nav>}
 </div>;
}
