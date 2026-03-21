import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useStudentStore } from "../store/student.store";
import { graphApi } from "../lib/api";
import type { StudentGraph, GraphNode } from "../lib/api";
import ForceGraph2D from "react-force-graph-2d";
import { redirect } from "@tanstack/react-router";
import {
  Brain,
  TrendingUp,
  BookOpen,
  Target,
  Sparkles,
  RefreshCw,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/graph")({
  beforeLoad: () => {
    const student = useStudentStore.getState().student;
    if (!student) throw redirect({ to: "/" });
  },
  component: GraphPage,
});

const NODE_COLORS: Record<string, string> = {
  not_started: "#D1B8BE",
  struggling: "#EF4444",
  developing: "#F97316",
  proficient: "#EAB308",
  mastered: "#059669",
};

const MASTERY_LABELS: Record<string, string> = {
  not_started: "Not Started",
  struggling: "Struggling",
  developing: "Developing",
  proficient: "Proficient",
  mastered: "Mastered",
};

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

function GraphPage() {
  const student = useStudentStore((s) => s.student);
  const graphRef = useRef<any>(null);

  const [graph, setGraph] = useState<StudentGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const fetchGraph = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    try {
      const preferredClassLevel =
        useStudentStore.getState().preferredClassLevel;
      const [graphData, recs] = await Promise.all([
        graphApi.getStudentGraph(student.id),
        graphApi.getRecommendations(student.id, "Science", preferredClassLevel),
      ]);
      setGraph(graphData);
      setRecommendations(recs);
    } catch {
      console.error("Failed to fetch graph");
    } finally {
      setLoading(false);
    }
  }, [student]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    const handleFocus = () => fetchGraph();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchGraph]);

  const graphData = graph
    ? {
        nodes: graph.nodes.map((n) => ({
          ...n,
          color: NODE_COLORS[n.masteryLevel] ?? "#D1B8BE",
          size: 4 + n.mastery * 8,
        })),
        links: graph.edges.map((e) => ({
          source: e.source,
          target: e.target,
          type: e.type,
          color: e.type === "REQUIRES" ? "#E5C5CC" : "#EDD9DE",
        })),
      }
    : { nodes: [], links: [] };

  const handleNodeClick = useCallback(
    (node: any) => {
      const fullNode = graph?.nodes.find((n) => n.id === node.id);
      if (fullNode) setSelectedNode(fullNode);
      else setSelectedNode(node as GraphNode);
    },
    [graph],
  );

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D) => {
      const size = node.size ?? 5;
      const color = node.color ?? "#D1B8BE";
      const isSelected = selectedNode?.id === node.id;

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size + 5, 0, 2 * Math.PI);
        ctx.fillStyle = color + "25";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.strokeStyle = isSelected ? "#1A0A0E" : "rgba(255,255,255,0.7)";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      if (node.attempts > 0 || isSelected) {
        const label =
          node.name.length > 22
            ? node.name.substring(0, 20) + "..."
            : node.name;
        ctx.font = `${isSelected ? "bold " : ""}8px Plus Jakarta Sans, sans-serif`;
        ctx.fillStyle = "#1A0A0E";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(label, node.x, node.y + size + 4);
      }
    },
    [selectedNode],
  );

  if (!student) return null;

  return (
    <div
      style={{
        height: "calc(100vh - 52px)",
        display: "flex",
        overflow: "hidden",
        fontFamily: "var(--font-ui)",
      }}
    >
      {/* ── Force Graph ── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: "relative",
          background: "#FFF8F9",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  background: "var(--accent-light)",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <Brain size={24} color="var(--accent)" strokeWidth={2} />
              </div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--dark)",
                  margin: "0 0 4px",
                }}
              >
                Loading your knowledge graph...
              </p>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                Fetching {student.name}'s learning data
              </p>
            </div>
          </div>
        ) : (
          <>
            {dimensions.width > 0 && (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={dimensions.width}
                height={dimensions.height}
                nodeCanvasObject={paintNode}
                nodeCanvasObjectMode={() => "replace"}
                nodePointerAreaPaint={(node: any, color, ctx) => {
                  const size = node.size ?? 5;
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI);
                  ctx.fill();
                }}
                linkColor={(link: any) => link.color}
                linkWidth={(link: any) =>
                  link.type === "REQUIRES" ? 1.2 : 0.6
                }
                linkDirectionalArrowLength={(link: any) =>
                  link.type === "REQUIRES" ? 3 : 0
                }
                linkDirectionalArrowRelPos={1}
                onNodeClick={handleNodeClick}
                backgroundColor="#FFF8F9"
                cooldownTicks={100}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                nodeLabel=""
              />
            )}

            {/* Legend */}
            <div
              style={{
                position: "absolute",
                bottom: "16px",
                left: "16px",
                background: "var(--surface)",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                padding: "12px 14px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  marginBottom: "8px",
                }}
              >
                Mastery Level
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "5px" }}
              >
                {Object.entries(NODE_COLORS).map(([level, color]) => (
                  <div
                    key={level}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                    }}
                  >
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: "11px", color: "var(--dark)" }}>
                      {MASTERY_LABELS[level]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Click hint */}
            {!selectedNode && (
              <div
                style={{
                  position: "absolute",
                  top: "16px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(8px)",
                  borderRadius: "99px",
                  border: "1px solid var(--border)",
                  padding: "6px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <Info size={12} color="var(--muted)" strokeWidth={2} />
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Click any node to see topic details
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Sidebar ── */}
      <div
        style={{
          width: "300px",
          flexShrink: 0,
          borderLeft: "1px solid var(--border)",
          background: "var(--surface)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--dark)",
                  margin: "0 0 2px",
                  textTransform: "capitalize",
                }}
              >
                {student.name}'s Graph
              </h2>
              <p style={{ fontSize: "11px", color: "var(--muted)", margin: 0 }}>
                Science · Class 6–10
              </p>
            </div>
            <button
              onClick={fetchGraph}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--muted)",
              }}
              title="Refresh"
            >
              <RefreshCw size={13} strokeWidth={2} />
            </button>
          </div>

          {/* Stats */}
          {graph && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              {[
                {
                  label: "Topics",
                  value: graph.stats.totalTopics,
                  icon: <BookOpen size={14} />,
                  color: "#6366F1",
                },
                {
                  label: "Attempted",
                  value: graph.stats.attempted,
                  icon: <Target size={14} />,
                  color: "var(--accent)",
                },
                {
                  label: "Mastered",
                  value: graph.stats.mastered,
                  icon: <TrendingUp size={14} />,
                  color: "#059669",
                },
                {
                  label: "Avg Mastery",
                  value: `${Math.round(graph.stats.averageMastery * 100)}%`,
                  icon: <Brain size={14} />,
                  color: "#D97706",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "8px",
                      background: stat.color + "18",
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
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "var(--dark)",
                        lineHeight: 1,
                      }}
                    >
                      {stat.value}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--muted)",
                        marginTop: "1px",
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected node */}
          {selectedNode && (
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  marginBottom: "8px",
                }}
              >
                Selected Topic
              </div>
              <div
                style={{
                  borderRadius: "12px",
                  border: `1.5px solid ${MASTERY_COLORS[selectedNode.masteryLevel]}40`,
                  background: MASTERY_BG[selectedNode.masteryLevel],
                  padding: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "8px",
                    marginBottom: "10px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--dark)",
                      margin: 0,
                      lineHeight: 1.3,
                    }}
                  >
                    {selectedNode.name}
                  </h3>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "99px",
                      color: "#fff",
                      background: MASTERY_COLORS[selectedNode.masteryLevel],
                      flexShrink: 0,
                    }}
                  >
                    {MASTERY_LABELS[selectedNode.masteryLevel]}
                  </span>
                </div>

                {/* Mastery bar */}
                <div style={{ marginBottom: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "10px",
                      color: "var(--muted)",
                      marginBottom: "4px",
                    }}
                  >
                    <span>Mastery</span>
                    <span>{Math.round(selectedNode.mastery * 100)}%</span>
                  </div>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.6)",
                      borderRadius: "99px",
                      height: "5px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${selectedNode.mastery * 100}%`,
                        background: MASTERY_COLORS[selectedNode.masteryLevel],
                        borderRadius: "99px",
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px",
                  }}
                >
                  {[
                    { label: "Attempts", value: selectedNode.attempts },
                    { label: "Class", value: selectedNode.classLevel },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        background: "rgba(255,255,255,0.7)",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        border: "1px solid rgba(255,255,255,0.8)",
                      }}
                    >
                      <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "var(--dark)",
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedNode.trend && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontSize: "11px",
                      color: "var(--muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <TrendingUp size={11} strokeWidth={2} />
                    Trend:
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          selectedNode.trend === "improving"
                            ? "#059669"
                            : selectedNode.trend === "declining"
                              ? "#DC2626"
                              : "var(--muted)",
                      }}
                    >
                      {selectedNode.trend}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  marginBottom: "8px",
                }}
              >
                <Sparkles size={12} color="var(--accent)" strokeWidth={2} />
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                  }}
                >
                  Study Next
                </span>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                {recommendations.map((rec: any) => (
                  <div
                    key={rec.id}
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--dark)",
                          margin: "0 0 2px",
                        }}
                      >
                        {rec.name}
                      </p>
                      <p
                        style={{
                          fontSize: "10px",
                          color: "var(--muted)",
                          margin: 0,
                        }}
                      >
                        Class {rec.classLevel}
                      </p>
                    </div>
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
                      {MASTERY_LABELS[rec.masteryLevel]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mastery breakdown */}
          {graph && (
            <div>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  marginBottom: "8px",
                }}
              >
                Mastery Breakdown
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                {Object.entries(NODE_COLORS).map(([level, color]) => {
                  const count = graph.nodes.filter(
                    (n) => n.masteryLevel === level,
                  ).length;
                  const pct = Math.round(
                    (count / graph.stats.totalTopics) * 100,
                  );
                  return (
                    <div key={level}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          marginBottom: "3px",
                        }}
                      >
                        <span style={{ fontWeight: 500, color: "var(--dark)" }}>
                          {MASTERY_LABELS[level]}
                        </span>
                        <span style={{ color: "var(--muted)" }}>{count}</span>
                      </div>
                      <div
                        style={{
                          background: "var(--border)",
                          borderRadius: "99px",
                          height: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: color,
                            borderRadius: "99px",
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
