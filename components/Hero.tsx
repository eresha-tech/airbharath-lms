"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { ArrowRight, ShieldCheck, Award } from "lucide-react";
import Image from "next/image";

const CAROUSEL_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop",
    caption: "Aviation Maintenance & Technical Systems",
  },
  {
    url: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?q=80&w=800&auto=format&fit=crop",
    caption: "Aeronautical Design & Engineering",
  },
  {
    url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop",
    caption: "Interactive Technical LMS Curriculum",
  },
];

export default function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full pt-28 pb-20 lg:pt-36 lg:pb-28 overflow-hidden bg-background">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#014a62]/10 rounded-full blur-[100px] -z-10 animate-pulse pointer-events-none" />

      <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-14 relative z-10">
        
        {/* Left Column: Image Carousel */}
        <div className="flex-1 w-full aspect-video md:aspect-[4/3] max-w-lg lg:max-w-none lg:h-[400px] relative rounded-3xl overflow-hidden border border-border/80 shadow-2xl bg-muted">
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-11" />
                
                <div className="absolute bottom-6 left-6 right-6 z-12 text-white">
                  <p className="text-xs font-bold text-cyan-300 uppercase tracking-widest">Airbharath LMS</p>
                  <h3 className="text-base md:text-lg font-bold font-instrument-serif mt-0.5">{image.caption}</h3>
                </div>
              </div>
            );
          })}

          <div className="absolute bottom-6 right-6 z-20 flex gap-2">
            {CAROUSEL_IMAGES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? "w-6 bg-[#014a62]" : "w-2 bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right Column: Copy Panel */}
        <div className="max-w-2xl flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#014a62]/10 border border-[#014a62]/20 text-[#014a62] text-xs font-bold tracking-wider uppercase mx-auto lg:mx-0">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            Airbharath Technical Education Ecosystem
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-instrument-serif tracking-tight text-foreground leading-tight">
            Accelerate Skillsets with <br />
            <span className="text-[#014a62]">Airbharath LMS.</span>
          </h1>
          
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-sans max-w-xl mx-auto lg:mx-0">
            Master aviation, engineering, and technical domains with self-paced video modules, instant PDF invoices, and QR-verifiable certificates.
          </p>

          <div className="p-4 bg-[#014a62]/5 border border-[#014a62]/15 rounded-2xl max-w-xl mx-auto lg:mx-0 flex gap-3.5 items-center text-left">
            <Award className="h-6 w-6 text-[#014a62] shrink-0" />
            <div>
              <p className="text-[10px] font-bold uppercase text-[#014a62] tracking-wider">Verifiable Credentials</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">
                Every generated certificate includes a QR verification badge scanned directly on Airbharath LMS.
              </p>
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="#curriculum" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-sm h-13 px-8 font-bold bg-[#014a62] hover:bg-[#01374a] text-white rounded-xl flex items-center justify-center gap-2 shadow-md">
                  Explore Courses
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
