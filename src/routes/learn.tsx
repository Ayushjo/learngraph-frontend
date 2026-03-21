import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useStudentStore } from "../store/student.store";
import { contentApi, quizApi, graphApi } from "../lib/api";
import type { Session, QuizResult, Question, GraphNode } from "../lib/api";
import { TOPICS_BY_CLASS, CLASS_LEVELS } from "../lib/topics";
import { redirect } from "@tanstack/react-router";
import toast from "react-hot-toast";
import {
  BookOpen,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Brain,
  RotateCcw,
  ArrowRight,
  Clock,
  Target,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/learn")({
  beforeLoad: () => {
    const student = useStudentStore.getState().student;
    if (!student) throw redirect({ to: "/" });
  },
  component: LearnPage,
});

type ScreenState = "setup" | "loading" | "quiz" | "results";

// ─── Mastery helpers ──────────────────────────────────────────────────────────

const MASTERY_COLORS: Record<string, string> = {
  mastered: "#059669",
  proficient: "#D97706",
  developing: "#2563EB",
  struggling: "#DC2626",
  not_started: "#9CA3AF",
};

const MASTERY_BG: Record<string, string> = {
  mastered: "#ECFDF5",
  proficient: "#FFFBEB",
  developing: "#EFF6FF",
  struggling: "#FEF2F2",
  not_started: "#F9FAFB",
};

const masteryLabel = (level: string) =>
  ({
    mastered: "Mastered",
    proficient: "Proficient",
    developing: "Developing",
    struggling: "Struggling",
    not_started: "Not Started",
  })[level] ?? level;

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// ─── Main Component ───────────────────────────────────────────────────────────

function LearnPage() {
  const student = useStudentStore((s) => s.student);
  const preferredClassLevel = useStudentStore((s) => s.preferredClassLevel);
  const setPreferredClassLevel = useStudentStore(
    (s) => s.setPreferredClassLevel,
  );

  const [screen, setScreen] = useState<ScreenState>("setup");
  const [classLevel, setClassLevel] = useState<number>(preferredClassLevel);
  const [topicId, setTopicId] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unansweredQuestions, setUnansweredQuestions] = useState<number[]>([]);

  // Dashboard data
  const [dashLoading, setDashLoading] = useState(true);
  const [graphStats, setGraphStats] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [lastAttempted, setLastAttempted] = useState<GraphNode | null>(null);

  const topics = TOPICS_BY_CLASS[classLevel] || [];
  const selectedTopic = topics.find((t: any) => t.id === topicId);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    if (!student) return;
    setDashLoading(true);
    try {
      const [graph, recs] = await Promise.all([
        graphApi.getStudentGraph(student.id),
        graphApi.getRecommendations(student.id, "Science", preferredClassLevel),
      ]);
      setGraphStats(graph.stats);
      setRecommendations(recs.slice(0, 3));

      // Find last attempted topic
      const attempted = graph.nodes
        .filter(
          (n: GraphNode) => n.attempts > 0 && n.masteryLevel !== "mastered",
        )
        .sort((a: GraphNode, b: GraphNode) => {
          if (!a.lastAttempted) return 1;
          if (!b.lastAttempted) return -1;
          return (
            new Date(b.lastAttempted).getTime() -
            new Date(a.lastAttempted).getTime()
          );
        });
      setLastAttempted(attempted[0] ?? null);
    } catch {
      // silent fail — dashboard is enhancement not critical
    } finally {
      setDashLoading(false);
    }
  }, [student, preferredClassLevel]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Refresh dashboard when coming back to setup
  useEffect(() => {
    if (screen === "setup") fetchDashboard();
  }, [screen]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleGenerate = async (
    overrideTopicId?: string,
    overrideTopicName?: string,
    overrideClass?: number,
  ) => {
    if (!student) return;
    const tId = overrideTopicId ?? topicId;
    const tName = overrideTopicName ?? selectedTopic?.name;
    const tClass = overrideClass ?? classLevel;

    if (!tId || !tName) {
      toast.error("Please select a topic");
      return;
    }

    setScreen("loading");
    try {
      const result = await contentApi.generate({
        studentId: student.id,
        topicId: tId,
        topicName: tName,
        subject: "Science",
        classLevel: tClass,
      });
      setSession(result);
      setSelectedAnswers({});
      setQuizResult(null);
      setScreen("quiz");
    } catch {
      toast.error("Failed to generate content. Try again.");
      setScreen("setup");
    }
  };

  const handleSelectAnswer = (questionIndex: number, optionIndex: number) => {
    if (quizResult) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
    setUnansweredQuestions((prev) => prev.filter((i) => i !== questionIndex));
  };

  const handleSubmit = async () => {
    if (!student || !session) return;
    const unanswered = [0, 1, 2, 3, 4].filter(
      (i) => selectedAnswers[i] === undefined,
    );
    if (unanswered.length > 0) {
      setUnansweredQuestions(unanswered);
      toast.error(
        `Please answer question${unanswered.length > 1 ? "s" : ""} ${unanswered.map((i) => i + 1).join(", ")}`,
      );
      const el = document.getElementById(`question-${unanswered[0]}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setUnansweredQuestions([]);
    setSubmitting(true);
    try {
      const answers = [0, 1, 2, 3, 4].map((i) => selectedAnswers[i] ?? 0);
      const result = await quizApi.submit({
        studentId: student.id,
        sessionId: session.sessionId,
        answers,
      });
      setQuizResult(result);
      setScreen("results");
      toast.success(`You scored ${result.score}/${result.total}!`);
    } catch {
      toast.error("Failed to submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setScreen("setup");
    setSession(null);
    setSelectedAnswers({});
    setQuizResult(null);
    setTopicId("");
  };

  if (!student) return null;

  return (
    <div
      style={{
        height: "calc(100vh - 52px)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-ui)",
      }}
    >
      {/* ── Top breadcrumb bar ── */}
      <div
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "0 24px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BookOpen size={14} color="var(--accent)" strokeWidth={2} />
          <span
            style={{ fontSize: "13px", fontWeight: 500, color: "var(--dark)" }}
          >
            {session ? session.title : "Science · NCERT"}
          </span>
          {session && (
            <>
              <ChevronRight size={12} color="var(--muted)" />
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                Class {session.topic.classLevel}
              </span>
            </>
          )}
        </div>
        {screen !== "setup" && (
          <button
            onClick={handleReset}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "transparent",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--muted)",
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
            }}
          >
            <RotateCcw size={12} strokeWidth={2} />
            New Topic
          </button>
        )}
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {/* ════ SETUP / DASHBOARD ════ */}
        {screen === "setup" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
            <div style={{ maxWidth: "860px", margin: "0 auto" }}>
              {/* Greeting */}
              <div style={{ marginBottom: "28px" }}>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "26px",
                    fontWeight: 700,
                    color: "var(--dark)",
                    margin: "0 0 4px",
                    letterSpacing: "-0.4px",
                  }}
                >
                  {getGreeting()},{" "}
                  <span
                    style={{
                      color: "var(--accent)",
                      textTransform: "capitalize",
                    }}
                  >
                    {student.name}
                  </span>{" "}
                  👋
                </h1>
                <p
                  style={{ fontSize: "14px", color: "var(--muted)", margin: 0 }}
                >
                  Here's where your Science journey stands today
                </p>
              </div>

              {/* Stats row */}
              {!dashLoading && graphStats && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "12px",
                    marginBottom: "28px",
                  }}
                >
                  {[
                    {
                      label: "Total Topics",
                      value: graphStats.totalTopics,
                      icon: <BookOpen size={16} />,
                      color: "#6366F1",
                    },
                    {
                      label: "Attempted",
                      value: graphStats.attempted,
                      icon: <Target size={16} />,
                      color: "var(--accent)",
                    },
                    {
                      label: "Mastered",
                      value: graphStats.mastered,
                      icon: <CheckCircle2 size={16} />,
                      color: "#059669",
                    },
                    {
                      label: "Avg Mastery",
                      value: `${Math.round(graphStats.averageMastery * 100)}%`,
                      icon: <TrendingUp size={16} />,
                      color: "#D97706",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "14px",
                        padding: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          background: stat.color + "15",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: stat.color,
                          flexShrink: 0,
                        }}
                      >
                        {stat.icon}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: "20px",
                            fontWeight: 700,
                            color: "var(--dark)",
                            lineHeight: 1,
                          }}
                        >
                          {stat.value}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--muted)",
                            marginTop: "2px",
                          }}
                        >
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Two column layout */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                  marginBottom: "28px",
                }}
              >
                {/* Continue where you left off */}
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "16px",
                    }}
                  >
                    <Clock size={13} color="var(--accent)" strokeWidth={2} />
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--accent)",
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                      }}
                    >
                      Continue Learning
                    </span>
                  </div>

                  {lastAttempted ? (
                    <>
                      <div
                        style={{
                          background: "var(--bg)",
                          borderRadius: "12px",
                          padding: "14px",
                          marginBottom: "14px",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--dark)",
                            marginBottom: "8px",
                            lineHeight: 1.3,
                          }}
                        >
                          {lastAttempted.name}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "99px",
                              color: MASTERY_COLORS[lastAttempted.masteryLevel],
                              background:
                                MASTERY_BG[lastAttempted.masteryLevel],
                            }}
                          >
                            {masteryLabel(lastAttempted.masteryLevel)}
                          </span>
                          <span
                            style={{ fontSize: "11px", color: "var(--muted)" }}
                          >
                            Class {lastAttempted.classLevel}
                          </span>
                        </div>
                        {/* Mastery bar */}
                        <div
                          style={{
                            background: "var(--border)",
                            borderRadius: "99px",
                            height: "5px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${lastAttempted.mastery * 100}%`,
                              background:
                                MASTERY_COLORS[lastAttempted.masteryLevel],
                              borderRadius: "99px",
                              transition: "width 0.6s ease",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "var(--muted)",
                            marginTop: "4px",
                          }}
                        >
                          {Math.round(lastAttempted.mastery * 100)}% mastery ·{" "}
                          {lastAttempted.attempts} attempt
                          {lastAttempted.attempts !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const allTopics =
                            Object.values(TOPICS_BY_CLASS).flat();
                          const topic = allTopics.find(
                            (t: any) => t.id === lastAttempted.id,
                          );
                          if (topic)
                            handleGenerate(
                              topic.id,
                              topic.name,
                              topic.classLevel,
                            );
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "11px",
                          borderRadius: "10px",
                          border: "none",
                          background: "var(--accent)",
                          color: "#fff",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "var(--font-ui)",
                          boxShadow: "0 2px 10px rgba(232,68,106,0.25)",
                        }}
                      >
                        Continue <ArrowRight size={13} strokeWidth={2.5} />
                      </button>
                    </>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "20px 0",
                        color: "var(--muted)",
                        fontSize: "13px",
                      }}
                    >
                      <BookOpen
                        size={28}
                        style={{ margin: "0 auto 8px", opacity: 0.3 }}
                      />
                      <p style={{ margin: 0 }}>
                        No sessions yet.
                        <br />
                        Start your first topic below!
                      </p>
                    </div>
                  )}
                </div>

                {/* Recommended next */}
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "16px",
                    }}
                  >
                    <Zap size={13} color="#D97706" strokeWidth={2} />
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#D97706",
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                      }}
                    >
                      Recommended Next
                    </span>
                  </div>

                  {dashLoading ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          style={{
                            height: "44px",
                            borderRadius: "10px",
                            background: "var(--bg)",
                            animation: "pulse 1.5s ease-in-out infinite",
                          }}
                        />
                      ))}
                    </div>
                  ) : recommendations.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {recommendations.map((rec: any) => (
                        <button
                          key={rec.id}
                          onClick={() => {
                            const allTopics =
                              Object.values(TOPICS_BY_CLASS).flat();
                            const topic = allTopics.find(
                              (t: any) => t.id === rec.id,
                            );
                            if (topic)
                              handleGenerate(
                                topic.id,
                                topic.name,
                                topic.classLevel,
                              );
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 12px",
                            borderRadius: "10px",
                            border: "1px solid var(--border)",
                            background: "var(--bg)",
                            cursor: "pointer",
                            fontFamily: "var(--font-ui)",
                            textAlign: "left",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.borderColor = "var(--accent)";
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = "var(--accent-light)";
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.borderColor = "var(--border)";
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = "var(--bg)";
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "var(--dark)",
                                marginBottom: "2px",
                              }}
                            >
                              {rec.name}
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--muted)",
                              }}
                            >
                              Class {rec.classLevel}
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 600,
                                padding: "2px 7px",
                                borderRadius: "99px",
                                color: MASTERY_COLORS[rec.masteryLevel],
                                background: MASTERY_BG[rec.masteryLevel],
                              }}
                            >
                              {masteryLabel(rec.masteryLevel)}
                            </span>
                            <ArrowRight
                              size={12}
                              color="var(--muted)"
                              strokeWidth={2}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "20px 0",
                        color: "var(--muted)",
                        fontSize: "13px",
                      }}
                    >
                      <Sparkles
                        size={28}
                        style={{ margin: "0 auto 8px", opacity: 0.3 }}
                      />
                      <p style={{ margin: 0 }}>
                        Complete some topics to get personalized recommendations
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual explorer */}
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "16px",
                  }}
                >
                  <Brain size={13} color="var(--muted)" strokeWidth={2} />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                    }}
                  >
                    Explore All Topics
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    alignItems: "flex-end",
                  }}
                >
                  {/* Class buttons */}
                  <div style={{ flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--dark)",
                        marginBottom: "8px",
                      }}
                    >
                      Class
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {CLASS_LEVELS.map((cls: any) => (
                        <button
                          key={cls}
                          onClick={() => {
                            setClassLevel(cls);
                            setPreferredClassLevel(cls);
                            setTopicId("");
                          }}
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            border: "1.5px solid",
                            borderColor:
                              classLevel === cls
                                ? "var(--accent)"
                                : "var(--border)",
                            background:
                              classLevel === cls
                                ? "var(--accent)"
                                : "var(--bg)",
                            color: classLevel === cls ? "#fff" : "var(--muted)",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "var(--font-ui)",
                            transition: "all 0.15s",
                          }}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Topic dropdown */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--dark)",
                        marginBottom: "8px",
                      }}
                    >
                      Topic
                    </div>
                    <select
                      value={topicId}
                      onChange={(e) => setTopicId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1.5px solid var(--border)",
                        fontSize: "13px",
                        color: topicId ? "var(--dark)" : "var(--muted)",
                        background: "var(--bg)",
                        outline: "none",
                        fontFamily: "var(--font-ui)",
                        cursor: "pointer",
                      }}
                    >
                      <option value="">— Select a topic —</option>
                      {topics.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Generate button */}
                  <button
                    onClick={() => handleGenerate()}
                    disabled={!topicId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "none",
                      background: topicId ? "var(--accent)" : "#E5D0D5",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: topicId ? "pointer" : "not-allowed",
                      fontFamily: "var(--font-ui)",
                      flexShrink: 0,
                      height: "40px",
                      boxShadow: topicId
                        ? "0 2px 10px rgba(232,68,106,0.25)"
                        : "none",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Sparkles size={13} strokeWidth={2} />
                    Generate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ LOADING ════ */}
        {screen === "loading" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  background: "var(--accent-light)",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <Brain
                  size={28}
                  color="var(--accent)"
                  strokeWidth={2}
                  style={{ animation: "pulse 1.2s ease-in-out infinite" }}
                />
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "var(--dark)",
                  margin: "0 0 6px",
                }}
              >
                Generating your passage...
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--muted)",
                  margin: "0 0 20px",
                }}
              >
                Creating Class {classLevel} content on {selectedTopic?.name}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  justifyContent: "center",
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "var(--accent)",
                      animation: `bounce-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ QUIZ + RESULTS ════ */}
        {(screen === "quiz" || screen === "results") && session && (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {/* Left — Passage */}
            <div
              style={{
                flex: "0 0 60%",
                overflowY: "auto",
                background: "#F9F0F3",
                padding: "32px",
              }}
            >
              <div
                style={{
                  maxWidth: "680px",
                  margin: "0 auto",
                  background: "var(--surface)",
                  borderRadius: "16px",
                  border: "1px solid var(--border)",
                  padding: "40px",
                  boxShadow: "0 2px 20px rgba(0,0,0,0.04)",
                }}
              >
                {/* Tags */}
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    marginBottom: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    {
                      text: `Class ${session.topic.classLevel}`,
                      color: "var(--accent)",
                      bg: "var(--accent-light)",
                    },
                    {
                      text: session.topic.subject,
                      color: "var(--muted)",
                      bg: "var(--bg)",
                    },
                    {
                      text: session.topic.name,
                      color: "var(--muted)",
                      bg: "var(--bg)",
                    },
                  ].map((tag) => (
                    <span
                      key={tag.text}
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "3px 10px",
                        borderRadius: "99px",
                        color: tag.color,
                        background: tag.bg,
                        border: "1px solid var(--border)",
                      }}
                    >
                      {tag.text}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "var(--dark)",
                    margin: "0 0 20px",
                    lineHeight: 1.3,
                    letterSpacing: "-0.3px",
                  }}
                >
                  {session.title}
                </h1>

                <div
                  style={{
                    height: "1px",
                    background: "var(--border)",
                    margin: "0 0 24px",
                  }}
                />

                {/* Passage */}
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "16px",
                    lineHeight: 1.95,
                    color: "#2D1B22",
                    margin: 0,
                    fontWeight: 400,
                  }}
                >
                  {session.passage}
                </p>
              </div>
            </div>

            {/* Right — Quiz */}
            <div
              style={{
                flex: "0 0 40%",
                display: "flex",
                flexDirection: "column",
                borderLeft: "1px solid var(--border)",
                background: "var(--surface)",
                overflow: "hidden",
              }}
            >
              {/* Quiz header */}
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--dark)",
                    }}
                  >
                    5 questions
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--muted)",
                      marginLeft: "8px",
                    }}
                  >
                    {Object.keys(selectedAnswers).length}/5 answered
                  </span>
                </div>
                {screen === "results" && quizResult && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: "99px",
                      color: MASTERY_COLORS[quizResult.mastery.masteryLevel],
                      background: MASTERY_BG[quizResult.mastery.masteryLevel],
                    }}
                  >
                    {quizResult.grade}
                  </span>
                )}
              </div>

              {/* Questions scroll area */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {session.questions.map((q: Question, qi: number) => (
                  <QuestionCard
                    key={qi}
                    question={q}
                    questionIndex={qi}
                    selectedAnswer={selectedAnswers[qi]}
                    result={quizResult?.answerResults[qi]}
                    onSelect={handleSelectAnswer}
                    showResult={screen === "results"}
                    isUnanswered={unansweredQuestions.includes(qi)}
                  />
                ))}
                {screen === "results" && quizResult && (
                  <ResultsPanel result={quizResult} onReset={handleReset} />
                )}
              </div>

              {/* Submit */}
              {screen === "quiz" && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderTop: "1px solid var(--border)",
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "7px",
                      padding: "12px",
                      borderRadius: "10px",
                      border: "none",
                      background: "var(--accent)",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: submitting ? "not-allowed" : "pointer",
                      fontFamily: "var(--font-ui)",
                      boxShadow: "0 2px 10px rgba(232,68,106,0.3)",
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? (
                      <div
                        style={{
                          width: "15px",
                          height: "15px",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "#fff",
                          borderRadius: "50%",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                    ) : (
                      <>
                        <span>Submit Answers</span>
                        <ArrowRight size={14} strokeWidth={2.5} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  questionIndex,
  selectedAnswer,
  result,
  onSelect,
  showResult,
  isUnanswered,
}: {
  question: Question;
  questionIndex: number;
  selectedAnswer: number | undefined;
  result: any;
  onSelect: (qi: number, oi: number) => void;
  showResult: boolean;
  isUnanswered: boolean;
}) {
  const cogLabels: Record<string, string> = {
    recall: "Recall",
    vocabulary: "Vocabulary",
    cause_and_effect: "Cause & Effect",
    inference: "Inference",
    application: "Application",
  };

  const cardBorder = isUnanswered
    ? "#DC2626"
    : showResult
      ? result?.isCorrect
        ? "#059669"
        : "#DC2626"
      : "var(--border)";

  const cardBg = isUnanswered
    ? "#FEF2F2"
    : showResult
      ? result?.isCorrect
        ? "#F0FDF4"
        : "#FEF2F2"
      : "var(--surface)";

  return (
    <div
      id={`question-${questionIndex}`}
      className={isUnanswered ? "shake" : ""}
      style={{
        borderRadius: "12px",
        border: `1.5px solid ${cardBorder}`,
        background: cardBg,
        padding: "14px",
        transition: "border-color 0.2s, background 0.2s",
      }}
    >
      {/* Meta row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {questionIndex + 1}. Multiple Choice
        </span>
        <span style={{ color: "var(--border)", fontSize: "10px" }}>·</span>
        <span style={{ fontSize: "10px", color: "var(--muted)" }}>
          {cogLabels[question.cognitiveLevel] ?? question.cognitiveLevel}
        </span>
        {showResult && (
          <div style={{ marginLeft: "auto" }}>
            {result?.isCorrect ? (
              <CheckCircle2 size={14} color="#059669" strokeWidth={2} />
            ) : (
              <XCircle size={14} color="#DC2626" strokeWidth={2} />
            )}
          </div>
        )}
      </div>

      {/* Question */}
      <p
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--dark)",
          margin: "0 0 12px",
          lineHeight: 1.5,
        }}
      >
        {question.question}
      </p>

      {/* Options 2x2 */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px" }}
      >
        {question.options.map((option, oi) => {
          const isSelected = selectedAnswer === oi;
          const isCorrect = question.correctIndex === oi;
          const isWrong = showResult && isSelected && !isCorrect;

          let borderColor = "var(--border)";
          let bgColor = "var(--bg)";
          let textColor = "var(--dark)";
          let radioBorder = "#D1D5DB";
          let radioFill = "transparent";

          if (showResult && isCorrect) {
            borderColor = "#059669";
            bgColor = "#F0FDF4";
            textColor = "#065F46";
            radioBorder = "#059669";
            radioFill = "#059669";
          } else if (isWrong) {
            borderColor = "#DC2626";
            bgColor = "#FEF2F2";
            textColor = "#991B1B";
            radioBorder = "#DC2626";
            radioFill = "#DC2626";
          } else if (!showResult && isSelected) {
            borderColor = "var(--accent)";
            bgColor = "var(--accent-light)";
            textColor = "var(--accent)";
            radioBorder = "var(--accent)";
            radioFill = "var(--accent)";
          }

          return (
            <button
              key={oi}
              onClick={() => onSelect(questionIndex, oi)}
              disabled={showResult}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "7px",
                padding: "9px 10px",
                borderRadius: "9px",
                border: `1.5px solid ${borderColor}`,
                background: bgColor,
                color: textColor,
                fontSize: "11px",
                textAlign: "left",
                cursor: showResult ? "default" : "pointer",
                fontFamily: "var(--font-ui)",
                lineHeight: 1.4,
                transition: "all 0.15s",
              }}
            >
              {/* Radio */}
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  border: `2px solid ${radioBorder}`,
                  background: radioFill,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: "1px",
                }}
              >
                {(isSelected || (showResult && isCorrect)) && (
                  <div
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: "#fff",
                    }}
                  />
                )}
              </div>
              <span style={{ fontWeight: showResult && isCorrect ? 600 : 400 }}>
                {option}
              </span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showResult && (
        <div
          style={{
            marginTop: "10px",
            padding: "10px 12px",
            borderRadius: "9px",
            background: result?.isCorrect ? "#F0FDF4" : "#FEF2F2",
            border: `1px solid ${result?.isCorrect ? "#BBF7D0" : "#FECACA"}`,
            fontSize: "11px",
            color: result?.isCorrect ? "#065F46" : "#991B1B",
            lineHeight: 1.6,
          }}
        >
          <span style={{ fontWeight: 700 }}>Explanation: </span>
          {question.explanation}
        </div>
      )}
    </div>
  );
}

// ─── Results Panel ────────────────────────────────────────────────────────────

function ResultsPanel({
  result,
  onReset,
}: {
  result: QuizResult;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: "12px",
        border: "1.5px solid var(--border)",
        background: "var(--surface)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* Score */}
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "42px",
            fontWeight: 700,
            color: "var(--dark)",
            lineHeight: 1,
          }}
        >
          {result.score}
          <span
            style={{ fontSize: "20px", color: "var(--muted)", fontWeight: 400 }}
          >
            /{result.total}
          </span>
        </div>
        <p
          style={{ fontSize: "13px", color: "var(--muted)", margin: "6px 0 0" }}
        >
          {result.message}
        </p>
      </div>

      {/* Mastery update */}
      <div
        style={{
          background: "var(--bg)",
          borderRadius: "10px",
          padding: "14px",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            marginBottom: "10px",
          }}
        >
          <TrendingUp size={13} color="var(--accent)" strokeWidth={2} />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "var(--accent)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Mastery Update
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <span
            style={{ fontSize: "13px", fontWeight: 600, color: "var(--dark)" }}
          >
            {result.mastery.topicName}
          </span>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "99px",
              color: MASTERY_COLORS[result.mastery.masteryLevel],
              background: MASTERY_BG[result.mastery.masteryLevel],
            }}
          >
            {masteryLabel(result.mastery.masteryLevel)}
          </span>
        </div>
        <div
          style={{
            background: "var(--border)",
            borderRadius: "99px",
            height: "6px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${result.mastery.newMastery * 100}%`,
              background: MASTERY_COLORS[result.mastery.masteryLevel],
              borderRadius: "99px",
              transition: "width 0.8s ease",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginTop: "6px",
            fontSize: "11px",
          }}
        >
          <span style={{ color: "var(--muted)" }}>
            {Math.round(result.mastery.previousMastery * 100)}%
          </span>
          <span style={{ color: "var(--muted)" }}>→</span>
          <span
            style={{
              fontWeight: 700,
              color: MASTERY_COLORS[result.mastery.masteryLevel],
            }}
          >
            {Math.round(result.mastery.newMastery * 100)}%
          </span>
          <span
            style={{
              color:
                result.mastery.trend === "improving"
                  ? "#059669"
                  : result.mastery.trend === "declining"
                    ? "#DC2626"
                    : "var(--muted)",
              marginLeft: "4px",
            }}
          >
            · {result.mastery.trend}
          </span>
        </div>
      </div>

      {/* Knowledge gaps */}
      {result.knowledgeGaps.length > 0 && (
        <div
          style={{
            background: "#FFFBEB",
            borderRadius: "10px",
            padding: "12px",
            border: "1px solid #FDE68A",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              marginBottom: "8px",
            }}
          >
            <AlertTriangle size={13} color="#D97706" strokeWidth={2} />
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#D97706",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Knowledge Gaps
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {result.knowledgeGaps.map((gap) => (
              <div
                key={gap.topicId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "#92400E",
                    fontWeight: 500,
                  }}
                >
                  {gap.topicName}
                </span>
                <span style={{ fontSize: "11px", color: "#D97706" }}>
                  {Math.round(gap.mastery * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prereq boosts */}
      {result.prerequisiteBoosts.length > 0 && (
        <div
          style={{
            background: "#EFF6FF",
            borderRadius: "10px",
            padding: "12px",
            border: "1px solid #BFDBFE",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              marginBottom: "8px",
            }}
          >
            <Brain size={13} color="#2563EB" strokeWidth={2} />
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#2563EB",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Related Topics Boosted
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {result.prerequisiteBoosts.map((boost) => (
              <div
                key={boost.topicId}
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "#1E40AF",
                    fontWeight: 500,
                  }}
                >
                  {boost.topicName}
                </span>
                <span style={{ fontSize: "11px", color: "#2563EB" }}>
                  +
                  {Math.round((boost.newMastery - boost.previousMastery) * 100)}
                  %
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onReset}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "7px",
          padding: "12px",
          borderRadius: "10px",
          border: "none",
          background: "var(--accent)",
          color: "#fff",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "var(--font-ui)",
          boxShadow: "0 2px 10px rgba(232,68,106,0.3)",
        }}
      >
        <RotateCcw size={13} strokeWidth={2} />
        Try Another Topic
      </button>
    </div>
  );
}
