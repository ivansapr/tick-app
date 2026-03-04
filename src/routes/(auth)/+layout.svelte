<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { appState } from "$lib/stores.svelte.js";
    import { AuthService } from "$lib/auth.js";
    import EntryForm from "$lib/components/EntryForm.svelte";
    import ProjectFilter from "$lib/components/ProjectFilter.svelte";

    let { children } = $props();
    let entryForm = $state<EntryForm | undefined>(undefined);

    // Redirect to login if not authenticated
    $effect(() => {
        // Wait for auth to be initialized before checking
        if (!appState.isAuthInitialized) {
            return;
        }

        // Check auth state and redirect if needed
        if (!AuthService.isAuthenticated()) {
            goto("/login");
        }
    });

    function showEntryForm() {
        entryForm?.show();
    }

    function handleLogout() {
        AuthService.logout(true);
    }
</script>

{#if !appState.isAuthInitialized}
    <div class="loading">Loading...</div>
{:else if appState.authConfig}
    <main>
        <header>
            <h1>Tick Calendar Client</h1>
            <div class="header-controls">
                <div class="view-toggle">
                    <a
                        href="/calendar"
                        class="view-btn"
                        class:active={$page.url.pathname.includes("/calendar")}
                    >
                        Calendar
                    </a>
                    <a
                        href="/timeline"
                        class="view-btn"
                        class:active={$page.url.pathname.includes("/timeline")}
                    >
                        Timeline
                    </a>
                </div>
                <div class="user-controls">
                    <button
                        type="button"
                        onclick={showEntryForm}
                        class="add-entry-btn"
                    >
                        + Add Time Entry
                    </button>
                    {#if appState.selectedRole}
                        <div class="user-info">
                            <span class="subscription-name"
                                >{appState.selectedRole.subscription.name}</span
                            >
                            <span class="user-email"
                                >{appState.authConfig.email}</span
                            >
                        </div>
                    {/if}
                    <button
                        type="button"
                        onclick={handleLogout}
                        class="logout-btn"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </header>
        <ProjectFilter />
        {@render children()}
        <EntryForm bind:this={entryForm} />
    </main>
{/if}

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
        text-decoration: none;
        display: block;
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

    .user-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .user-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.125rem;
    }

    .subscription-name {
        font-size: 0.875rem;
        font-weight: 500;
        color: #1a202c;
    }

    .user-email {
        font-size: 0.75rem;
        color: #718096;
    }

    .logout-btn {
        background: #e53e3e;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .logout-btn:hover {
        background: #c53030;
    }

    .loading {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f7fafc;
        font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #4a5568;
        font-size: 1.125rem;
    }
</style>
