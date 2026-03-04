<script lang="ts">
    import { format, startOfWeek, addDays } from "date-fns";
    import { appState } from "../stores.js";
    import { TickAPI } from "../api.js";
    import type { TickEntry } from "../types.js";
    import EntryDetails from "./EntryDetails.svelte";

    let api = $state<TickAPI | null>(null);
    let weekStart = $state(new Date());
    let weekDays = $state<Date[]>([]);
    let selectedEntry = $state<TickEntry | null>(null);
    let showEntryDetails = $state(false);

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

    $effect(() => {
        if (
            appState.authConfig &&
            appState.authConfig.token &&
            appState.authConfig.subscriptionId
        ) {
            api = new TickAPI(appState.authConfig);
            api.setSubscription(
                appState.authConfig.subscriptionId,
                appState.authConfig.token,
            );
            if (weekDays.length > 0) {
                loadEntries();
            }
        }
    });

    let normalizedSelectedProject = $derived(
        normalizeProjectId(appState.selectedProject),
    );

    let filteredEntries = $derived(
        appState.entries
            .filter((entry) => {
                if (!normalizedSelectedProject) return true;
                // Check both the included project data and task project_id
                const entryProjectId =
                    entry.project?.id || entry.task?.project_id;
                return String(entryProjectId) === normalizedSelectedProject;
            })
            .sort((a, b) => {
                const dateComparison =
                    new Date(b.date).getTime() - new Date(a.date).getTime();
                if (dateComparison !== 0) return dateComparison;
                return (
                    new Date(b.created_at || "").getTime() -
                    new Date(a.created_at || "").getTime()
                );
            }),
    );

    async function loadEntries() {
        if (!api) return;

        try {
            const startDate = format(weekDays[0], "yyyy-MM-dd");
            const endDate = format(weekDays[weekDays.length - 1], "yyyy-MM-dd");

            const weekEntries = await api.getEntries(startDate, endDate);
            appState.entries = weekEntries;
        } catch (error) {
            console.error("Failed to load entries:", error);
        }
    }

    function navigateWeek(direction: number) {
        appState.selectedDate = addDays(appState.selectedDate, direction * 7);
    }

    function editEntry(entry: TickEntry) {
        selectedEntry = entry;
        showEntryDetails = true;
    }

    function closeEntryDetails() {
        selectedEntry = null;
        showEntryDetails = false;
    }

    function getProjectName(entry: TickEntry): string {
        // Use included project data first, then fallback to store lookup
        if (entry.project) {
            return entry.project.name;
        }

        // Look up by task project_id if available
        if (entry.task?.project_id) {
            const project = appState.projects.find(
                (p) => p.id === entry.task!.project_id.toString(),
            );
            return project ? project.name : "Unknown Project";
        }

        return "No Project";
    }

    function getTaskName(entry: TickEntry): string {
        if (entry.task?.name) return entry.task.name;
        return `Task #${entry.task_id}`;
    }

    function getDayTotalHours(day: Date): number {
        const dayString = format(day, "yyyy-MM-dd");
        const dayEntries = filteredEntries.filter(
            (entry) => entry.date === dayString,
        );
        return dayEntries.reduce((total, entry) => total + entry.hours, 0);
    }

    function getWeekTotalHours(): number {
        return filteredEntries
            .filter((entry) => {
                const entryDate = new Date(entry.date);
                return (
                    entryDate >= weekDays[0] &&
                    entryDate <= weekDays[weekDays.length - 1]
                );
            })
            .reduce((total, entry) => total + entry.hours, 0);
    }

    $effect(() => {
        if (appState.authConfig) {
            loadEntries();
        }
    });
</script>

<div class="timeline-container">
    <div class="timeline-header">
        <div class="week-navigation">
            <button onclick={() => navigateWeek(-1)} class="nav-btn">←</button>
            <h2>Week of {format(weekStart, "MMMM d, yyyy")}</h2>
            <button onclick={() => navigateWeek(1)} class="nav-btn">→</button>
        </div>

        <div class="week-summary">
            <span class="total-hours">Total: {getWeekTotalHours()}h</span>
        </div>
    </div>

    <div class="timeline-content">
        {#each weekDays as day}
            {@const dayTotalHours = getDayTotalHours(day)}
            {@const dayEntries = filteredEntries.filter(
                (entry) => entry.date === format(day, "yyyy-MM-dd"),
            )}

            <div class="day-section">
                <div class="day-header">
                    <div class="day-info">
                        <span class="day-name">{format(day, "EEEE")}</span>
                        <span class="day-date">{format(day, "MMM d")}</span>
                    </div>
                    {#if dayTotalHours > 0}
                        <span class="day-total">{dayTotalHours}h</span>
                    {/if}
                </div>

                {#if dayEntries.length > 0}
                    <div class="entries-list">
                        {#each dayEntries as entry}
                            <div
                                class="entry-item"
                                onclick={() => editEntry(entry)}
                                onkeydown={(e) =>
                                    e.key === "Enter" && editEntry(entry)}
                                role="button"
                                tabindex="0"
                            >
                                <div class="entry-main">
                                    <div class="entry-task">
                                        <span class="task-name"
                                            >{getTaskName(entry)}</span
                                        >
                                        <span class="project-name"
                                            >{getProjectName(entry)}</span
                                        >
                                    </div>
                                    <div class="entry-hours">
                                        {entry.hours}h
                                    </div>
                                </div>

                                {#if entry.notes}
                                    <div class="entry-notes">{entry.notes}</div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="no-entries">No time entries for this day</div>
                {/if}
            </div>
        {/each}
    </div>

    <EntryDetails
        entry={selectedEntry}
        bind:isVisible={showEntryDetails}
        onclose={closeEntryDetails}
        onentryupdated={loadEntries}
        onentrydeleted={loadEntries}
    />
</div>

<style>
    .timeline-container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }

    .timeline-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background: #f7fafc;
        border-bottom: 1px solid #e2e8f0;
    }

    .week-navigation {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .nav-btn {
        background: #3182ce;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        cursor: pointer;
        font-size: 1.2rem;
        transition: background-color 0.2s;
    }

    .nav-btn:hover {
        background: #2c5282;
    }

    .timeline-header h2 {
        margin: 0;
        color: #1a202c;
        font-size: 1.25rem;
        font-weight: 600;
    }

    .week-summary {
        text-align: right;
    }

    .total-hours {
        background: #3182ce;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-weight: 600;
        font-size: 0.875rem;
    }

    .timeline-content {
        padding: 1rem;
    }

    .day-section {
        margin-bottom: 1.5rem;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        overflow: hidden;
    }

    .day-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: #f7fafc;
        border-bottom: 1px solid #e2e8f0;
    }

    .day-info {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
    }

    .day-name {
        font-weight: 600;
        color: #1a202c;
    }

    .day-date {
        font-size: 0.875rem;
        color: #718096;
    }

    .day-total {
        background: #38a169;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .entries-list {
        padding: 0.5rem;
    }

    .entry-item {
        padding: 0.75rem;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
        border-left: 3px solid #3182ce;
        margin-bottom: 0.5rem;
    }

    .entry-item:last-child {
        margin-bottom: 0;
    }

    .entry-item:hover {
        background: #f7fafc;
    }

    .entry-main {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
    }

    .entry-task {
        flex: 1;
    }

    .task-name {
        display: block;
        font-weight: 500;
        color: #1a202c;
        margin-bottom: 2px;
    }

    .project-name {
        display: block;
        font-size: 0.75rem;
        color: #718096;
    }

    .entry-hours {
        font-weight: 600;
        color: #3182ce;
        white-space: nowrap;
    }

    .entry-notes {
        margin-top: 0.5rem;
        font-size: 0.875rem;
        color: #4a5568;
        font-style: italic;
        line-height: 1.4;
    }

    .no-entries {
        padding: 1rem;
        text-align: center;
        color: #a0aec0;
        font-style: italic;
    }
</style>
