"use client";

import { useState } from "react";
import { Search, User } from "lucide-react";

interface Student {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function StudentsTable({ initialStudents }: { initialStudents: Student[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = initialStudents.filter((student) => {
    const term = searchTerm.toLowerCase();
    const name = (student.full_name || "").toLowerCase();
    const email = (student.email || "").toLowerCase();
    return name.includes(term) || email.includes(term);
  });

  return (
    <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
      {/* Table Filters */}
      <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search students by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border rounded-lg bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="text-xs font-semibold text-muted-foreground">
          Showing {filteredStudents.length} of {initialStudents.length} students
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Join Date</th>
              <th className="px-6 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center shrink-0">
                        {student.avatar_url ? (
                          <img src={student.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <span className="font-bold text-sm text-foreground">
                        {student.full_name || "Anonymous User"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {new Date(student.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-500/10 text-green-600">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No students found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
