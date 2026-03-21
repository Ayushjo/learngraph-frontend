import { createRootRoute, Outlet, Link } from "@tanstack/react-router";
import { useStudentStore } from "../store/student.store";
import { BookOpen, Brain, LogOut } from "lucide-react";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const student = useStudentStore((s) => s.student);
  const clearStudent = useStudentStore((s) => s.clearStudent);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-['Inter',sans-serif]">
      {/* Navbar */}
      <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 sticky top-0 z-50">
        {/* Left — Logo */}
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-[#0F172A] text-lg tracking-tight">
            Learn<span className="text-[#4F46E5]">Graph</span>
          </span>
        </Link>

        {/* Right */}
        {student && (
          <div className="flex items-center gap-1">
            <Link
              to="/learn"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors no-underline"
            >
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              <span>Learn</span>
            </Link>
            <Link
              to="/graph"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors no-underline"
            >
              <Brain className="w-4 h-4 flex-shrink-0" />
              <span>My Graph</span>
            </Link>

            <div className="h-6 w-px bg-[#E2E8F0] mx-1" />

            <div className="flex items-center gap-2 px-2">
              <div className="w-7 h-7 bg-[#EEF2FF] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-[#4F46E5] font-semibold text-xs">
                  {student.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-[#0F172A] capitalize">
                {student.name}
              </span>
            </div>

            <button
              onClick={clearStudent}
              className="p-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#EF4444] transition-colors ml-1"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Page content */}
      <Outlet />
    </div>
  );
}
