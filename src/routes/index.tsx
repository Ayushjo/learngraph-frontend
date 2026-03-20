import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useStudentStore } from "../store/student.store";
import { studentApi } from "../lib/api";
import toast from "react-hot-toast";
import { Brain, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: StudentEntry,
});

function StudentEntry() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const setStudent = useStudentStore((s) => s.setStudent);
  const student = useStudentStore((s) => s.student);
  const navigate = useNavigate();

  useEffect(() => {
    if (student) navigate({ to: "/learn" });
  }, [student, navigate]);

  const handleEnter = async () => {
    if (name.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    setLoading(true);
    try {
      const s = await studentApi.findOrCreate(name.trim());
      setStudent(s);
      toast.success(`Welcome, ${s.name}!`);
      navigate({ to: "/learn" });
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8">
          {/* Icon */}
          <div className="w-14 h-14 bg-[#EEF2FF] rounded-2xl flex items-center justify-center mb-6">
            <Brain className="w-8 h-8 text-[#4F46E5]" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-[#0F172A] mb-1">
            Welcome to LearnGraph
          </h1>
          <p className="text-[#64748B] text-sm mb-8">
            Your personal knowledge graph grows as you learn. Start by entering
            your name.
          </p>

          {/* Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#0F172A] mb-2">
              Your name
            </label>
            <input
              type="text"
              placeholder="e.g. Rahul, Priya..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEnter()}
              className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent text-sm transition-all"
              autoFocus
            />
          </div>

          {/* Button */}
          <button
            onClick={handleEnter}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Start Learning
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { icon: "📖", text: "NCERT aligned passages" },
            { icon: "🧠", text: "Personal knowledge graph" },
            { icon: "✨", text: "AI-powered questions" },
          ].map((f) => (
            <div
              key={f.text}
              className="bg-white rounded-xl border border-[#E2E8F0] p-3 text-center"
            >
              <div className="text-xl mb-1">{f.icon}</div>
              <div className="text-xs text-[#64748B] font-medium leading-tight">
                {f.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
