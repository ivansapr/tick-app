<script lang="ts">
    import { goto } from "$app/navigation";
    import { appState } from "$lib/stores.svelte.js";
    import Auth from "$lib/components/Auth.svelte";

    // Redirect to calendar if already authenticated
    $effect(() => {
        if (appState.authConfig) {
            goto("/calendar");
        }
    });
</script>

<main>
    <div class="login-container">
        <h1>Tick Calendar Client</h1>
        {#if !appState.authConfig}
            <Auth />
        {:else}
            <div class="redirecting">Redirecting to calendar...</div>
        {/if}
    </div>
</main>

<style>
    main {
        min-height: 100vh;
        background: #f7fafc;
        font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .login-container {
        width: 100%;
        max-width: 500px;
        padding: 2rem;
    }

    h1 {
        margin: 0 0 2rem 0;
        color: #1a202c;
        font-size: 1.875rem;
        font-weight: 600;
        text-align: center;
    }

    .redirecting {
        text-align: center;
        padding: 2rem;
        color: #4a5568;
        font-size: 1rem;
    }
</style>
