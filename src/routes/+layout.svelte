<script lang="ts">
    import { onMount } from "svelte";
    import favicon from "$lib/assets/favicon.svg";
    import { AuthService } from "$lib/auth.js";

    let { children } = $props();

    // Initialize auth state from localStorage on app load
    onMount(() => {
        AuthService.initialize();
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
