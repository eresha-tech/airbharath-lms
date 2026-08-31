import { Mail } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-2xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Contact Us</h1>
      <div className="bg-card p-8 rounded-2xl border shadow-sm text-center">
        <p className="text-lg text-muted-foreground mb-8">
          Have questions about our programs, the Shared Success Plan, or corporate partnerships? We&apos;d love to hear from you.
        </p>
        <a 
          href="mailto:contact@irii.in" 
          className="inline-flex items-center justify-center rounded-lg px-8 py-4 font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-lg gap-3"
        >
          <Mail className="h-6 w-6" />
          Email us at contact@irii.in
        </a>
      </div>
    </div>
  );
}
