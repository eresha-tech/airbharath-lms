import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-24">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Investment in Intelligence.</h1>
        <p className="text-lg text-muted-foreground">
          We win when you win. Introducing our risk-free, income-aligned tuition model.
        </p>
      </div>

      <div className="bg-card rounded-3xl border shadow-xl overflow-hidden flex flex-col md:flex-row max-w-5xl mx-auto">
        <div className="p-10 md:w-1/2 flex flex-col justify-center border-b md:border-b-0 md:border-r border-border bg-muted/30">
          <h3 className="text-2xl font-bold mb-2">Shared Success Plan</h3>
          <p className="text-muted-foreground mb-6">Start your journey today with minimal upfront investment.</p>
          
          <div className="flex items-baseline gap-2 mb-8">
            <span className="text-5xl font-extrabold text-primary">50%</span>
            <span className="text-xl text-muted-foreground font-medium">Upfront</span>
          </div>
          
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
              <span>Access all premium software training</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
              <span>Live mentorship & project portfolio</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
              <span>Sudarshan Kriya behavioral training</span>
            </li>
          </ul>
        </div>
        
        <div className="p-10 md:w-1/2 bg-primary text-primary-foreground flex flex-col justify-center">
          <h3 className="text-2xl font-bold mb-2 text-white">Pay the Rest Later</h3>
          <p className="text-primary-foreground/80 mb-6">We only succeed when you secure a high-paying job.</p>
          
          <div className="flex items-baseline gap-2 mb-8">
            <span className="text-5xl font-extrabold text-white">50%</span>
            <span className="text-xl text-primary-foreground/80 font-medium">Post-Placement</span>
          </div>
          
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
              <span>Only payable after landing a job</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
              <span>Direct entry into corporate placement hub</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
              <span>Earn 2x-3x the average market salary</span>
            </li>
          </ul>
          
          <Link href="/search/courses" className="w-full text-center py-4 bg-white text-primary font-bold rounded-lg hover:bg-white/90 transition-colors shadow-lg block">
            Apply for the Program
          </Link>
        </div>
      </div>
    </div>
  );
}
