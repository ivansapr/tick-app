<script lang="ts">
    import { format } from "date-fns";
    import { appState } from "../stores.js";
    import { TickAPI } from "../api.js";
    import type { TickEntry, TickTask } from "../types.js";

    interface Props {
        entry: TickEntry | null;
        isVisible: boolean;
        onclose?: () => void;
        onentryupdated?: (entry: TickEntry) => void;
        onentrydeleted?: (entry: TickEntry) => void;
        ontaskdeleted?: (task: TickTask) => void;
    }

    let {
        entry = $bindable(),
        isVisible = $bindable(),
        onclose,
        onentryupdated,
        onentrydeleted,
        ontaskdeleted,
    }: Props = $props();

    let editMode = $state(false);
    let editHours = $state(0);
    let editNotes = $state("");
    let fetchedTaskId = $state<string | null>(null);

    let api = $derived(
        appState.authConfig ? new TickAPI(appState.authConfig) : null,
    );

    $effect(() => {
        if (entry) {
            editHours = entry.hours;
            editNotes = entry.notes || "";
            void ensureTaskDetails(entry);
        }
    });

    function close() {
        isVisible = false;
        editMode = false;
        onclose?.();
    }

    function startEdit() {
        editMode = true;
    }

    function cancelEdit() {
        if (entry) {
            editHours = entry.hours;
            editNotes = entry.notes || "";
        }
        editMode = false;
    }

    async function saveEntry() {
        if (!entry || !api || editHours <= 0) return;

        try {
            const updatedEntry = await api.updateEntry(entry.id, {
                hours: editHours,
                notes: editNotes.trim(),
            });

            if (updatedEntry) {
                appState.entries = appState.entries.map((e) =>
                    e.id === entry!.id ? updatedEntry : e,
                );
                entry = updatedEntry;
                editMode = false;
                onentryupdated?.(updatedEntry);
            }
        } catch (error) {
            console.error("Failed to update entry:", error);
        }
    }

    async function deleteEntry() {
        if (!entry || !api) return;

        if (!confirm("Are you sure you want to delete this time entry?"))
            return;

        try {
            const success = await api.deleteEntry(entry.id);

            if (success) {
                appState.entries = appState.entries.filter(
                    (e) => e.id !== entry!.id,
                );
                onentrydeleted?.(entry);
                close();
            }
        } catch (error) {
            console.error("Failed to delete entry:", error);
        }
    }

    async function deleteTask() {
        const currentEntry = entry;
        if (!currentEntry || !api) return;

        const resolvedTask = getResolvedTask();
        if (!resolvedTask) return;

        if (
            !confirm(
                `Are you sure you want to delete task "${resolvedTask.name}" and its related entries?`,
            )
        ) {
            return;
        }

        try {
            const success = await api.deleteTask(resolvedTask.id);
            if (!success) return;

            appState.tasks = appState.tasks.filter(
                (task) => task.id !== resolvedTask.id,
            );
            appState.entries = appState.entries.filter(
                (item) => item.task_id.toString() !== resolvedTask.id,
            );

            ontaskdeleted?.(resolvedTask);
            close();
        } catch (error) {
            console.error("Failed to delete task:", error);
        }
    }

    async function ensureTaskDetails(currentEntry: TickEntry): Promise<void> {
        const taskId = currentEntry.task_id?.toString();
        if (!taskId || currentEntry.task) return;

        const storedTask = appState.tasks.find((task) => task.id === taskId);
        if (storedTask && entry && entry.task_id.toString() === taskId) {
            entry = { ...entry, task: storedTask };
            return;
        }

        if (fetchedTaskId === taskId || !api) return;

        fetchedTaskId = taskId;
        const fetchedTask = await api.getTask(taskId);
        if (!fetchedTask || !entry || entry.task_id.toString() !== taskId)
            return;

        const existing = appState.tasks.some((t) => t.id === fetchedTask.id);
        appState.tasks = existing
            ? appState.tasks.map((t) =>
                  t.id === fetchedTask.id ? fetchedTask : t,
              )
            : [...appState.tasks, fetchedTask];

        entry = { ...entry, task: fetchedTask };
    }

    function getResolvedTask(): TickTask | undefined {
        const currentEntry = entry;
        if (!currentEntry) return undefined;
        if (currentEntry.task) return currentEntry.task;
        return appState.tasks.find(
            (t) => t.id === currentEntry.task_id.toString(),
        );
    }

    function getTaskName(): string {
        return getResolvedTask()?.name || "Unknown Task";
    }

    function getProjectName(): string {
        if (!entry) return "";

        // Use the included project data from API first, then fallback to store
        if (entry.project) return entry.project.name;

        const resolvedTask = getResolvedTask();
        const projectId = resolvedTask?.project_id?.toString();
        if (!projectId) return "No Project";

        const project = appState.projects.find((p) => p.id === projectId);
        return project ? project.name : "No Project";
    }

    function getUserName(): string {
        if (!entry?.user) return "Unknown User";
        return `${entry.user.first_name} ${entry.user.last_name}`;
    }
</script>

{#if isVisible && entry}
    <div class="modal-overlay" onclick={close}>
        <div class="entry-details" onclick={(e) => e.stopPropagation()}>
            <div class="details-header">
                <h3>Time Entry Details</h3>
                <button class="close-btn" onclick={close}>×</button>
            </div>

            <div class="entry-info">
                <div class="info-section">
                    <h4>Time Entry Information</h4>

                    <div class="info-row">
                        <label>Entry ID:</label>
                        <span class="entry-id">#{entry.id}</span>
                    </div>

                    <div class="info-row">
                        <label>Date:</label>
                        <span class="date-display"
                            >{format(
                                new Date(entry.date),
                                "EEEE, MMMM d, yyyy",
                            )}</span
                        >
                    </div>

                    {#if editMode}
                        <div class="info-row">
                            <label for="editHours">Hours Logged:</label>
                            <input
                                id="editHours"
                                type="number"
                                bind:value={editHours}
                                min="0.25"
                                max="24"
                                step="0.25"
                                class="edit-input"
                            />
                        </div>
                    {:else}
                        <div class="info-row">
                            <label>Hours Logged:</label>
                            <span class="hours-display"
                                >{entry.hours} hours</span
                            >
                        </div>
                    {/if}

                    <div class="info-row">
                        <label>User:</label>
                        <span class="user-display">{getUserName()}</span>
                    </div>
                </div>

                <div class="info-section">
                    <h4>Task & Project Details</h4>

                    <div class="info-row">
                        <label>Task:</label>
                        <span class="task-name">{getTaskName()}</span>
                    </div>

                    <div class="info-row">
                        <label>Task ID:</label>
                        <span class="task-id">#{entry.task_id}</span>
                    </div>

                    <div class="info-row">
                        <label>Project:</label>
                        <span
                            class="project-name"
                            style="color: {entry.project?.color || '#3182ce'}"
                        >
                            {getProjectName()}
                        </span>
                    </div>
                </div>

                <div class="info-section">
                    <h4>Notes</h4>

                    {#if editMode}
                        <div class="info-row">
                            <label for="editNotes">Entry Notes:</label>
                            <textarea
                                id="editNotes"
                                bind:value={editNotes}
                                rows="4"
                                class="edit-textarea"
                                placeholder="Add notes about this time entry..."
                            ></textarea>
                        </div>
                    {:else}
                        <div class="notes-container">
                            {#if entry.notes && entry.notes.trim()}
                                <div class="notes-content">{entry.notes}</div>
                            {:else}
                                <div class="no-notes">
                                    No notes added for this time entry
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>

                <div class="info-section">
                    <h4>Timestamps</h4>

                    <div class="info-row">
                        <label>Created:</label>
                        <span class="timestamp"
                            >{format(
                                new Date(entry.created_at),
                                "MMM d, yyyy 'at' h:mm a",
                            )}</span
                        >
                    </div>

                    <div class="info-row">
                        <label>Last Updated:</label>
                        <span class="timestamp"
                            >{format(
                                new Date(entry.updated_at),
                                "MMM d, yyyy 'at' h:mm a",
                            )}</span
                        >
                    </div>

                    {#if entry.url}
                        <div class="info-row">
                            <label>API URL:</label>
                            <span class="api-url">{entry.url}</span>
                        </div>
                    {/if}
                </div>
            </div>

            <div class="actions">
                {#if editMode}
                    <button class="cancel-btn" onclick={cancelEdit}
                        >Cancel</button
                    >
                    <button class="save-btn" onclick={saveEntry}
                        >Save Changes</button
                    >
                {:else}
                    <button class="delete-btn" onclick={deleteEntry}
                        >Delete</button
                    >
                    <button class="delete-btn" onclick={deleteTask}
                        >Delete Task</button
                    >
                    <button class="edit-btn" onclick={startEdit}>Edit</button>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
    }

    .entry-details {
        background: white;
        border-radius: 8px;
        padding: 0;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    .details-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem 2rem 1rem 2rem;
        border-bottom: 1px solid #e2e8f0;
    }

    .details-header h3 {
        margin: 0;
        color: #1a202c;
        font-size: 1.25rem;
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #a0aec0;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .close-btn:hover {
        color: #4a5568;
    }

    .entry-info {
        padding: 1.5rem 2rem;
        max-height: 70vh;
        overflow-y: auto;
    }

    .info-section {
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid #f1f5f9;
    }

    .info-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
    }

    .info-section h4 {
        margin: 0 0 1rem 0;
        color: #1e293b;
        font-size: 1rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-left: 3px solid #3182ce;
        padding-left: 0.75rem;
    }

    .info-row {
        display: flex;
        margin-bottom: 0.75rem;
        align-items: flex-start;
    }

    .info-row label {
        font-weight: 500;
        color: #64748b;
        width: 120px;
        flex-shrink: 0;
        margin-right: 1rem;
        font-size: 0.875rem;
    }

    .info-row span {
        color: #1e293b;
        flex: 1;
        word-wrap: break-word;
        font-size: 0.875rem;
    }

    .entry-id {
        font-family: "Monaco", "Consolas", monospace;
        background: #f8fafc;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-weight: 600;
        color: #475569;
    }

    .date-display {
        color: #1e293b;
        font-weight: 500;
    }

    .hours-display {
        font-weight: 600;
        color: #059669;
        font-size: 1rem;
    }

    .user-display {
        font-weight: 500;
        color: #6366f1;
    }

    .task-name {
        font-weight: 600;
        color: #1e293b;
    }

    .task-id {
        font-family: "Monaco", "Consolas", monospace;
        background: #fef3c7;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        color: #92400e;
    }

    .project-name {
        font-weight: 600;
    }

    .task-description {
        font-style: italic;
        color: #64748b;
        line-height: 1.5;
    }

    .notes-container {
        margin-top: 0.5rem;
    }

    .notes-content {
        background: #f8fafc;
        padding: 1rem;
        border-radius: 6px;
        border-left: 3px solid #3182ce;
        color: #374151;
        line-height: 1.6;
        white-space: pre-wrap;
    }

    .no-notes {
        color: #9ca3af;
        font-style: italic;
        text-align: center;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 6px;
        border: 1px dashed #d1d5db;
    }

    .timestamp {
        font-size: 0.875rem;
        color: #6b7280;
    }

    .api-url {
        font-family: "Monaco", "Consolas", monospace;
        font-size: 0.75rem;
        color: #6366f1;
        background: #ede9fe;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        word-break: break-all;
    }

    .edit-input,
    .edit-textarea {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid #d2d6dc;
        border-radius: 4px;
        font-size: 0.875rem;
    }

    .edit-input:focus,
    .edit-textarea:focus {
        outline: none;
        border-color: #3182ce;
        box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
    }

    .edit-textarea {
        resize: vertical;
        min-height: 60px;
    }

    .actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        padding: 1rem 2rem 1.5rem 2rem;
        border-top: 1px solid #e2e8f0;
    }

    .actions button {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 4px;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 500;
    }

    .edit-btn {
        background: #3182ce;
        color: white;
    }

    .edit-btn:hover {
        background: #2c5282;
    }

    .save-btn {
        background: #38a169;
        color: white;
    }

    .save-btn:hover {
        background: #2f855a;
    }

    .cancel-btn {
        background: #e2e8f0;
        color: #4a5568;
    }

    .cancel-btn:hover {
        background: #cbd5e0;
    }

    .delete-btn {
        background: #e53e3e;
        color: white;
    }

    .delete-btn:hover {
        background: #c53030;
    }
</style>
