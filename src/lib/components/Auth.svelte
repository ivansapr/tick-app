<script lang="ts">
    import { appState } from "../stores.js";
    import { TickAPI } from "../api.js";
    import type { AuthConfig, TickRole } from "../types.js";

    let email = $state("");
    let password = $state("");
    let loginError = $state("");
    let showRoleSelection = $state(false);
    let availableRoles = $state<TickRole[]>([]);

    async function handleAuth() {
        if (!email || !password) {
            loginError = "Please fill in all fields";
            return;
        }

        appState.isLoading = true;
        loginError = "";

        try {
            const config: AuthConfig = {
                email,
                password,
                baseUrl: "https://www.tickspot.com",
            };

            const api = new TickAPI(config);
            const roles = await api.authenticate();

            if (roles && roles.length > 0) {
                availableRoles = roles;
                appState.userRoles = roles;

                if (roles.length === 1) {
                    // Auto-select if only one role
                    selectRole(roles[0]);
                } else {
                    // Show role selection if multiple roles
                    showRoleSelection = true;
                }
            } else {
                loginError = "Invalid email or password";
            }
        } catch (error) {
            loginError =
                "Authentication failed. Please check your credentials.";
            console.error("Auth error:", error);
        } finally {
            appState.isLoading = false;
        }
    }

    function selectRole(role: TickRole) {
        const config: AuthConfig = {
            email,
            password,
            token: role.api_token,
            subscriptionId: role.subscription_id,
            baseUrl: "https://www.tickspot.com",
        };

        appState.authConfig = config;
        appState.selectedRole = role;
        localStorage.setItem("tickAuth", JSON.stringify(config));
        localStorage.setItem("tickRole", JSON.stringify(role));

        showRoleSelection = false;
        password = ""; // Clear password for security
    }

    function handleLogout() {
        appState.authConfig = null;
        appState.selectedRole = null;
        appState.userRoles = [];
        localStorage.removeItem("tickAuth");
        localStorage.removeItem("tickRole");
        email = "";
        password = "";
        loginError = "";
        showRoleSelection = false;
        availableRoles = [];
    }

    // Check for existing auth on mount
    $effect(() => {
        if (typeof window !== "undefined") {
            const storedAuth = localStorage.getItem("tickAuth");
            const storedRole = localStorage.getItem("tickRole");

            if (storedAuth && storedRole) {
                try {
                    const config = JSON.parse(storedAuth);
                    const role = JSON.parse(storedRole);

                    if (config.token && config.subscriptionId && config.email) {
                        appState.authConfig = config;
                        appState.selectedRole = role;
                        email = config.email;
                    }
                } catch (e) {
                    console.error("Failed to parse stored auth config");
                    localStorage.removeItem("tickAuth");
                    localStorage.removeItem("tickRole");
                }
            }
        }
    });
</script>

<div class="auth-container">
    {#if appState.authConfig && appState.selectedRole}
        <div class="auth-status">
            <p>✅ Connected to {appState.selectedRole.subscription.name}</p>
            <small>Logged in as {appState.authConfig.email}</small>
            <button onclick={handleLogout} class="logout-btn">Logout</button>
        </div>
    {:else if showRoleSelection}
        <div class="role-selection">
            <h2>Select Subscription</h2>
            <p>
                You have access to multiple Tick subscriptions. Please select
                one:
            </p>

            <div class="roles-list">
                {#each availableRoles as role}
                    <button class="role-item" onclick={() => selectRole(role)}>
                        <div class="role-name">{role.subscription.name}</div>
                        <div class="role-id">ID: {role.subscription_id}</div>
                    </button>
                {/each}
            </div>

            <button
                onclick={() => (showRoleSelection = false)}
                class="back-btn"
            >
                Back to Login
            </button>
        </div>
    {:else}
        <form onsubmit={handleAuth} class="auth-form">
            <h2>Sign in to Tick</h2>

            {#if loginError}
                <div class="error-message">{loginError}</div>
            {/if}

            <div class="form-group">
                <label for="email">Email:</label>
                <input
                    id="email"
                    type="email"
                    bind:value={email}
                    placeholder="your.email@example.com"
                    required
                />
            </div>

            <div class="form-group">
                <label for="password">Password:</label>
                <input
                    id="password"
                    type="password"
                    bind:value={password}
                    placeholder="Your Tick password"
                    required
                />
            </div>

            <button
                type="submit"
                class="connect-btn"
                disabled={appState.isLoading}
            >
                {appState.isLoading ? "Signing in..." : "Sign In"}
            </button>
        </form>
    {/if}
</div>

<style>
    .auth-container {
        max-width: 400px;
        margin: 2rem auto;
        padding: 2rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: white;
    }

    .auth-form h2 {
        margin: 0 0 1rem 0;
        text-align: center;
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

    .form-group input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d2d6dc;
        border-radius: 4px;
        font-size: 1rem;
        box-sizing: border-box;
    }

    .form-group input:focus {
        outline: none;
        border-color: #3182ce;
        box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
    }

    .connect-btn,
    .logout-btn {
        width: 100%;
        padding: 0.75rem;
        background: #3182ce;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .connect-btn:hover:not(:disabled),
    .logout-btn:hover {
        background: #2c5282;
    }

    .connect-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .logout-btn {
        background: #e53e3e;
        margin-top: 1rem;
    }

    .logout-btn:hover {
        background: #c53030;
    }

    .auth-status {
        text-align: center;
    }

    .auth-status p {
        margin: 0 0 1rem 0;
        color: #38a169;
        font-weight: 500;
    }

    .error-message {
        background: #fed7d7;
        border: 1px solid #fc8181;
        color: #c53030;
        padding: 0.75rem;
        border-radius: 4px;
        margin-bottom: 1rem;
        font-size: 0.9rem;
    }

    .form-group small {
        display: block;
        margin-top: 0.25rem;
        font-size: 0.8rem;
        color: #718096;
        font-style: italic;
    }

    .role-selection {
        text-align: center;
    }

    .role-selection h2 {
        margin: 0 0 0.5rem 0;
        color: #1a202c;
    }

    .role-selection p {
        margin: 0 0 1.5rem 0;
        color: #4a5568;
        font-size: 0.9rem;
    }

    .roles-list {
        margin-bottom: 2rem;
    }

    .role-item {
        width: 100%;
        padding: 1rem;
        margin-bottom: 0.5rem;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
    }

    .role-item:hover {
        border-color: #3182ce;
        background: #f7fafc;
    }

    .role-name {
        font-weight: 500;
        color: #1a202c;
        margin-bottom: 0.25rem;
    }

    .role-id {
        font-size: 0.8rem;
        color: #718096;
    }

    .back-btn {
        background: #e2e8f0;
        color: #4a5568;
        border: none;
        border-radius: 4px;
        padding: 0.75rem 1.5rem;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .back-btn:hover {
        background: #cbd5e0;
    }

    .auth-status small {
        display: block;
        margin-bottom: 1rem;
        color: #718096;
        font-size: 0.8rem;
    }
</style>
