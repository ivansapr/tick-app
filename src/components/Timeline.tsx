import React, { useState, useEffect, useCallback, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useAuth } from "../context/AuthContext";
import { TickEntry, TickTask, TickProject } from "../types/tick";
import { generateProjectColor } from "../lib/utils";
import DayColumn from "./DayColumn";
import AddEntryModal from "./AddEntryModal";
import EditEntryModal from "./EditEntryModal";
import AddRepeatedEntryModal from "./AddRepeatedEntryModal";

const Timeline: React.FC = () => {
  const { api, logout, subscriptionName } = useAuth();
  const [entries, setEntries] = useState<TickEntry[]>([]);
  const [tasks, setTasks] = useState<TickTask[]>([]);
  const [projects, setProjects] = useState<TickProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 14); // Start 14 days before today
    return date;
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14); // End 14 days after today
    return date;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRepeatedModal, setShowRepeatedModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TickEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  const MAX_DAY_HOURS = 8;
  const DAYS_TO_LOAD = 14; // Load 14 days at a time

  const loadData = useCallback(
    async (start: Date, end: Date, append: boolean = false) => {
      if (!api || isLoadingRef.current) return;

      isLoadingRef.current = true;
      if (!append) setLoading(true);
      else setIsLoadingMore(true);

      try {
        const [entriesData, tasksData, projectsData] = await Promise.all([
          api.getEntries(formatDate(start), formatDate(end)),
          append
            ? Promise.resolve(tasks.length ? tasks : null)
            : api.getTasks(),
          append
            ? Promise.resolve(projects.length ? projects : null)
            : api.getProjects(),
        ]);

        // Add colors to projects
        const projectsWithColors = projectsData
          ? projectsData.map((project) => ({
              ...project,
              color: generateProjectColor(project.id),
            }))
          : [];

        // Map tasks to projects
        const tasksWithProjects = tasksData
          ? tasksData.map((task) => ({
              ...task,
              project: projectsWithColors.find(
                (p) => p.id === task.project_id.toString(),
              ),
            }))
          : [];

        // Enrich entries with task and project data
        const enrichedEntries = entriesData
          ? entriesData.map((entry) => {
              const task = tasksWithProjects.find(
                (t) => t.id === entry.task_id.toString(),
              );
              return {
                ...entry,
                task,
                project: task?.project,
              };
            })
          : [];

        if (append) {
          // Merge new entries, avoiding duplicates
          setEntries((prev) => {
            const entryMap = new Map(prev.map((e) => [e.id, e]));
            enrichedEntries.forEach((e) => entryMap.set(e.id, e));
            return Array.from(entryMap.values());
          });
        } else {
          setEntries(enrichedEntries);
          setTasks(tasksWithProjects);
          setProjects(projectsWithColors);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
        isLoadingRef.current = false;
      }
    },
    [api, tasks, projects],
  );

  // Initial load
  useEffect(() => {
    loadData(startDate, endDate, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to today on mount
  useEffect(() => {
    if (!loading && scrollContainerRef.current) {
      const today = formatDate(new Date());
      const todayElement = document.querySelector(`[data-date="${today}"]`);
      if (todayElement) {
        todayElement.scrollIntoView({ inline: "center", behavior: "smooth" });
      }
    }
  }, [loading]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isLoadingRef.current) return;

    const container = scrollContainerRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = container;

    // Load more days when scrolling near the end (right)
    if (scrollLeft + clientWidth >= scrollWidth - 200) {
      const newEndDate = new Date(endDate);
      newEndDate.setDate(newEndDate.getDate() + DAYS_TO_LOAD);
      setEndDate(newEndDate);

      const loadStart = new Date(endDate);
      loadStart.setDate(loadStart.getDate() + 1);
      loadData(loadStart, newEndDate, true);
    }

    // Load more days when scrolling near the beginning (left)
    if (scrollLeft <= 200) {
      const newStartDate = new Date(startDate);
      newStartDate.setDate(newStartDate.getDate() - DAYS_TO_LOAD);

      const loadEnd = new Date(startDate);
      loadEnd.setDate(loadEnd.getDate() - 1);

      // Save scroll position
      const previousScrollWidth = container.scrollWidth;

      setStartDate(newStartDate);
      loadData(newStartDate, loadEnd, true).then(() => {
        // Restore scroll position after adding days to the left
        requestAnimationFrame(() => {
          const newScrollWidth = container.scrollWidth;
          container.scrollLeft =
            scrollLeft + (newScrollWidth - previousScrollWidth);
        });
      });
    }
  }, [startDate, endDate, loadData]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDateLabel = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (formatDate(date) === formatDate(today)) return "Today";
    if (formatDate(date) === formatDate(yesterday)) return "Yesterday";
    if (formatDate(date) === formatDate(tomorrow)) return "Tomorrow";

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getDatesInView = (): Date[] => {
    const dates: Date[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const getEntriesForDate = (date: string): TickEntry[] => {
    return entries.filter((entry) => entry.date === date);
  };

  const getTotalHoursForDate = (date: string): number => {
    return getEntriesForDate(date).reduce((sum, entry) => sum + entry.hours, 0);
  };

  const handleMoveEntry = async (
    entryId: string,
    newDate: string,
    isCopy: boolean,
  ) => {
    if (!api) return;

    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    if (isCopy) {
      const newEntry = await api.createEntry({
        task_id: entry.task_id,
        hours: entry.hours,
        notes: entry.notes,
        date: newDate,
      });

      if (newEntry) {
        // Enrich the new entry with task and project data
        const task = tasks.find((t) => t.id === newEntry.task_id.toString());
        const enrichedEntry = {
          ...newEntry,
          task,
          project: task?.project,
        };
        setEntries([...entries, enrichedEntry]);
      }
    } else {
      // Move the entry
      const updated = await api.updateEntry(entryId, { date: newDate });
      if (updated) {
        // Enrich the updated entry
        const task = tasks.find((t) => t.id === updated.task_id.toString());
        const enrichedEntry = {
          ...updated,
          task,
          project: task?.project,
        };
        setEntries(entries.map((e) => (e.id === entryId ? enrichedEntry : e)));
      }
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!api) return;
    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    const success = await api.deleteEntry(entryId);
    if (success) {
      setEntries(entries.filter((e) => e.id !== entryId));
    }
  };

  const handleEditEntry = (entry: TickEntry) => {
    setSelectedEntry(entry);
    setShowEditModal(true);
  };

  const handleAddEntry = (date: string) => {
    setSelectedDate(date);
    setShowAddModal(true);
  };

  const handleEntrySaved = (entry: TickEntry) => {
    // Enrich the entry with task and project data
    const task = tasks.find((t) => t.id === entry.task_id.toString());
    const enrichedEntry = {
      ...entry,
      task,
      project: task?.project,
    };

    const existingIndex = entries.findIndex((e) => e.id === entry.id);
    if (existingIndex >= 0) {
      setEntries(entries.map((e) => (e.id === entry.id ? enrichedEntry : e)));
    } else {
      setEntries([...entries, enrichedEntry]);
    }
  };

  const handleRepeatedEntriesCreated = (newEntries: TickEntry[]) => {
    // Enrich all new entries with task and project data
    const enrichedEntries = newEntries.map((entry) => {
      const task = tasks.find((t) => t.id === entry.task_id.toString());
      return {
        ...entry,
        task,
        project: task?.project,
      };
    });
    setEntries([...entries, ...enrichedEntries]);
  };

  const goToToday = () => {
    if (scrollContainerRef.current) {
      const today = formatDate(new Date());
      const todayElement = document.querySelector(`[data-date="${today}"]`);
      if (todayElement) {
        todayElement.scrollIntoView({ inline: "center", behavior: "smooth" });
      }
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading timeline...</p>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>Tick Timeline</h1>
            {subscriptionName && (
              <span style={styles.subtitle}>{subscriptionName}</span>
            )}
          </div>
          <div style={styles.headerRight}>
            <button
              onClick={() => setShowRepeatedModal(true)}
              style={styles.secondaryButton}
            >
              + Repeated Entry
            </button>
            <button onClick={logout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        </header>

        <div style={styles.controls}>
          <div style={styles.navigation}>
            <button onClick={goToToday} style={styles.todayButton}>
              📍 Go to Today
            </button>
            <div style={styles.scrollHint}>
              ← Scroll horizontally to view more days →
            </div>
          </div>
        </div>

        <div style={styles.timelineContainer} ref={scrollContainerRef}>
          {isLoadingMore && (
            <div style={styles.loadingIndicator}>Loading more days...</div>
          )}
          <div style={styles.timeline}>
            {getDatesInView().map((date) => {
              const dateStr = formatDate(date);
              const dayEntries = getEntriesForDate(dateStr);
              const totalHours = getTotalHoursForDate(dateStr);

              return (
                <div key={dateStr} data-date={dateStr}>
                  <DayColumn
                    date={date}
                    dateStr={dateStr}
                    entries={dayEntries}
                    totalHours={totalHours}
                    maxHours={MAX_DAY_HOURS}
                    onMove={handleMoveEntry}
                    onEdit={handleEditEntry}
                    onDelete={handleDeleteEntry}
                    onAddEntry={handleAddEntry}
                    getDateLabel={getDateLabel}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {showAddModal && (
          <AddEntryModal
            date={selectedDate || formatDate(new Date())}
            tasks={tasks}
            projects={projects}
            api={api!}
            onClose={() => setShowAddModal(false)}
            onSave={handleEntrySaved}
          />
        )}

        {showEditModal && selectedEntry && (
          <EditEntryModal
            entry={selectedEntry}
            tasks={tasks}
            projects={projects}
            api={api!}
            onClose={() => {
              setShowEditModal(false);
              setSelectedEntry(null);
            }}
            onSave={handleEntrySaved}
          />
        )}

        {showRepeatedModal && (
          <AddRepeatedEntryModal
            tasks={tasks}
            projects={projects}
            api={api!}
            onClose={() => setShowRepeatedModal(false)}
            onSave={handleRepeatedEntriesCreated}
          />
        )}
      </div>
    </DndProvider>
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
  secondaryButton: {
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
  controls: {
    backgroundColor: "white",
    borderBottom: "1px solid #e2e8f0",
    padding: "16px 32px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  navigation: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  todayButton: {
    padding: "10px 24px",
    fontSize: "15px",
    fontWeight: "600",
    color: "white",
    backgroundColor: "#667eea",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 2px 4px rgba(102, 126, 234, 0.2)",
  },
  scrollHint: {
    fontSize: "13px",
    color: "#718096",
    fontStyle: "italic",
  },
  timelineContainer: {
    padding: "32px",
    overflowX: "auto",
    position: "relative",
    scrollBehavior: "smooth",
  },
  loadingIndicator: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: "12px 24px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    fontSize: "14px",
    fontWeight: "600",
    color: "#667eea",
    zIndex: 100,
    pointerEvents: "none",
  },
  timeline: {
    display: "flex",
    gap: "16px",
    minWidth: "min-content",
  },
};

export default Timeline;
