<script lang="ts">
    import { appState } from "../lib/stores.js";
    import Auth from "../lib/components/Auth.svelte";
    import Calendar from "../lib/components/Calendar.svelte";
    import TimelineView from "../lib/components/TimelineView.svelte";
    import EntryForm from "../lib/components/EntryForm.svelte";
    import ProjectFilter from "../lib/components/ProjectFilter.svelte";

    let entryForm: EntryForm;
    let viewMode = $state<"calendar" | "timeline">("calendar");

    function showEntryForm() {
        entryForm.show();
    }

    function toggleView() {
        viewMode = viewMode === "calendar" ? "timeline" : "calendar";
    }
</script>

<main>
    <header>
        <h1>Tick Calendar Client</h1>
        {#if appState.authConfig}
            <div class="header-controls">
                <div class="view-toggle">
                    <button
                        class="view-btn"
                        class:active={viewMode === "calendar"}
                        onclick={() => (viewMode = "calendar")}
                    >
                        Calendar
                    </button>
                    <button
                        class="view-btn"
                        class:active={viewMode === "timeline"}
                        onclick={() => (viewMode = "timeline")}
                    >
                        Timeline
                    </button>
                </div>
                <button onclick={showEntryForm} class="add-entry-btn">
                    + Add Time Entry
                </button>
            </div>
        {/if}
    </header>

    {#if !appState.authConfig}
        <Auth />
    {:else}
        <ProjectFilter />
        {#if viewMode === "calendar"}
            <Calendar />
        {:else}
            <TimelineView />
        {/if}
        <EntryForm bind:this={entryForm} />
    {/if}
</main>

<style>
    main {
        min-height: 100vh;
        background: #f7fafc;
        font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background: white;
        border-bottom: 1px solid #e2e8f0;
        margin-bottom: 0;
    }

    .header-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .view-toggle {
        display: flex;
        background: #f7fafc;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid #e2e8f0;
    }

    .view-btn {
        background: transparent;
        border: none;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
        color: #4a5568;
    }

    .view-btn:hover {
        background: #e2e8f0;
    }

    .view-btn.active {
        background: #3182ce;
        color: white;
    }

    h1 {
        margin: 0;
        color: #1a202c;
        font-size: 1.5rem;
        font-weight: 600;
    }

    .add-entry-btn {
        background: #38a169;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .add-entry-btn:hover {
        background: #2f855a;
    }
</style>
