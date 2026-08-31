"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { ArrowRight, Globe } from "lucide-react";
import Image from "next/image";

const CAROUSEL_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop",
    caption: "Practical Site Inspections & Foundations"
  },
  {
    url: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?q=80&w=800&auto=format&fit=crop",
    caption: "Advanced Structural Modeling & ETABS"
  },
  {
    url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop",
    caption: "Reinforced Concrete Detailing & Eurocodes"
  },
  {
    url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?q=80&w=800&auto=format&fit=crop",
    caption: "High-Rise Steel Structure Designs"
  }
];

export default function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Automatic slide rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full pt-32 pb-24 lg:pt-40 lg:pb-36 overflow-hidden bg-background">
      {/* Dynamic Background Mesh Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -z-10 animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -z-10 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

      <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-16 relative z-10">
        
        {/* Left Column: Sliding Image Carousel */}
        <div className="flex-1 w-full aspect-video md:aspect-[4/3] max-w-lg lg:max-w-none lg:h-[420px] relative rounded-3xl overflow-hidden border border-border/80 shadow-2xl animate-scale-in bg-muted">
          {/* Glassmorphic border ring effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 to-accent/5 rounded-3xl pointer-events-none z-20 border border-white/10" />
          
          {/* Carousel Images */}
          {CAROUSEL_IMAGES.map((image, index) => {
            const isActive = index === currentIndex;
            return (
              <div
                key={image.url}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  isActive ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                <Image
                  src={image.url}
                  alt={image.caption}
                  fill
                  priority={index === 0}
                  className="object-cover"
                />
                {/* Gradient shade */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-11" />
                
                {/* Image Caption overlay */}
                <div className="absolute bottom-6 left-6 right-6 z-12 text-white">
                  <p className="text-xs font-bold text-accent uppercase tracking-widest">IRII Training Program</p>
                  <h3 className="text-base md:text-lg font-black mt-1">{image.caption}</h3>
                </div>
              </div>
            );
          })}

          {/* Carousel Navigation dots indicator */}
          <div className="absolute bottom-6 right-6 z-20 flex gap-2">
            {CAROUSEL_IMAGES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? "w-6 bg-accent" : "w-2 bg-white/60 hover:bg-white"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right Column: Copy Panel */}
        <div className="max-w-3xl flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wider uppercase animate-fade-in mx-auto lg:mx-0">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            ★ Trusted by 10,000+ Students & Professionals
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15] animate-slide-up">
            Struggling with Civil Engineering Concepts? <br />
            <span className="bg-gradient-to-r from-primary via-primary/95 to-accent bg-clip-text text-transparent">
              Master Them Once & Crack Any Interview.
            </span>
          </h1>
          
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed animate-slide-up max-w-2xl mx-auto lg:mx-0" style={{ animationDelay: '0.1s' }}>
            Stop feeling underprepared in interviews. The ultimate career transformation system for civil engineers to go from weak college fundamentals to industry-ready design experts.
          </p>

          {/* Global Advantage Badge */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl max-w-xl mx-auto lg:mx-0 flex gap-3.5 items-start text-left animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <Globe className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase text-primary tracking-widest">Global Advantage</p>
              <p className="text-xs font-bold text-foreground mt-0.5 leading-relaxed">
                The ONLY finishing school teaching concepts simultaneously in <span className="text-primary dark:text-white">Indian (IS)</span>, <span className="text-primary dark:text-white">American (ACI/AISC)</span>, and <span className="text-primary dark:text-white">Euro Codes</span>.
              </p>
            </div>
          </div>
          
          <div className="space-y-3 pt-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/search/courses" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-sm h-14 px-8 font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2">
                  Get Instant Access
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#curriculum" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-sm h-14 px-8 font-bold hover:bg-muted transition-all duration-300 hover:scale-[1.02]">
                  Explore Curriculum
                </Button>
              </Link>
            </div>
            <p className="text-[10px] md:text-xs font-semibold text-muted-foreground tracking-wide">
              🛡️ 7-Day Money-Back Guarantee. No risk.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
