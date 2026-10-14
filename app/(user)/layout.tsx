import type { Metadata } from "next";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "AirBharath LMS - Premium Aviation & Technical Learning",
  description: "Accelerate your learning with AirBharath LMS courses, certificates, and job opportunities.",
};

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main id="public-content" tabIndex={-1} className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
