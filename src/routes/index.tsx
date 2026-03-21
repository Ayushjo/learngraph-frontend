import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useStudentStore } from "../store/student.store";
import { studentApi } from "../lib/api";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Sprout,
  BookOpen,
  Brain,
  TrendingUp,
  FlaskConical,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: StudentEntry,
});

function StudentEntry() {
  const [name, setName] = useState("");
  const [classLevel, setClassLevel] = useState<11 | 12>(12);
  const [loading, setLoading] = useState(false);
  const setStudent = useStudentStore((s) => s.setStudent);
  const setClassLevelStore = useStudentStore((s) => s.setClassLevel);
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
      setClassLevelStore(classLevel);
      navigate({ to: "/learn" });
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 52px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        background: "var(--bg)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "var(--accent)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 24px rgba(232,68,106,0.25)",
            }}
          >
            <FlaskConical size={28} color="#fff" strokeWidth={2} />
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "28px",
              fontWeight: 700,
              color: "var(--dark)",
              margin: "0 0 8px",
              letterSpacing: "-0.5px",
            }}
          >
            Welcome to LearnGraph
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted)",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Master JEE & NEET Chemistry through adaptive learning
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "20px",
            border: "1px solid var(--border)",
            padding: "28px",
            boxShadow: "0 2px 16px rgba(232,68,106,0.06)",
          }}
        >
          {/* Name input */}
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--dark)",
              marginBottom: "8px",
            }}
          >
            Your name
          </label>
          <input
            type="text"
            placeholder="e.g. Rahul, Priya, Arjun..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEnter()}
            autoFocus
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1.5px solid var(--border)",
              fontSize: "14px",
              color: "var(--dark)",
              background: "var(--bg)",
              outline: "none",
              marginBottom: "20px",
              fontFamily: "var(--font-ui)",
              transition: "border-color 0.2s",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />

          {/* Class selector */}
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--dark)",
              marginBottom: "8px",
            }}
          >
            Your class
          </label>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            {([11, 12] as const).map((cls) => (
              <button
                key={cls}
                onClick={() => setClassLevel(cls)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1.5px solid",
                  borderColor:
                    classLevel === cls ? "var(--accent)" : "var(--border)",
                  background:
                    classLevel === cls ? "var(--accent)" : "var(--bg)",
                  color: classLevel === cls ? "#fff" : "var(--muted)",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  transition: "all 0.15s",
                  boxShadow:
                    classLevel === cls
                      ? "0 2px 10px rgba(232,68,106,0.25)"
                      : "none",
                }}
              >
                Class {cls}
              </button>
            ))}
          </div>

          {/* Subject display */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              marginBottom: "20px",
            }}
          >
            <FlaskConical size={14} color="var(--accent)" strokeWidth={2} />
            <span
              style={{
                fontSize: "13px",
                color: "var(--dark)",
                fontWeight: 500,
              }}
            >
              Chemistry
            </span>
            <span
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                marginLeft: "auto",
              }}
            >
              JEE & NEET aligned
            </span>
          </div>

          {/* Submit */}
          <button
            onClick={handleEnter}
            disabled={loading || name.trim().length < 2}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "13px",
              borderRadius: "12px",
              border: "none",
              background: name.trim().length >= 2 ? "var(--accent)" : "#E5D0D5",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "var(--font-ui)",
              cursor: name.trim().length >= 2 ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              boxShadow:
                name.trim().length >= 2
                  ? "0 4px 14px rgba(232,68,106,0.3)"
                  : "none",
            }}
          >
            {loading ? (
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }}
              />
            ) : (
              <>
                <span>Start Learning</span>
                <ArrowRight size={15} strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "20px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {[
            { icon: <BookOpen size={12} />, text: "NCERT aligned" },
            { icon: <Brain size={12} />, text: "Subtopic progression" },
            {
              icon: <TrendingUp size={12} />,
              text: "Personal knowledge graph",
            },
          ].map((f) => (
            <div
              key={f.text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "99px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--muted)",
              }}
            >
              {f.icon}
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
