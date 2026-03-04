import React, { useState } from 'react';
import { TickAPI } from '../lib/api';
import { TickTask, TickProject, TickEntry } from '../types/tick';

interface EditEntryModalProps {
  entry: TickEntry;
  tasks: TickTask[];
  projects: TickProject[];
  api: TickAPI;
  onClose: () => void;
  onSave: (entry: TickEntry) => void;
}

const EditEntryModal: React.FC<EditEntryModalProps> = ({
  entry,
  tasks,
  projects,
  api,
  onClose,
  onSave,
}) => {
  const [taskId, setTaskId] = useState<string>(entry.task_id.toString());
  const [hours, setHours] = useState<string>(entry.hours.toString());
  const [notes, setNotes] = useState<string>(entry.notes);
  const [date, setDate] = useState<string>(entry.date);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    entry.task?.project_id?.toString() || entry.project?.id || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredTasks = selectedProjectId
    ? tasks.filter((task) => task.project_id.toString() === selectedProjectId)
    : tasks;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!taskId || !hours || !date) {
      setError('Please fill in all required fields');
      return;
    }

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      setError('Hours must be a positive number');
      return;
    }

    setLoading(true);

    try {
      const updatedEntry = await api.updateEntry(entry.id, {
        task_id: parseInt(taskId),
        hours: hoursNum,
        notes,
        date,
      });

      if (updatedEntry) {
        onSave(updatedEntry);
        onClose();
      } else {
        setError('Failed to update entry');
      }
    } catch (err) {
      setError('An error occurred while updating the entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Edit Entry</h2>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Date <span style={styles.required}>*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={loading}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Project (Optional Filter)</label>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                if (e.target.value) {
                  const firstTask = tasks.find(
                    (t) => t.project_id.toString() === e.target.value
                  );
                  if (firstTask) {
                    setTaskId(firstTask.id);
                  }
                }
              }}
              style={styles.select}
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
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
                <option key={task.id} value={task.id}>
                  {task.name} {task.project && `(${task.project.name})`}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Hours <span style={styles.required}>*</span>
            </label>
            <input
              type="number"
              step="0.25"
              min="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
              disabled={loading}
              style={styles.input}
              placeholder="e.g., 2.5"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              style={styles.textarea}
              placeholder="Add notes about this entry..."
              rows={3}
            />
          </div>

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
              disabled={loading}
              style={{
                ...styles.submitButton,
                ...(loading ? styles.submitButtonDisabled : {}),
              }}
            >
              {loading ? 'Updating...' : 'Update Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a202c',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    color: '#718096',
    cursor: 'pointer',
    padding: 0,
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  form: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  required: {
    color: '#e53e3e',
  },
  input: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    outline: 'none',
  },
  textarea: {
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fed7d7',
    color: '#c53030',
    borderRadius: '6px',
    fontSize: '14px',
    border: '1px solid #fc8181',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    backgroundColor: 'white',
    border: '1px solid #cbd5e0',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#667eea',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  submitButtonDisabled: {
    backgroundColor: '#a0aec0',
    cursor: 'not-allowed',
  },
};

export default EditEntryModal;
