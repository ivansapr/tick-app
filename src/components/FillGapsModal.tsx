import React, { useState, useMemo } from "react";
import { TickAPI } from "../lib/api";
import { TickTask, TickProject, TickEntry } from "../types/tick";
import { formatDate } from "../lib/utils";

interface FillGapsModalProps {
  tasks: TickTask[];
  projects: TickProject[];
  entries: TickEntry[];
  api: TickAPI;
  onClose: () => void;
  onSave: (entries: TickEntry[]) => void;
}

interface DayGap {
  date: string;
  loggedHours: number;
  gapHours: number;
}

const FillGapsModal: React.FC<FillGapsModalProps> = ({
  tasks,
  projects,
  entries,
  api,
  onClose,
  onSave,
}) => {
  const today = formatDate(new Date());

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [maxHoursPerDay, setMaxHoursPerDay] = useState<string>("8");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredTasks = selectedProjectId
    ? tasks.filter((task) => task.project_id.toString() === selectedProjectId)
    : tasks;

  const maxHours = parseFloat(maxHoursPerDay) || 8;

  const dayGaps = useMemo<DayGap[]>(() => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    if (start > end) return [];

    const gaps: DayGap[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateStr = formatDate(current);
        const loggedHours = entries
          .filter((e) => e.date === dateStr)
          .reduce((sum, e) => sum + e.hours, 0);
        const gapHours = Math.max(0, maxHours - loggedHours);
        if (gapHours > 0) {
          gaps.push({ date: dateStr, loggedHours, gapHours });
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return gaps;
  }, [startDate, endDate, entries, maxHours]);

  const totalGapHours = dayGaps.reduce((sum, d) => sum + d.gapHours, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!taskId) {
      setError("Please select a task");
      return;
    }

    if (!startDate || !endDate) {
      setError("Please select a date range");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date must be before or equal to end date");
      return;
    }

    if (isNaN(maxHours) || maxHours <= 0) {
      setError("Max hours per day must be a positive number");
      return;
    }

    if (dayGaps.length === 0) {
      setError("No gaps found for this period");
      return;
    }

    setLoading(true);

    try {
      const createdEntries = (
        await Promise.all(
          dayGaps.map((gap) =>
            api.createEntry({
              task_id: parseInt(taskId),
              hours: gap.gapHours,
              notes,
              date: gap.date,
            }),
          ),
        )
      ).filter((e): e is TickEntry => e !== null);

      if (createdEntries.length > 0) {
        onSave(createdEntries);
        onClose();
      } else {
        setError("Failed to create entries");
      }
    } catch {
      setError("An error occurred while creating entries");
    } finally {
      setLoading(false);
    }
  };

  const formatDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Fill Gaps</h2>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.formGroup}>
            <label style={styles.label}>Project (Optional Filter)</label>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setTaskId("");
              }}
              style={styles.select}
              disabled={loading}
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id.toString()}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Task <span style={styles.required}>*</span>
            </label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              required
              style={styles.select}
              disabled={loading}
            >
              <option value="">Select a task</option>
              {filteredTasks.map((task) => (
                <option key={task.id} value={task.id.toString()}>
                  {task.name} {task.project && `(${task.project.name})`}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                From <span style={styles.required}>*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                disabled={loading}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                To <span style={styles.required}>*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                disabled={loading}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Max Hours Per Day</label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              value={maxHoursPerDay}
              onChange={(e) => setMaxHoursPerDay(e.target.value)}
              disabled={loading}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              style={styles.textarea}
              placeholder="Add notes about these entries..."
              rows={2}
            />
          </div>

          {startDate && endDate && (
            <div style={styles.previewSection}>
              <div style={styles.previewHeader}>
                Empty Hours Preview
                {dayGaps.length > 0 && (
                  <span style={styles.previewSummary}>
                    {dayGaps.length} day{dayGaps.length !== 1 ? "s" : ""} •{" "}
                    {totalGapHours.toFixed(2)}h total
                  </span>
                )}
              </div>
              {dayGaps.length === 0 ? (
                <div style={styles.noGaps}>
                  No gaps found — all weekdays in this period are fully logged.
                </div>
              ) : (
                <div style={styles.gapList}>
                  {dayGaps.map((gap) => (
                    <div key={gap.date} style={styles.gapRow}>
                      <span style={styles.gapDate}>
                        {formatDateLabel(gap.date)}
                      </span>
                      <span style={styles.gapLogged}>
                        {gap.loggedHours}h logged
                      </span>
                      <span style={styles.gapFill}>+{gap.gapHours}h</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || dayGaps.length === 0}
              style={{
                ...styles.submitButton,
                ...(loading || dayGaps.length === 0
                  ? styles.submitButtonDisabled
                  : {}),
              }}
            >
              {loading ? "Filling..." : `Fill ${dayGaps.length} Day${dayGaps.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "560px",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
  },
  title: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1a202c",
    margin: 0,
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "32px",
    color: "#718096",
    cursor: "pointer",
    padding: 0,
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  form: {
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1,
  },
  formRow: {
    display: "flex",
    gap: "12px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#2d3748",
  },
  required: {
    color: "#e53e3e",
  },
  input: {
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #cbd5e0",
    borderRadius: "6px",
    outline: "none",
    transition: "border-color 0.2s",
  },
  select: {
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #cbd5e0",
    borderRadius: "6px",
    backgroundColor: "white",
    cursor: "pointer",
    outline: "none",
  },
  textarea: {
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #cbd5e0",
    borderRadius: "6px",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
  },
  error: {
    padding: "12px",
    backgroundColor: "#fed7d7",
    color: "#c53030",
    borderRadius: "6px",
    fontSize: "14px",
    border: "1px solid #fc8181",
  },
  previewSection: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    overflow: "hidden",
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    backgroundColor: "#f7fafc",
    borderBottom: "1px solid #e2e8f0",
    fontSize: "13px",
    fontWeight: "700",
    color: "#2d3748",
  },
  previewSummary: {
    fontWeight: "600",
    color: "#667eea",
  },
  noGaps: {
    padding: "14px",
    fontSize: "13px",
    color: "#718096",
    textAlign: "center",
  },
  gapList: {
    maxHeight: "220px",
    overflowY: "auto",
  },
  gapRow: {
    display: "flex",
    alignItems: "center",
    padding: "8px 14px",
    borderBottom: "1px solid #f0f4f8",
    fontSize: "13px",
    gap: "12px",
  },
  gapDate: {
    flex: 1,
    color: "#2d3748",
    fontWeight: "500",
  },
  gapLogged: {
    color: "#718096",
    minWidth: "72px",
    textAlign: "right",
  },
  gapFill: {
    color: "#38a169",
    fontWeight: "700",
    minWidth: "44px",
    textAlign: "right",
  },
  actions: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    marginTop: "8px",
  },
  cancelButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#4a5568",
    backgroundColor: "white",
    border: "1px solid #cbd5e0",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  submitButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
    backgroundColor: "#38a169",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  submitButtonDisabled: {
    backgroundColor: "#a0aec0",
    cursor: "not-allowed",
  },
};

export default FillGapsModal;
