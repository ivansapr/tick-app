<script lang="ts">
    import { format } from "date-fns";
    import { appState } from "../stores.js";
    import { TickAPI } from "../api.js";
    import type { TickTask } from "../types.js";

    interface Props {
        ontaskcreated?: (task: TickTask) => void;
    }

    let { ontaskcreated }: Props = $props();

    let isVisible = $state(false);
    let taskName = $state("");
    let taskDescription = $state("");
    let startTime = $state("09:00");
    let duration = $state(60);
    let selectedColor = $state("#3b82f6");

    let api = $derived(
        appState.authConfig ? new TickAPI(appState.authConfig) : null,
    );

    const colors = [
        "#3b82f6",
        "#ef4444",
        "#10b981",
        "#f59e0b",
        "#8b5cf6",
        "#06b6d4",
        "#84cc16",
        "#f97316",
    ];

    export function show() {
        isVisible = true;
        taskName = "";
        taskDescription = "";
        startTime = "09:00";
        duration = 60;
    }

    function hide() {
        isVisible = false;
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (!taskName.trim() || !api) return;

        const newTask: Omit<TickTask, "id"> = {
            name: taskName.trim(),
            description: taskDescription.trim(),
            start_time: startTime,
            end_time: minutesToTime(timeToMinutes(startTime) + duration),
            duration,
            date: format(appState.selectedDate, "yyyy-MM-dd"),
            color: selectedColor,
            project_id: "1", // Default project - should be configurable
        };

        try {
            const createdTask = await api.createTask(newTask);
            if (createdTask) {
                appState.tasks = [...appState.tasks, createdTask];
                ontaskcreated?.(createdTask);
                hide();
            }
        } catch (error) {
            console.error("Failed to create task:", error);
        }
    }

    function timeToMinutes(time: string): number {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
    }

    function minutesToTime(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    }

    function handleDurationChange(event: Event) {
        const target = event.target as HTMLInputElement;
        duration = parseInt(target.value);
    }
</script>

{#if isVisible}
    <div class="modal-overlay" onclick={hide}>
        <div class="task-form" onclick={(e) => e.stopPropagation()}>
            <h3>Create New Task</h3>

            <form onsubmit={handleSubmit}>
                <div class="form-group">
                    <label for="taskName">Task Name:</label>
                    <input
                        id="taskName"
                        type="text"
                        bind:value={taskName}
                        placeholder="Enter task name"
                        required
                    />
                </div>

                <div class="form-group">
                    <label for="taskDescription">Description:</label>
                    <textarea
                        id="taskDescription"
                        bind:value={taskDescription}
                        placeholder="Enter task description (optional)"
                        rows="2"
                    ></textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="startTime">Start Time:</label>
                        <input
                            id="startTime"
                            type="time"
                            bind:value={startTime}
                            required
                        />
                    </div>

                    <div class="form-group">
                        <label for="duration">Duration (minutes):</label>
                        <input
                            id="duration"
                            type="number"
                            value={duration}
                            min="15"
                            step="15"
                            oninput={handleDurationChange}
                            required
                        />
                    </div>
                </div>

                <div class="form-group">
                    <label>Color:</label>
                    <div class="color-picker">
                        {#each colors as color}
                            <button
                                type="button"
                                class="color-option"
                                class:selected={selectedColor === color}
                                style="background-color: {color};"
                                onclick={() => (selectedColor = color)}
                            ></button>
                        {/each}
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" onclick={hide} class="cancel-btn"
                        >Cancel</button
                    >
                    <button type="submit" class="create-btn">Create Task</button
                    >
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

    .task-form {
        background: white;
        border-radius: 8px;
        padding: 2rem;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
    }

    .task-form h3 {
        margin: 0 0 1.5rem 0;
        color: #1a202c;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #4a5568;
    }

    .form-group input,
    .form-group textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d2d6dc;
        border-radius: 4px;
        font-size: 1rem;
        box-sizing: border-box;
    }

    .form-group input:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: #3182ce;
        box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
    }

    .color-picker {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .color-option {
        width: 32px;
        height: 32px;
        border: 2px solid transparent;
        border-radius: 50%;
        cursor: pointer;
        transition: border-color 0.2s;
    }

    .color-option:hover,
    .color-option.selected {
        border-color: #1a202c;
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
        background: #3182ce;
        color: white;
    }

    .create-btn:hover {
        background: #2c5282;
    }
</style>
