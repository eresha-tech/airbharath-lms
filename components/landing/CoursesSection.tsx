import Image from 'next/image';
import { PublicRetry } from '@/components/public/PublicRetry';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { PublicAction, PublicHeading } from '@/components/public/PublicUI';
import { rupees, type PublicCatalog, type PublicCourse } from '@/lib/public/catalog-model';
export function PublicCourseCard({ course }: {
    course: PublicCourse;
}) {
    const href = `/courses/${encodeURIComponent(course.slug)}`;
    return <article className="public-course-card">
    <Link href={href} className="public-course-image" tabIndex={-1} aria-hidden="true">{course.thumbnailUrl ? <Image src={course.thumbnailUrl} alt="" fill sizes="(max-width: 600px) 90vw, (max-width: 900px) 45vw, 380px"/> : <div className="flex h-full items-center justify-center">
        <BookOpen size={36} aria-hidden="true"/>
        </div>}</Link>
    <div className="public-course-content">
    <div className="public-course-meta">
    <span>{course.isBundle ? 'Course bundle' : 'Self-paced learning'}</span>{course.accessDays !== null && course.accessDays > 0 && <span>{course.accessDays} days course access</span>}</div>
    <h3>
    <Link href={href}>{course.title}</Link>
    </h3>{course.description && <p className="public-course-description">{course.description}</p>}
    <div className="public-course-bottom">
    <p className="public-price">{rupees(course.price)}</p>
    <p className="public-price-caption">Standard total · inclusive of 18% GST</p>{course.offerPrice !== null && <div className="public-offer">
        <strong>{rupees(course.offerPrice)} with an eligible coupon</strong>
        <p>Combo Pass offer. Coupon validity and usage limits apply. Review the current offer on the course page.</p>
        </div>}<Link href={href} className="public-text-link">Explore Course<span className="sr-only">: {course.title}</span> →</Link>
    </div>
  </div>
    </article>;
}
export function CoursesSection({ catalog }: {
    catalog: PublicCatalog;
}) {
    return <section id="courses" className="public-section">
    <div className="public-container">
    <div className="public-catalog-header">
    <PublicHeading eyebrow="Start learning" title="Your next skill starts here.">Explore the current AirBharath course selection. Find the curriculum that fits your goals.</PublicHeading>
    <PublicAction secondary href="/courses">View All Courses</PublicAction>
    </div>
    {catalog.status === 'unavailable' ? <div className="public-unavailable" role="status">
        <h3>Course information is temporarily unavailable.</h3>
        <p>We couldn’t load the current catalog. Please try again shortly.</p>
        <PublicRetry label="Retry loading courses"/>
        <p>
        <Link href="/contact" className="public-text-link">Contact support</Link>
        </p>
        </div> : catalog.courses.length ? <div className="public-course-grid">{catalog.courses.map(course => <PublicCourseCard key={course.slug} course={course}/>)}</div> : <div className="public-unavailable">
        <h3>No courses are currently listed.</h3>
        <p>Check the course catalog again soon or contact us for help.</p>
        <Link href="/contact" className="public-text-link">Contact support</Link>
        </div>}
  </div>
    </section>;
}
