import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import VideoLibraryClient from "@/components/admin/VideoLibraryClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Video Asset Library | AirBharath LMS Admin",
  description: "Manage global video library assets, track usage across courses, and inspect transcoding health.",
};

export default async function AdminVideosPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/login");
  }

  return <VideoLibraryClient />;
}
