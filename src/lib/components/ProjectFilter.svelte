<script lang="ts">
    import { appState } from "../stores.svelte.js";
    import { TickAPI } from "../api.js";

    let isLoading = $state(false);
    let hasLoaded = $state(false);

    async function loadProjects() {
        if (!appState.authConfig || isLoading || hasLoaded) return;

        isLoading = true;
        const api = new TickAPI(appState.authConfig);
        try {
            const loadedProjects = await api.getProjects();
            appState.projects = loadedProjects;
            hasLoaded = true;
        } catch (error) {
            console.error("Failed to load projects:", error);
        } finally {
            isLoading = false;
        }
    }

    function clearFilter() {
        appState.selectedProject = null;
    }

    // Load projects when auth becomes available
    $effect(() => {
        if (appState.authConfig && !hasLoaded && !isLoading) {
            loadProjects();
        }
    });
</script>

<div class="project-filter">
    <label for="projectSelect">Filter by Project:</label>
    <div class="filter-controls">
        <select id="projectSelect" bind:value={appState.selectedProject}>
            <option value="">All Projects</option>
            {#each appState.projects as project}
                <option value={project.id}>{project.name}</option>
            {/each}
        </select>

        {#if appState.selectedProject}
            <button class="clear-btn" onclick={clearFilter}>Clear</button>
        {/if}
    </div>
</div>

<style>
    .project-filter {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 2rem;
        background: #f7fafc;
        border-bottom: 1px solid #e2e8f0;
    }

    .project-filter label {
        font-weight: 500;
        color: #4a5568;
        white-space: nowrap;
    }

    .filter-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    select {
        padding: 0.5rem 0.75rem;
        border: 1px solid #d2d6dc;
        border-radius: 4px;
        font-size: 0.875rem;
        background: white;
        min-width: 200px;
    }

    select:focus {
        outline: none;
        border-color: #3182ce;
        box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
    }

    .clear-btn {
        background: #e2e8f0;
        color: #4a5568;
        border: none;
        border-radius: 4px;
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .clear-btn:hover {
        background: #cbd5e0;
    }
</style>
