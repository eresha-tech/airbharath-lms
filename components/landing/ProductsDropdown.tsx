'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, GraduationCap, Layers, Mic, Plane } from 'lucide-react';

export interface EcosystemProduct {
  id: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  external?: boolean;
  badge: string;
  icon: 'aviator' | 'chatterbox' | 'academy' | 'workspace';
}

export const ECOSYSTEM_PRODUCTS: readonly EcosystemProduct[] = [
  {
    id: 'aviator',
    name: 'Aviator',
    tagline: 'aviator.airbharath.in',
    description: 'DGCA exam prep, curated question banks, and flight training intelligence.',
    href: 'http://aviator.airbharath.in/',
    external: true,
    badge: 'Exam Prep',
    icon: 'aviator',
  },
  {
    id: 'chatterbox',
    name: 'Chatterbox AI',
    tagline: 'chatterboxai.in',
    description: 'Aviation English fluency, ATC phraseology, and real-time voice AI.',
    href: 'https://chatterboxai.in/',
    external: true,
    badge: 'Voice AI',
    icon: 'chatterbox',
  },
  {
    id: 'academy',
    name: 'AirBharath Academy',
    tagline: 'airbharath.in/courses',
    description: 'Industry-certified ground school, masterclasses, and career tracks.',
    href: '/courses',
    external: false,
    badge: 'Courses',
    icon: 'academy',
  },
  {
    id: 'workspace',
    name: 'Creator Workspace',
    tagline: 'airbharath.in/workspace',
    description: 'Publishing and media studio for pilots and aviation instructors.',
    href: '/workspace',
    external: false,
    badge: 'For Creators',
    icon: 'workspace',
  },
] as const;

export function ProductIcon({ icon }: { icon: EcosystemProduct['icon'] }) {
  switch (icon) {
    case 'aviator':
      return <Plane size={18} aria-hidden="true" />;
    case 'chatterbox':
      return <Mic size={18} aria-hidden="true" />;
    case 'academy':
      return <GraduationCap size={18} aria-hidden="true" />;
    case 'workspace':
      return <Layers size={18} aria-hidden="true" />;
  }
}

export function ProductsDropdown() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const clearTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearTimer();
    setOpen(true);
  };

  const handleMouseLeave = () => {
    clearTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      clearTimer();
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="public-products-trigger-wrap"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className="public-products-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>Products</span>
        <ChevronDown size={15} className="public-products-chevron" data-open={open} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          className="public-products-dropdown"
          role="region"
          aria-label="AirBharath ecosystem products"
        >
          <div className="public-products-dropdown-header">
            <span className="public-products-eyebrow">AirBharath Ecosystem</span>
            <span className="public-products-caption">Integrated platforms for aviation mastery</span>
          </div>
          <div className="public-products-grid">
            {ECOSYSTEM_PRODUCTS.map((product) => {
              const content = (
                <>
                  <div className={`public-product-icon public-product-icon-${product.icon}`}>
                    <ProductIcon icon={product.icon} />
                  </div>
                  <div className="public-product-meta">
                    <div className="public-product-title-row">
                      <strong>{product.name}</strong>
                      <span className="public-product-badge">{product.badge}</span>
                      {product.external && <ArrowUpRight size={14} className="public-product-ext" aria-hidden="true" />}
                    </div>
                    <p>{product.description}</p>
                  </div>
                </>
              );

              if (product.external) {
                return (
                  <a
                    key={product.id}
                    href={product.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="public-product-card"
                    onClick={() => setOpen(false)}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <Link
                  key={product.id}
                  href={product.href}
                  className="public-product-card"
                  onClick={() => setOpen(false)}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
