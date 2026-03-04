import React, { useRef } from "react";
import { useDrop } from "react-dnd";
import { TickEntry } from "../types/tick";
import TimelineEntry from "./TimelineEntry";

interface DayColumnProps {
  date: Date;
  dateStr: string;
  entries: TickEntry[];
  totalHours: number;
  maxHours: number;
  onMove: (entryId: number, newDate: string, isCopy: boolean) => void;
  onEdit: (entry: TickEntry) => void;
  onDelete: (entryId: number) => void;
  onUpdateHours: (entryId: number, newHours: number) => void;
  onAddEntry: (date: string) => void;
  getDateLabel: (date: Date) => string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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
  onUpdateHours,
  onAddEntry,
  getDateLabel,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const dropRef = useRef<HTMLDivElement>(null);
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

  drop(dropRef);

  const heightPercent = Math.min((totalHours / maxHours) * 100, 100);
  const isToday = formatDate(date) === formatDate(new Date());
  const dayLabel = getDateLabel(date);

  // Collapsed view
  if (isCollapsed) {
    return (
      <div
        style={{
          ...styles.dayColumnCollapsed,
          ...(isToday ? styles.todayColumnCollapsed : {}),
        }}
        onClick={onToggleCollapse}
        title="Click to expand"
      >
        <div style={styles.collapsedContent}>
          <div style={styles.rotatedText}>
            <div style={styles.rotatedDay}>{dayLabel}</div>
            <div style={styles.rotatedDate}>{date.getDate()}</div>
            <div style={styles.rotatedHours}>{totalHours.toFixed(1)}h</div>
          </div>
        </div>
        <div style={styles.expandIndicator}>▶</div>
      </div>
    );
  }

  // Expanded view
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
        <div style={styles.headerTop}>
          <div style={styles.headerLeft}>
            <div style={styles.dayLabel}>
              {dayLabel} {isToday && "📍"}
            </div>
            <div
              style={{
                ...styles.dayDate,
                ...(isToday ? styles.todayDate : {}),
              }}
            >
              {date.getDate()}
            </div>
          </div>
          <div style={styles.headerRight}>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                style={styles.collapseButton}
                title="Collapse"
              >
                ◀
              </button>
            )}
            <button
              onClick={() => onAddEntry(dateStr)}
              style={styles.addButtonHeader}
              title="Add entry"
            >
              + Add
            </button>
          </div>
        </div>
        <div style={styles.dayHours}>
          {totalHours.toFixed(1)}h / {maxHours}h
        </div>
      </div>

      <div style={styles.dayContent}>
        <div
          ref={dropRef}
          style={{
            ...styles.dayTrack,
            minHeight: `${maxHours * 60}px`,
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
                onUpdateHours={onUpdateHours}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  dayColumn: {
    display: "flex",
    flexDirection: "column",
    minWidth: "250px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
    transition: "all 0.3s ease",
  },
  todayColumn: {
    boxShadow: "0 4px 16px rgba(102, 126, 234, 0.3)",
    border: "2px solid #667eea",
  },
  dayColumnCollapsed: {
    display: "flex",
    flexDirection: "column",
    minWidth: "40px",
    width: "40px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    overflow: "visible",
    cursor: "pointer",
    transition: "all 0.3s ease",
    position: "relative",
    alignSelf: "stretch",
    minHeight: "600px",
  },
  todayColumnCollapsed: {
    boxShadow: "0 4px 16px rgba(102, 126, 234, 0.3)",
    border: "2px solid #667eea",
  },
  collapsedContent: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px 0",
  },
  rotatedText: {
    transform: "rotate(-90deg)",
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transformOrigin: "center",
  },
  rotatedDay: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#4a5568",
  },
  rotatedDate: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#667eea",
  },
  rotatedHours: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#718096",
  },
  expandIndicator: {
    position: "absolute",
    top: "8px",
    right: "-12px",
    fontSize: "10px",
    color: "#a0aec0",
    backgroundColor: "white",
    borderRadius: "50%",
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
  dayHeader: {
    padding: "16px",
    borderBottom: "2px solid #e2e8f0",
    backgroundColor: "#f7fafc",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "8px",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  headerRight: {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  },
  todayHeader: {
    backgroundColor: "#edf2f7",
    borderBottom: "2px solid #667eea",
  },
  dayLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#4a5568",
    marginBottom: "4px",
  },
  dayDate: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#667eea",
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
  collapseButton: {
    padding: "6px 8px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#718096",
    backgroundColor: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s",
    flexShrink: 0,
  },
  addButtonHeader: {
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#667eea",
    backgroundColor: "white",
    border: "2px dashed #667eea",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s",
    flexShrink: 0,
  },
};

export default DayColumn;
