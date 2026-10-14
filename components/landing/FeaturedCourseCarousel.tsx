'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PublicCourse } from '@/lib/public/catalog-model';

export function FeaturedCourseCarousel({ courses }: { courses: PublicCourse[] }) {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(true);
    const [hidden, setHidden] = useState(false);
    useEffect(() => {
        const preference = matchMedia('(prefers-reduced-motion: reduce)');
        const updateMotion = () => setReducedMotion(preference.matches);
        const updateVisibility = () => setHidden(document.hidden);
        updateMotion();
        updateVisibility();
        preference.addEventListener('change', updateMotion);
        document.addEventListener('visibilitychange', updateVisibility);
        return () => {
            preference.removeEventListener('change', updateMotion);
            document.removeEventListener('visibilitychange', updateVisibility);
        };
    }, []);
    const rotating = courses.length > 1 && !paused && !hovered && !focused && !reducedMotion && !hidden;
    useEffect(() => {
        if (!rotating) return;
        const timer = setInterval(() => setIndex(current => (current + 1) % courses.length), 6000);
        return () => clearInterval(timer);
    }, [rotating, courses.length]);
    const move = (offset: number) => {
        setPaused(true);
        setIndex(current => (current + offset + courses.length) % courses.length);
    };
    return <div role="region" className="public-hero-visual" aria-roledescription={courses.length > 1 ? 'carousel' : undefined} aria-label="Featured courses"
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)} onBlurCapture={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}>
        <div className="public-carousel-slides" aria-live={rotating ? 'off' : 'polite'} aria-atomic="true">
            {(courses.length ? courses : [undefined]).map((item, position) => {
                const active = position === index % (courses.length || 1);
                const target = item ? `/courses/${encodeURIComponent(item.slug)}` : '/courses';
                return <div key={item?.slug || 'empty'} className="public-carousel-slide" inert={!active} aria-hidden={!active} style={{ visibility: active ? 'visible' : 'hidden' }}>
                    <Link href={target} aria-label={item ? `Explore ${item.title}` : 'Explore courses'} onClick={() => setPaused(true)}>
                        {item?.thumbnailUrl ? <Image src={item.thumbnailUrl} alt={item.title} width={640} height={400} sizes="(max-width: 900px) 90vw, 480px" priority={position === 0} /> : <div className="public-course-outline" style={{ aspectRatio: '16 / 10' }}>
                            <p className="public-eyebrow">Your next skill</p>
                            <ol><li><span>01</span>Find a course that fits your goals</li><li><span>02</span>Learn through structured lessons</li><li><span>03</span>Apply what you learn</li></ol>
                        </div>}
                    </Link>
                    <div className="public-carousel-caption">
                        <p className="public-eyebrow">A practical place to begin</p>
                        <strong><Link href={target}>{item?.title || 'Choose your next learning path'}</Link></strong>
                        <p>Explore the course curriculum, access terms and current pricing before enrolling.</p>
                        <Link className="public-text-link" href={target}>Explore Course<span className="sr-only">: {item?.title || 'catalog'}</span> →</Link>
                    </div>
                </div>;
            })}
        </div>
        {courses.length > 1 && <div className="public-carousel-controls">
            <button type="button" onClick={() => move(-1)} aria-label="Previous featured course"><ChevronLeft aria-hidden="true" /></button>
            <span>{index % courses.length + 1} / {courses.length}</span>
            {!reducedMotion && <button type="button" className="public-carousel-play" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Resume course rotation' : 'Pause course rotation'}>{paused ? 'Play' : 'Pause'}</button>}
            <button type="button" onClick={() => move(1)} aria-label="Next featured course"><ChevronRight aria-hidden="true" /></button>
        </div>}
    </div>;
}
