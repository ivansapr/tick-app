import React from "react";
import { useDrop } from "react-dnd";
import { TickEntry } from "../types/tick";
import TimelineEntry from "./TimelineEntry";

interface DayColumnProps {
  date: Date;
  dateStr: string;
  entries: TickEntry[];
  totalHours: number;
  maxHours: number;
  onMove: (entryId: string, newDate: string, isCopy: boolean) => void;
  onEdit: (entry: TickEntry) => void;
  onDelete: (entryId: string) => void;
  onAddEntry: (date: string) => void;
  getDateLabel: (date: Date) => string;
}

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ItemType = "ENTRY";

const DayColumn: React.FC<DayColumnProps> = ({
  date,
  dateStr,
  entries,
  totalHours,
  maxHours,
  onMove,
  onEdit,
  onDelete,
  onAddEntry,
  getDateLabel,
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemType,
    drop: () => {
      return { date: dateStr };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const heightPercent = Math.min((totalHours / maxHours) * 100, 100);
  const isToday = formatDate(date) === formatDate(new Date());

  return (
    <div
      style={{
        ...styles.dayColumn,
        ...(isToday ? styles.todayColumn : {}),
      }}
    >
      <div
        style={{
          ...styles.dayHeader,
          ...(isToday ? styles.todayHeader : {}),
        }}
      >
        <div style={styles.dayLabel}>
          {getDateLabel(date)} {isToday && "📍"}
        </div>
        <div
          style={{
            ...styles.dayDate,
            ...(isToday ? styles.todayDate : {}),
          }}
        >
          {date.getDate()}
        </div>
        <div style={styles.dayHours}>
          {totalHours.toFixed(1)}h / {maxHours}h
        </div>
      </div>

      <div style={styles.dayContent}>
        <div
          ref={drop}
          style={{
            ...styles.dayTrack,
            height: `${maxHours * 60}px`,
            backgroundColor: isOver && canDrop ? "#e6fffa" : "#f7fafc",
            borderColor: isOver && canDrop ? "#81e6d9" : "#e2e8f0",
          }}
        >
          <div
            style={{
              ...styles.dayProgress,
              height: `${heightPercent}%`,
            }}
          />

          <div style={styles.entriesContainer}>
            {entries.map((entry) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                maxHours={maxHours}
                onMove={onMove}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>

          <button
            onClick={() => onAddEntry(dateStr)}
            style={styles.addButton}
            title="Add entry"
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  dayColumn: {
    display: "flex",
    flexDirection: "column",
    minWidth: "200px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
  },
  todayColumn: {
    boxShadow: "0 4px 16px rgba(102, 126, 234, 0.3)",
    border: "2px solid #667eea",
  },
  dayHeader: {
    padding: "16px",
    borderBottom: "2px solid #e2e8f0",
    backgroundColor: "#f7fafc",
  },
  todayHeader: {
    backgroundColor: "#edf2f7",
    borderBottom: "2px solid #667eea",
  },
  dayLabel: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#2d3748",
    marginBottom: "4px",
  },
  dayDate: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#667eea",
    marginBottom: "8px",
  },
  todayDate: {
    color: "#5a67d8",
  },
  dayHours: {
    fontSize: "12px",
    color: "#718096",
    fontWeight: "600",
  },
  dayContent: {
    padding: "16px",
    flexGrow: 1,
  },
  dayTrack: {
    position: "relative",
    backgroundColor: "#f7fafc",
    borderRadius: "8px",
    border: "2px solid #e2e8f0",
    transition: "all 0.2s",
  },
  dayProgress: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#e6fffa",
    borderTop: "2px solid #81e6d9",
    transition: "height 0.3s",
    pointerEvents: "none",
  },
  entriesContainer: {
    position: "relative",
    height: "100%",
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  addButton: {
    position: "absolute",
    bottom: "8px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#667eea",
    backgroundColor: "white",
    border: "2px dashed #667eea",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s",
    zIndex: 10,
  },
};

export default DayColumn;
