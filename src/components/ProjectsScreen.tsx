import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { TickProject, TickTask } from "../types/tick";
import { generateProjectColor } from "../lib/utils";

interface ProjectsScreenProps {
  onNavigateToTimeline: () => void;
}

const ProjectsScreen: React.FC<ProjectsScreenProps> = ({
  onNavigateToTimeline,
}) => {
  const { api, subscriptionName, logout } = useAuth();
  const [projects, setProjects] = useState<TickProject[]>([]);
  const [tasks, setTasks] = useState<TickTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(
    new Set(),
  );

  const loadData = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    setError("");
    try {
      const projectsData = await api.getProjects();

      if (!projectsData) {
        setError("Failed to load projects and tasks. Please try again.");
        return;
      }

      const projectsWithColors = projectsData.map((project) => ({
        ...project,
        color: generateProjectColor(project.id),
      }));

      const taskArrays = await Promise.all(
        projectsWithColors.map((p) => api.getTasksByProject(p.id)),
      );
      const allTasks = taskArrays.flatMap((arr) => arr ?? []);

      const tasksWithProjects = allTasks.map((task) => ({
        ...task,
        project: projectsWithColors.find((p) => p.id === task.project_id),
      }));

      setProjects(projectsWithColors);
      setTasks(tasksWithProjects);
      // Expand all projects by default
      setExpandedProjects(new Set(projectsWithColors.map((p) => p.id)));
    } catch {
      setError("An error occurred while loading data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleProject = (projectId: number) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const getTasksForProject = (projectId: number): TickTask[] =>
    tasks.filter((task) => task.project_id === projectId);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading projects and tasks...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Projects & Tasks</h1>
          {subscriptionName && (
            <span style={styles.subtitle}>{subscriptionName}</span>
          )}
        </div>
        <div style={styles.headerRight}>
          <button onClick={loadData} style={styles.refetchButton}>
            ⟳ Refresh
          </button>
          <button onClick={onNavigateToTimeline} style={styles.timelineButton}>
            📅 Timeline
          </button>
          <button onClick={logout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </header>

      <div style={styles.content}>
        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.summary}>
          <span style={styles.summaryText}>
            {projects.length} project{projects.length !== 1 ? "s" : ""} ·{" "}
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </span>
        </div>

        {projects.length === 0 && !error && (
          <div style={styles.emptyState}>No projects found.</div>
        )}

        <div style={styles.projectList}>
          {projects.map((project) => {
            const projectTasks = getTasksForProject(project.id);
            const isExpanded = expandedProjects.has(project.id);
            const openTasks = projectTasks.filter((t) => !t.date_closed);
            const closedTasks = projectTasks.filter((t) => t.date_closed);

            return (
              <div key={project.id} style={styles.projectCard}>
                <button
                  style={styles.projectHeader}
                  onClick={() => toggleProject(project.id)}
                >
                  <div style={styles.projectHeaderLeft}>
                    <span
                      style={{
                        ...styles.projectColorDot,
                        backgroundColor: project.color || "#667eea",
                      }}
                    />
                    <span style={styles.projectName}>{project.name}</span>
                    {project.date_closed && (
                      <span style={styles.closedBadge}>Closed</span>
                    )}
                  </div>
                  <div style={styles.projectHeaderRight}>
                    <span style={styles.taskCount}>
                      {openTasks.length} open
                      {closedTasks.length > 0
                        ? ` · ${closedTasks.length} closed`
                        : ""}
                    </span>
                    <span style={styles.chevron}>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div style={styles.taskList}>
                    {projectTasks.length === 0 && (
                      <div style={styles.noTasks}>No tasks in this project</div>
                    )}
                    {projectTasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          ...styles.taskRow,
                          ...(task.date_closed ? styles.taskRowClosed : {}),
                        }}
                      >
                        <div style={styles.taskInfo}>
                          <span style={styles.taskName}>{task.name}</span>
                          <div style={styles.taskMeta}>
                            {task.billable && (
                              <span style={styles.billableBadge}>Billable</span>
                            )}
                            {task.date_closed && (
                              <span style={styles.closedBadge}>Closed</span>
                            )}
                            {task.budget > 0 && (
                              <span style={styles.budgetBadge}>
                                Budget: {task.budget}h
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f7fafc",
  },
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  header: {
    backgroundColor: "white",
    borderBottom: "1px solid #e2e8f0",
    padding: "20px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  headerRight: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1a202c",
    margin: 0,
  },
  subtitle: {
    fontSize: "14px",
    color: "#718096",
  },
  refetchButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#667eea",
    backgroundColor: "white",
    border: "2px solid #667eea",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  timelineButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#805ad5",
    backgroundColor: "white",
    border: "2px solid #805ad5",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  logoutButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#e53e3e",
    backgroundColor: "white",
    border: "2px solid #e53e3e",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  content: {
    padding: "32px",
    maxWidth: "900px",
    margin: "0 auto",
  },
  errorBanner: {
    padding: "12px 16px",
    backgroundColor: "#fed7d7",
    color: "#c53030",
    borderRadius: "8px",
    fontSize: "14px",
    border: "1px solid #fc8181",
    marginBottom: "16px",
  },
  summary: {
    marginBottom: "20px",
  },
  summaryText: {
    fontSize: "14px",
    color: "#718096",
    fontWeight: "500",
  },
  emptyState: {
    textAlign: "center",
    color: "#718096",
    padding: "48px",
    fontSize: "16px",
  },
  projectList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  projectCard: {
    backgroundColor: "white",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
  },
  projectHeader: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "background-color 0.15s",
  },
  projectHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  projectColorDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  projectName: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1a202c",
  },
  projectHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  taskCount: {
    fontSize: "13px",
    color: "#718096",
    fontWeight: "500",
  },
  chevron: {
    fontSize: "12px",
    color: "#a0aec0",
  },
  taskList: {
    borderTop: "1px solid #f0f4f8",
    padding: "8px 0",
  },
  noTasks: {
    padding: "12px 20px",
    fontSize: "14px",
    color: "#a0aec0",
    fontStyle: "italic",
  },
  taskRow: {
    display: "flex",
    alignItems: "center",
    padding: "10px 20px 10px 44px",
    borderBottom: "1px solid #f7fafc",
    transition: "background-color 0.1s",
  },
  taskRowClosed: {
    opacity: 0.5,
  },
  taskInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
  },
  taskName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#2d3748",
  },
  taskMeta: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  billableBadge: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#38a169",
    backgroundColor: "#f0fff4",
    border: "1px solid #9ae6b4",
    borderRadius: "4px",
    padding: "1px 6px",
  },
  closedBadge: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#718096",
    backgroundColor: "#f7fafc",
    border: "1px solid #cbd5e0",
    borderRadius: "4px",
    padding: "1px 6px",
  },
  budgetBadge: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#667eea",
    backgroundColor: "#ebf4ff",
    border: "1px solid #bee3f8",
    borderRadius: "4px",
    padding: "1px 6px",
  },
};

export default ProjectsScreen;
