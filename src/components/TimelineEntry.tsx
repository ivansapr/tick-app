import React, { useRef, useState, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import { TickEntry } from "../types/tick";

interface TimelineEntryProps {
  entry: TickEntry;
  maxHours: number;
  onMove: (entryId: number, newDate: string, isCopy: boolean) => void;
  onEdit: (entry: TickEntry) => void;
  onDelete: (entryId: number) => void;
  onUpdateHours: (entryId: number, newHours: number) => void;
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
  onUpdateHours,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const duplicateRef = useRef<HTMLButtonElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const [isDuplicateDragging, setIsDuplicateDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartHours, setResizeStartHours] = useState(0);
  const [currentResizeHours, setCurrentResizeHours] = useState(0);

  // Main drag for moving
  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { type: ItemType, id: entry.id, date: entry.date, isCopy: false },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<{ date: string }>();
      if (
        item &&
        dropResult &&
        dropResult.date &&
        item.date !== dropResult.date
      ) {
        onMove(item.id, dropResult.date, false);
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Duplicate drag for copying
  const [{ isDuplicateDrag }, duplicateDrag] = useDrag({
    type: ItemType,
    item: { type: ItemType, id: entry.id, date: entry.date, isCopy: true },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<{ date: string }>();
      if (item && dropResult && dropResult.date) {
        // Always create a copy, even if same date
        onMove(item.id, dropResult.date, true);
      }
      setIsDuplicateDragging(false);
    },
    collect: (monitor) => ({
      isDuplicateDrag: monitor.isDragging(),
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

  const heightPercent = (entry.hours / maxHours) * 100;
  const projectColor =
    entry.project?.color || entry.task?.project?.color || "#667eea";

  // Attach drag refs
  drag(drop(ref));
  duplicateDrag(duplicateRef);

  useEffect(() => {
    if (isDuplicateDrag) {
      setIsDuplicateDragging(true);
    }
  }, [isDuplicateDrag]);

  // Resize functionality
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartY(e.clientY);
    setResizeStartHours(entry.hours);
    setCurrentResizeHours(entry.hours);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizeStartY;
      // Each 60px represents 1 hour (matching the maxHours * 60px height)
      const hourChange = deltaY / 60;
      const newHours = Math.max(0.5, resizeStartHours + hourChange);
      // Round to nearest 0.5 (30 minutes)
      const roundedHours = Math.round(newHours * 2) / 2;
      setCurrentResizeHours(roundedHours);
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      if (currentResizeHours !== entry.hours) {
        onUpdateHours(entry.id, currentResizeHours);
      }
    };

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [
    isResizing,
    resizeStartY,
    resizeStartHours,
    currentResizeHours,
    entry.id,
    entry.hours,
    onUpdateHours,
  ]);

  const displayHours = isResizing ? currentResizeHours : entry.hours;

  return (
    <div
      ref={ref}
      style={{
        ...styles.entry,
        minHeight: `${Math.max((displayHours / maxHours) * 100 * 4.8, 60)}px`,
        opacity: isDragging || isDuplicateDragging ? 0.5 : 1,
        borderLeftColor: projectColor,
        backgroundColor: isOver ? "#e6fffa" : "white",
        cursor: isResizing ? "ns-resize" : "move",
      }}
    >
      {isResizing && (
        <div style={styles.resizePreview}>
          {entry.hours}h → {currentResizeHours}h
        </div>
      )}
      <div style={styles.entryHeader}>
        <button
          ref={duplicateRef}
          style={{
            ...styles.duplicateButton,
            opacity: isDuplicateDragging ? 0.5 : 1,
            cursor: isDuplicateDragging ? "grabbing" : "grab",
          }}
          className="copy-button"
          title="Drag to duplicate this entry"
          onMouseDown={(e) => e.stopPropagation()}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#edf2f7";
            e.currentTarget.style.borderColor = "#667eea";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#f7fafc";
            e.currentTarget.style.borderColor = "#cbd5e0";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Copy
        </button>
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

      <div
        ref={resizeHandleRef}
        style={styles.resizeHandle}
        className="resize-handle"
        onMouseDown={handleResizeStart}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.backgroundColor = "#f7fafc";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0";
          e.currentTarget.style.backgroundColor = "transparent";
        }}
        title="Drag to resize (30 min increments)"
      >
        <div style={styles.resizeIndicator}>⋮⋮⋮</div>
      </div>
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
    paddingBottom: "20px",
    transition: "all 0.2s",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    position: "relative",
  },
  entryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  duplicateButton: {
    padding: "4px 8px",
    fontSize: "11px",
    fontWeight: "600",
    color: "#667eea",
    backgroundColor: "#f7fafc",
    border: "1px solid #cbd5e0",
    borderRadius: "4px",
    cursor: "grab",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  duplicateButtonHover: {
    backgroundColor: "#edf2f7",
    borderColor: "#667eea",
    transform: "translateY(-1px)",
  },
  entryTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#2d3748",
    flex: 1,
    lineHeight: "1.4",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
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
  resizeHandle: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "16px",
    cursor: "ns-resize",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
    transition: "all 0.2s",
    backgroundColor: "transparent",
  },
  resizeIndicator: {
    fontSize: "12px",
    color: "#667eea",
    letterSpacing: "2px",
    fontWeight: "bold",
  },
  resizePreview: {
    position: "absolute",
    top: "-28px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#667eea",
    color: "white",
    padding: "4px 12px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    zIndex: 1000,
    pointerEvents: "none",
  },
};

export default TimelineEntry;
