import React, { useRef, useState, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import { TickEntry } from "../types/tick";

interface TimelineEntryProps {
  entry: TickEntry;
  maxHours: number;
  onMove: (entryId: string, newDate: string, isCopy: boolean) => void;
  onEdit: (entry: TickEntry) => void;
  onDelete: (entryId: string) => void;
}

interface DragItem {
  type: string;
  id: string;
  date: string;
}

const ItemType = "ENTRY";

const TimelineEntry: React.FC<TimelineEntryProps> = ({
  entry,
  maxHours,
  onMove,
  onEdit,
  onDelete,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  // Track Ctrl/Cmd key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setIsCtrlPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { type: ItemType, id: entry.id, date: entry.date },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<{ date: string }>();
      if (
        item &&
        dropResult &&
        dropResult.date &&
        item.date !== dropResult.date
      ) {
        onMove(item.id, dropResult.date, isCtrlPressed);
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemType,
    drop: () => {
      return { date: entry.date };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  });

  drag(drop(ref));

  const heightPercent = (entry.hours / maxHours) * 100;
  const projectColor =
    entry.project?.color || entry.task?.project?.color || "#667eea";

  return (
    <div
      ref={ref}
      style={{
        ...styles.entry,
        minHeight: `${Math.max(heightPercent * 4.8, 60)}px`,
        opacity: isDragging ? 0.5 : 1,
        borderLeftColor: projectColor,
        backgroundColor: isOver ? "#e6fffa" : "white",
        cursor: "move",
      }}
    >
      <div style={styles.entryHeader}>
        <div style={styles.entryTitle}>
          {entry.task?.name || "Unknown Task"}
        </div>
        <div style={styles.entryActions}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(entry);
            }}
            style={styles.actionButton}
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            style={styles.actionButton}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      {entry.project && (
        <div style={styles.entryProject}>{entry.project.name}</div>
      )}

      <div style={styles.entryHours}>{entry.hours}h</div>

      {entry.notes && (
        <div style={styles.entryNotes} title={entry.notes}>
          {entry.notes}
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  entry: {
    backgroundColor: "white",
    border: "1px solid #e2e8f0",
    borderLeft: "4px solid #667eea",
    borderRadius: "6px",
    padding: "12px",
    transition: "all 0.2s",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  entryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "8px",
  },
  entryTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#2d3748",
    flex: 1,
    lineHeight: "1.4",
  },
  entryActions: {
    display: "flex",
    gap: "4px",
    opacity: 0.6,
  },
  actionButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    padding: "2px",
    transition: "opacity 0.2s",
  },
  entryProject: {
    fontSize: "12px",
    color: "#718096",
    fontWeight: "500",
  },
  entryHours: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#667eea",
  },
  entryNotes: {
    fontSize: "12px",
    color: "#4a5568",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    lineHeight: "1.4",
  },
};

export default TimelineEntry;
