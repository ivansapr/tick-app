import React, { useState, useEffect, useCallback } from "react";
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewDays, setViewDays] = useState(7);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRepeatedModal, setShowRepeatedModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TickEntry | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const MAX_DAY_HOURS = 8;

  const loadData = useCallback(async () => {
    if (!api) return;

    setLoading(true);
    try {
      const startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() - Math.floor(viewDays / 2));
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + Math.floor(viewDays / 2));

      const [entriesData, tasksData, projectsData] = await Promise.all([
        api.getEntries(formatDate(startDate), formatDate(endDate)),
        api.getTasks(),
        api.getProjects(),
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

      setEntries(enrichedEntries);
      setTasks(tasksWithProjects);
      setProjects(projectsWithColors);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [api, currentDate, viewDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - Math.floor(viewDays / 2));

    for (let i = 0; i < viewDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dates.push(date);
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

  const navigateDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
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
            <button
              onClick={() => navigateDate(-viewDays)}
              style={styles.navButton}
            >
              ← Previous
            </button>
            <button onClick={goToToday} style={styles.todayButton}>
              Today
            </button>
            <button
              onClick={() => navigateDate(viewDays)}
              style={styles.navButton}
            >
              Next →
            </button>
          </div>
          <div style={styles.viewControls}>
            <label style={styles.label}>View:</label>
            <select
              value={viewDays}
              onChange={(e) => setViewDays(Number(e.target.value))}
              style={styles.select}
            >
              <option value={3}>3 days</option>
              <option value={5}>5 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
            </select>
          </div>
        </div>

        <div style={styles.timelineContainer}>
          <div style={styles.timeline}>
            {getDatesInView().map((date) => {
              const dateStr = formatDate(date);
              const dayEntries = getEntriesForDate(dateStr);
              const totalHours = getTotalHoursForDate(dateStr);

              return (
                <DayColumn
                  key={dateStr}
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
    justifyContent: "space-between",
    alignItems: "center",
  },
  navigation: {
    display: "flex",
    gap: "12px",
  },
  navButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#4a5568",
    backgroundColor: "white",
    border: "1px solid #cbd5e0",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  todayButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
    backgroundColor: "#667eea",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  viewControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#4a5568",
  },
  select: {
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #cbd5e0",
    borderRadius: "6px",
    backgroundColor: "white",
    cursor: "pointer",
  },
  timelineContainer: {
    padding: "32px",
    overflowX: "auto",
  },
  timeline: {
    display: "flex",
    gap: "16px",
    minWidth: "min-content",
  },
};

export default Timeline;
