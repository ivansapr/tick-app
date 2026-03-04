<script lang="ts">
    import { format } from "date-fns";
    import { appState } from "../stores.svelte.js";
    import { TickAPI } from "../api.js";
    import type { TickEntry, TickTask } from "../types.js";

    let isVisible = $state(false);
    let selectedTaskId = $state("");
    let hours = $state(1);
    let notes = $state("");
    let isLoading = $state(false);
    let hasLoaded = $state(false);

    function normalizeProjectId(
        value: string | null | undefined,
    ): string | null {
        if (!value || value === "null" || value === "undefined") return null;
        return value;
    }

    let normalizedSelectedProject = $derived(
        normalizeProjectId(appState.selectedProject),
    );

    let filteredTasks = $derived(
        normalizedSelectedProject
            ? appState.tasks.filter((task) => {
                  const taskProjectId =
                      task.project?.id || String(task.project_id);
                  return taskProjectId === normalizedSelectedProject;
              })
            : appState.tasks,
    );

    export function show() {
        isVisible = true;
        selectedTaskId = "";
        hours = 1;
        notes = "";
        loadProjectsAndTasks();
    }

    function hide() {
        isVisible = false;
    }

    async function loadProjectsAndTasks() {
        if (!appState.authConfig || isLoading || hasLoaded) return;

        isLoading = true;
        const api = new TickAPI(appState.authConfig);
        try {
            const [loadedProjects, loadedTasks] = await Promise.all([
                api.getProjects(),
                api.getTasks(),
            ]);

            appState.projects = loadedProjects;
            appState.tasks = loadedTasks;
            hasLoaded = true;
        } catch (error) {
            console.error("Failed to load projects and tasks:", error);
        } finally {
            isLoading = false;
        }
    }

    async function handleSubmit() {
        if (!selectedTaskId || hours <= 0 || !appState.authConfig) return;

        const api = new TickAPI(appState.authConfig);

        const selectedTask = appState.tasks.find(
            (t) => t.id === selectedTaskId,
        );

        const newEntry: Omit<
            TickEntry,
            "id" | "created_at" | "updated_at" | "user_id" | "url"
        > = {
            task_id: parseInt(selectedTaskId),
            hours,
            notes: notes.trim(),
            date: format(appState.selectedDate, "yyyy-MM-dd"),
        };

        try {
            const createdEntry = await api.createEntry(newEntry);
            if (createdEntry) {
                const project =
                    createdEntry.project ||
                    selectedTask?.project ||
                    appState.projects.find(
                        (p) => p.id === String(selectedTask?.project_id),
                    );
                const entryWithDetails = {
                    ...createdEntry,
                    task: createdEntry.task || selectedTask,
                    project,
                };

                appState.entries = [...appState.entries, entryWithDetails];
                hide();
            }
        } catch (error) {
            console.error("Failed to create entry:", error);
        }
    }

    function getTaskDisplayName(task: TickTask): string {
        // Use included project data first, then fallback to store
        if (task.project) {
            return `${task.project.name} - ${task.name}`;
        }

        const project = appState.projects.find(
            (p) => p.id === task.project_id.toString(),
        );
        return project ? `${project.name} - ${task.name}` : task.name;
    }

    // Load projects and tasks when auth becomes available
    $effect(() => {
        if (appState.authConfig && !hasLoaded && !isLoading) {
            loadProjectsAndTasks();
        }
    });
</script>

{#if isVisible}
    <div class="modal-overlay" onclick={hide}>
        <div class="entry-form" onclick={(e) => e.stopPropagation()}>
            <h3>Add Time Entry</h3>

            <form onsubmit={handleSubmit}>
                <div class="form-group">
                    <label for="projectFilter">Filter by Project:</label>
                    <select
                        id="projectFilter"
                        bind:value={appState.selectedProject}
                    >
                        <option value="">All Projects</option>
                        {#each appState.projects as project}
                            <option value={project.id}>{project.name}</option>
                        {/each}
                    </select>
                </div>

                <div class="form-group">
                    <label for="taskSelect">Task:</label>
                    <select
                        id="taskSelect"
                        bind:value={selectedTaskId}
                        required
                    >
                        <option value="">Select a task</option>
                        {#each filteredTasks as task}
                            <option value={task.id}
                                >{getTaskDisplayName(task)}</option
                            >
                        {/each}
                    </select>
                </div>

                <div class="form-group">
                    <label for="hours">Hours:</label>
                    <input
                        id="hours"
                        type="number"
                        bind:value={hours}
                        min="0.25"
                        max="24"
                        step="0.25"
                        required
                    />
                </div>

                <div class="form-group">
                    <label for="notes">Notes:</label>
                    <textarea
                        id="notes"
                        bind:value={notes}
                        placeholder="Enter notes about this time entry (optional)"
                        rows="3"
                    ></textarea>
                </div>

                <div class="form-info">
                    <p>Date: {format(appState.selectedDate, "MMMM d, yyyy")}</p>
                </div>

                <div class="form-actions">
                    <button type="button" onclick={hide} class="cancel-btn"
                        >Cancel</button
                    >
                    <button type="submit" class="create-btn">Add Entry</button>
                </div>
            </form>
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

    .entry-form {
        background: white;
        border-radius: 8px;
        padding: 2rem;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
    }

    .entry-form h3 {
        margin: 0 0 1.5rem 0;
        color: #1a202c;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #4a5568;
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d2d6dc;
        border-radius: 4px;
        font-size: 1rem;
        box-sizing: border-box;
    }

    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
        outline: none;
        border-color: #3182ce;
        box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
    }

    .form-info {
        background: #f7fafc;
        padding: 1rem;
        border-radius: 4px;
        margin-bottom: 1rem;
    }

    .form-info p {
        margin: 0;
        color: #4a5568;
        font-weight: 500;
    }

    .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 2rem;
    }

    .cancel-btn,
    .create-btn {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .cancel-btn {
        background: #e2e8f0;
        color: #4a5568;
    }

    .cancel-btn:hover {
        background: #cbd5e0;
    }

    .create-btn {
        background: #38a169;
        color: white;
    }

    .create-btn:hover {
        background: #2f855a;
    }
</style>
