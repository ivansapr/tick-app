<script lang="ts">
    import { format, startOfWeek, addDays, isSameDay } from "date-fns";
    import { appState } from "../stores.svelte.js";
    import { TickAPI } from "../api.js";
    import type { TickEntry } from "../types.js";
    import EntryDetails from "./EntryDetails.svelte";

    let weekStart = $state(new Date());
    let weekDays = $state<Date[]>([]);
    let selectedEntry = $state<TickEntry | null>(null);
    let showEntryDetails = $state(false);
    let isLoadingEntries = $state(false);
    let loadedWeekKey = $state<string>("");
    const HOURS_IN_DAY = 8;
    const PIXELS_PER_HOUR = 72;
    const DAY_BODY_HEIGHT = HOURS_IN_DAY * PIXELS_PER_HOUR;
    let draggedEntryId = $state<string | null>(null);
    let dragOverDay = $state<string | null>(null);

    function normalizeProjectId(
        value: string | null | undefined,
    ): string | null {
        if (!value || value === "null" || value === "undefined") return null;
        return value;
    }

    $effect(() => {
        weekStart = startOfWeek(appState.selectedDate, { weekStartsOn: 1 });
        weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    });

    // Load entries when auth is ready or week changes
    $effect(() => {
        if (appState.authConfig && weekDays.length > 0) {
            loadEntries();
        }
    });

    let calendarEntries = $derived(appState.entries);

    async function loadEntries() {
        if (!appState.authConfig || weekDays.length === 0) return;

        const startDate = format(weekDays[0], "yyyy-MM-dd");
        const endDate = format(weekDays[weekDays.length - 1], "yyyy-MM-dd");
        const weekKey = `${startDate}_${endDate}`;

        // Skip if already loading or already loaded this week
        if (isLoadingEntries || loadedWeekKey === weekKey) return;

        isLoadingEntries = true;
        loadedWeekKey = weekKey;

        const api = new TickAPI(appState.authConfig);
        api.setSubscription(
            appState.authConfig.subscriptionId!,
            appState.authConfig.token!,
        );

        try {
            const weekEntries = await api.getEntries(startDate, endDate);
            appState.entries = weekEntries;
        } catch (error) {
            console.error("Failed to load entries:", error);
            loadedWeekKey = ""; // Reset on error to allow retry
        } finally {
            isLoadingEntries = false;
        }
    }

    function getEntriesForDay(day: Date): TickEntry[] {
        const dayString = format(day, "yyyy-MM-dd");
        const normalizedSelectedProject = normalizeProjectId(
            appState.selectedProject,
        );

        return calendarEntries.filter((entry) => {
            const matchesDate = entry.date === dayString;
            if (!normalizedSelectedProject) return matchesDate;

            // Check both the included project data and task project_id
            const entryProjectId = entry.project?.id || entry.task?.project_id;
            return (
                matchesDate &&
                String(entryProjectId) === normalizedSelectedProject
            );
        });
    }

    function getSortedEntriesForDay(day: Date): TickEntry[] {
        return [...getEntriesForDay(day)].sort((a, b) => {
            const createdA = new Date(a.created_at || 0).getTime();
            const createdB = new Date(b.created_at || 0).getTime();
            return createdA - createdB;
        });
    }

    function getEntryHeight(entry: TickEntry): number {
        return Math.max(entry.hours * PIXELS_PER_HOUR, 24);
    }

    function getEntryTop(index: number, dayEntries: TickEntry[]): number {
        if (index === 0) return 0;
        const previousHours = dayEntries
            .slice(0, index)
            .reduce((total, item) => total + item.hours, 0);
        return previousHours * PIXELS_PER_HOUR;
    }

    function getEntryStyle(
        entry: TickEntry,
        index: number,
        dayEntries: TickEntry[],
    ): string {
        const top = getEntryTop(index, dayEntries);
        const height = getEntryHeight(entry);
        const background = entry.project?.color || "#3b82f6";
        return `top: ${top}px; height: ${height}px; background-color: ${background}; z-index: ${10 - index};`;
    }

    function getHourMarkers(): number[] {
        return Array.from({ length: HOURS_IN_DAY + 1 }, (_, i) => i);
    }

    function getProjectName(entry: TickEntry): string {
        if (entry.project?.name) return entry.project.name;
        if (entry.task?.project?.name) return entry.task.project.name;
        return "No Project";
    }

    function getTaskName(entry: TickEntry): string {
        if (entry.task?.name) return entry.task.name;
        return `Task #${entry.task_id}`;
    }

    function getEntryCardName(entry: TickEntry): string {
        return `${getProjectName(entry)} - ${getTaskName(entry)}`;
    }

    function handleDayClick(day: Date) {
        appState.selectedDate = day;
    }

    function navigateWeek(direction: number) {
        appState.selectedDate = addDays(appState.selectedDate, direction * 7);
    }

    function editEntry(entry: TickEntry) {
        selectedEntry = entry;
        showEntryDetails = true;
    }

    function handleDragStart(event: DragEvent, entry: TickEntry) {
        draggedEntryId = entry.id;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", entry.id);
        }
    }

    function handleDragEnd() {
        draggedEntryId = null;
        dragOverDay = null;
    }

    function handleDragOver(event: DragEvent, day: Date) {
        event.preventDefault();
        dragOverDay = format(day, "yyyy-MM-dd");
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
    }

    function handleDragLeave(day: Date) {
        const dayString = format(day, "yyyy-MM-dd");
        if (dragOverDay === dayString) {
            dragOverDay = null;
        }
    }

    async function handleDrop(event: DragEvent, day: Date) {
        event.preventDefault();
        if (!appState.authConfig) return;

        const api = new TickAPI(appState.authConfig);
        api.setSubscription(
            appState.authConfig.subscriptionId!,
            appState.authConfig.token!,
        );

        const entryId =
            event.dataTransfer?.getData("text/plain") || draggedEntryId;
        const targetDate = format(day, "yyyy-MM-dd");
        dragOverDay = null;

        if (!entryId) return;
        const entry = calendarEntries.find((item) => item.id === entryId);
        if (!entry || entry.date === targetDate) return;

        const updatedEntry = await api.updateEntry(entryId, {
            date: targetDate,
        });
        if (!updatedEntry) return;

        appState.entries = appState.entries.map((item) =>
            item.id === entryId ? updatedEntry : item,
        );
    }

    function closeEntryDetails() {
        selectedEntry = null;
        showEntryDetails = false;
    }

    function onEntryUpdated() {
        console.log("Entry updated successfully");
    }

    function onEntryDeleted() {
        console.log("Entry deleted successfully");
    }
</script>

<div class="calendar-container">
    <div class="calendar-header">
        <button onclick={() => navigateWeek(-1)} class="nav-btn">←</button>
        <h2>{format(weekStart, "MMMM yyyy")}</h2>
        <button onclick={() => navigateWeek(1)} class="nav-btn">→</button>
    </div>

    <div class="calendar-grid">
        {#each weekDays as day}
            {@const dayString = format(day, "yyyy-MM-dd")}
            {@const dayEntries = getSortedEntriesForDay(day)}
            <div class="day-column">
                <div
                    class="day-header"
                    class:selected={isSameDay(day, appState.selectedDate)}
                    onclick={() => handleDayClick(day)}
                    onkeydown={(e) => e.key === "Enter" && handleDayClick(day)}
                    role="button"
                    tabindex="0"
                >
                    <div class="day-name">{format(day, "EEE")}</div>
                    <div class="day-number">{format(day, "d")}</div>
                </div>

                <div class="entries-stack">
                    <div
                        class="day-time-grid"
                        class:drag-over={dragOverDay === dayString}
                        style="height: {DAY_BODY_HEIGHT}px;"
                        ondragover={(event) => handleDragOver(event, day)}
                        ondrop={(event) => handleDrop(event, day)}
                        ondragleave={() => handleDragLeave(day)}
                    >
                        {#each getHourMarkers() as hour}
                            <div
                                class="hour-line"
                                style="top: {hour * PIXELS_PER_HOUR}px;"
                            >
                                {#if hour < HOURS_IN_DAY}
                                    <span class="hour-label">{hour + 1}h</span>
                                {/if}
                            </div>
                        {/each}

                        {#each dayEntries as entry, index (entry.id)}
                            <div
                                class="entry-block"
                                style={getEntryStyle(entry, index, dayEntries)}
                                onclick={() => editEntry(entry)}
                                onkeydown={(e) =>
                                    e.key === "Enter" && editEntry(entry)}
                                ondragstart={(event) =>
                                    handleDragStart(event, entry)}
                                ondragend={handleDragEnd}
                                draggable="true"
                                role="button"
                                tabindex="0"
                            >
                                <div class="entry-task-name">
                                    {getEntryCardName(entry)}
                                </div>
                                <div class="entry-hours">{entry.hours}h</div>
                                {#if entry.notes}
                                    <div class="entry-notes">{entry.notes}</div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        {/each}
    </div>

    <EntryDetails
        entry={selectedEntry}
        bind:isVisible={showEntryDetails}
        onclose={closeEntryDetails}
        onentryupdated={onEntryUpdated}
        onentrydeleted={onEntryDeleted}
    />
</div>

<style>
    .calendar-container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }

    .calendar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background: #f7fafc;
        border-bottom: 1px solid #e2e8f0;
    }

    .nav-btn {
        background: #3182ce;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        cursor: pointer;
        font-size: 1.2rem;
    }

    .nav-btn:hover {
        background: #2c5282;
    }

    .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 1px;
        background: #e2e8f0;
        min-height: 500px;
    }

    .day-column {
        background: white;
        display: flex;
        flex-direction: column;
        min-height: 500px;
    }

    .day-header {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-bottom: 1px solid #e2e8f0;
        cursor: pointer;
        transition: background-color 0.2s;
        background: #f7fafc;
        flex-shrink: 0;
    }

    .day-header:hover {
        background: #edf2f7;
    }

    .day-header.selected {
        background: #3182ce;
        color: white;
    }

    .day-name {
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
        margin-bottom: 4px;
    }

    .day-number {
        font-size: 1.25rem;
        font-weight: 600;
    }

    .entries-stack {
        flex: 1;
        padding: 0.5rem;
        overflow-y: auto;
    }

    .day-time-grid {
        position: relative;
        border: 1px solid #edf2f7;
        border-radius: 6px;
        background: #ffffff;
    }

    .day-time-grid.drag-over {
        background: #ebf8ff;
        border-color: #90cdf4;
    }

    .hour-line {
        position: absolute;
        left: 0;
        right: 0;
        border-top: 1px dashed #e2e8f0;
        pointer-events: none;
    }

    .hour-label {
        position: absolute;
        top: -10px;
        left: 6px;
        font-size: 0.65rem;
        color: #a0aec0;
        background: white;
        padding: 0 2px;
    }

    .entry-block {
        position: absolute;
        left: 6px;
        right: 6px;
        padding: 0.75rem;
        border-radius: 6px;
        color: white;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
        user-select: none;
    }

    .entry-block:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .entry-task-name {
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 2px;
        word-wrap: break-word;
    }

    .entry-hours {
        font-size: 0.75rem;
        opacity: 0.9;
        font-weight: bold;
    }

    .entry-notes {
        font-size: 0.6rem;
        opacity: 0.8;
        font-style: italic;
        margin-top: 2px;
        word-wrap: break-word;
    }
</style>
