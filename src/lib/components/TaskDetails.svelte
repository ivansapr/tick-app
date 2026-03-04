<script lang="ts">
    import { appState } from "../stores.js";
    import { TickAPI } from "../api.js";
    import type { TickTask } from "../types.js";

    interface Props {
        task: TickTask | null;
        isVisible: boolean;
        onclose?: () => void;
        ontaskupdated?: (task: TickTask) => void;
        ontaskdeleted?: (task: TickTask) => void;
    }

    let {
        task = $bindable(),
        isVisible = $bindable(),
        onclose,
        ontaskupdated,
        ontaskdeleted,
    }: Props = $props();

    let isEditing = $state(false);
    let editName = $state("");
    let editDuration = $state(0);
    let editDescription = $state("");

    let api = $derived(
        appState.authConfig ? new TickAPI(appState.authConfig) : null,
    );

    $effect(() => {
        if (task && isVisible) {
            editName = task.name;
            editDuration = Math.round(task.duration / 60);
            editDescription = task.description || "";
            isEditing = false;
        }
    });

    function close() {
        isVisible = false;
        isEditing = false;
        onclose?.();
    }

    function startEdit() {
        isEditing = true;
    }

    function cancelEdit() {
        if (task) {
            editName = task.name;
            editDuration = Math.round(task.duration / 60);
            editDescription = task.description || "";
        }
        isEditing = false;
    }

    async function saveEdit() {
        if (!task || !api || !editName.trim()) return;

        try {
            const updatedTask = await api.updateTask(task.id, {
                name: editName.trim(),
                description: editDescription.trim(),
                duration: editDuration * 60,
            });

            if (updatedTask) {
                appState.tasks = appState.tasks.map((t) =>
                    t.id === task.id ? updatedTask : t,
                );
                task = updatedTask;
                isEditing = false;
                ontaskupdated?.(updatedTask);
            }
        } catch (error) {
            console.error("Failed to update task:", error);
        }
    }

    async function deleteTask() {
        if (!task || !api) return;

        const confirmed = confirm(
            `Are you sure you want to delete "${task.name}"?`,
        );
        if (!confirmed) return;

        try {
            const success = await api.deleteTask(task.id);
            if (success) {
                appState.tasks = appState.tasks.filter((t) => t.id !== task.id);
                close();
                ontaskdeleted?.(task);
            }
        } catch (error) {
            console.error("Failed to delete task:", error);
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            if (isEditing) {
                cancelEdit();
            } else {
                close();
            }
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isVisible && task}
    <div class="modal-overlay" onclick={close}>
        <div class="task-details" onclick={(e) => e.stopPropagation()}>
            <div class="task-header">
                <div
                    class="task-color-indicator"
                    style="background-color: {task.color}"
                ></div>
                {#if isEditing}
                    <input
                        type="text"
                        bind:value={editName}
                        class="edit-title"
                        placeholder="Task name"
                        autofocus
                    />
                {:else}
                    <h2 class="task-title">{task.name}</h2>
                {/if}
                <button class="close-btn" onclick={close}>×</button>
            </div>

            <div class="task-content">
                <div class="task-info">
                    <div class="info-item">
                        <label>Duration:</label>
                        {#if isEditing}
                            <input
                                type="number"
                                bind:value={editDuration}
                                min="0.5"
                                step="0.5"
                                class="edit-input"
                            /> hours
                        {:else}
                            <span>{Math.round(task.duration / 60)} hours</span>
                        {/if}
                    </div>

                    <div class="info-item">
                        <label>Project ID:</label>
                        <span>{task.project_id || "None"}</span>
                    </div>

                    <div class="info-item">
                        <label>Created:</label>
                        <span>{task.date || "Unknown"}</span>
                    </div>
                </div>

                <div class="task-description">
                    <label>Description:</label>
                    {#if isEditing}
                        <textarea
                            bind:value={editDescription}
                            class="edit-textarea"
                            placeholder="Add description..."
                            rows="3"
                        ></textarea>
                    {:else}
                        <p>{task.description || "No description"}</p>
                    {/if}
                </div>
            </div>

            <div class="task-actions">
                {#if isEditing}
                    <button class="save-btn" onclick={saveEdit}>Save</button>
                    <button class="cancel-btn" onclick={cancelEdit}
                        >Cancel</button
                    >
                {:else}
                    <button class="edit-btn" onclick={startEdit}>Edit</button>
                    <button class="delete-btn" onclick={deleteTask}
                        >Delete</button
                    >
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
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .task-details {
        background: white;
        border-radius: 12px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        animation: slideUp 0.2s ease-out;
    }

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .task-header {
        display: flex;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid #e2e8f0;
        gap: 1rem;
    }

    .task-color-indicator {
        width: 4px;
        height: 40px;
        border-radius: 2px;
        flex-shrink: 0;
    }

    .task-title {
        flex: 1;
        margin: 0;
        color: #1a202c;
        font-size: 1.25rem;
        font-weight: 600;
    }

    .edit-title {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid #d2d6dc;
        border-radius: 4px;
        font-size: 1.25rem;
        font-weight: 600;
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #718096;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 4px;
        transition: background-color 0.2s;
    }

    .close-btn:hover {
        background: #f7fafc;
    }

    .task-content {
        padding: 1.5rem;
    }

    .task-info {
        margin-bottom: 1.5rem;
    }

    .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid #f1f5f9;
    }

    .info-item:last-child {
        border-bottom: none;
    }

    .info-item label {
        font-weight: 500;
        color: #4a5568;
        margin-right: 1rem;
    }

    .info-item span {
        color: #1a202c;
    }

    .edit-input {
        width: 80px;
        padding: 0.25rem 0.5rem;
        border: 1px solid #d2d6dc;
        border-radius: 4px;
        text-align: right;
    }

    .task-description label {
        display: block;
        font-weight: 500;
        color: #4a5568;
        margin-bottom: 0.5rem;
    }

    .task-description p {
        color: #1a202c;
        margin: 0;
        line-height: 1.5;
    }

    .edit-textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d2d6dc;
        border-radius: 4px;
        resize: vertical;
        font-family: inherit;
        box-sizing: border-box;
    }

    .task-actions {
        display: flex;
        gap: 0.75rem;
        padding: 1.5rem;
        border-top: 1px solid #e2e8f0;
        justify-content: flex-end;
    }

    .task-actions button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .edit-btn {
        background: #3182ce;
        color: white;
    }

    .edit-btn:hover {
        background: #2c5282;
    }

    .delete-btn {
        background: #e53e3e;
        color: white;
    }

    .delete-btn:hover {
        background: #c53030;
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

    .edit-title:focus,
    .edit-input:focus,
    .edit-textarea:focus {
        outline: none;
        border-color: #3182ce;
        box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
    }
</style>
