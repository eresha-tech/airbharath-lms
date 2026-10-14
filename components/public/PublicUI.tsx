import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
export function PublicBrand() {
    return <Link href="/" className="public-brand" aria-label="AirBharath homepage">
    <Image src="https://assets.airbharath.in/eresha-logo.webp" alt="" width={40} height={32} sizes="40px"/>
    <span>AirBharath<span className="public-brand-caption">LEARN · CREATE</span>
    </span>
    </Link>;
}
export function PublicAction({ href, children, secondary = false }: {
    href: string;
    children: React.ReactNode;
    secondary?: boolean;
}) {
    return <Link href={href} className={secondary ? 'public-button-secondary' : 'public-button'}>{children}<ArrowUpRight size={17} aria-hidden="true"/>
    </Link>;
}
export function PublicHeading({ eyebrow, title, children }: {
    eyebrow: string;
    title: string;
    children?: React.ReactNode;
}) {
    return <div className="public-heading">
    <p className="public-eyebrow">{eyebrow}</p>
    <h2>{title}</h2>{children && <p className="public-copy">{children}</p>}</div>;
}
export function PublicFAQ({ items }: {
    items: readonly (readonly [
        string,
        string
    ])[];
}) {
    return <div className="public-faq">{items.map(([q, a]) => <details key={q}>
        <summary>{q}<span aria-hidden="true">+</span>
        </summary>
        <p>{a}</p>
        </details>)}</div>;
}
