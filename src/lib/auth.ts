import { goto } from "$app/navigation";
import { appState } from "./stores.svelte.js";
import type { AuthConfig, TickRole } from "./types.js";

/**
 * Centralized authentication service for managing user authentication state
 */
export class AuthService {
  private static readonly STORAGE_KEYS = {
    AUTH: "tickAuth",
    ROLE: "tickRole",
  } as const;

  /**
   * Initialize auth state from localStorage
   * Should be called once on app startup
   */
  static initialize(): void {
    if (typeof window === "undefined") {
      appState.isAuthInitialized = true;
      return;
    }

    const storedAuth = localStorage.getItem(this.STORAGE_KEYS.AUTH);
    const storedRole = localStorage.getItem(this.STORAGE_KEYS.ROLE);

    if (!storedAuth || !storedRole) {
      appState.isAuthInitialized = true;
      return;
    }

    try {
      const config = JSON.parse(storedAuth) as AuthConfig;
      const role = JSON.parse(storedRole) as TickRole;

      // Validate that we have the required auth data
      if (this.isValidAuthConfig(config)) {
        appState.authConfig = config;
        appState.selectedRole = role;
      } else {
        // Invalid stored auth, clear it
        this.clearStorage();
      }
    } catch (e) {
      console.error("Failed to parse stored auth config:", e);
      this.clearStorage();
    } finally {
      appState.isAuthInitialized = true;
    }
  }

  /**
   * Save authentication config after successful role selection
   */
  static saveAuth(role: TickRole, email: string): void {
    const config: AuthConfig = {
      email,
      token: role.api_token,
      subscriptionId: role.subscription_id,
      baseUrl: "https://www.tickspot.com",
    };

    appState.authConfig = config;
    appState.selectedRole = role;

    // Store auth without password for security
    const authToStore: AuthConfig = {
      email,
      token: role.api_token,
      subscriptionId: role.subscription_id,
      baseUrl: "https://www.tickspot.com",
    };

    try {
      localStorage.setItem(this.STORAGE_KEYS.AUTH, JSON.stringify(authToStore));
      localStorage.setItem(this.STORAGE_KEYS.ROLE, JSON.stringify(role));
    } catch (e) {
      console.error("Failed to save auth to localStorage:", e);
    }
  }

  /**
   * Logout user and clear all auth state
   */
  static logout(redirectToLogin = true): void {
    // Clear app state
    appState.authConfig = null;
    appState.selectedRole = null;
    appState.userRoles = [];
    appState.tasks = [];
    appState.entries = [];
    appState.projects = [];
    appState.selectedProject = null;

    // Clear localStorage
    this.clearStorage();

    // Redirect to login page
    if (redirectToLogin) {
      goto("/login");
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return (
      appState.authConfig !== null &&
      this.isValidAuthConfig(appState.authConfig)
    );
  }

  /**
   * Validate auth config has required fields
   */
  private static isValidAuthConfig(config: AuthConfig | null): boolean {
    if (!config) return false;
    return !!(config.token && config.subscriptionId && config.email);
  }

  /**
   * Clear auth data from localStorage
   */
  private static clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEYS.AUTH);
      localStorage.removeItem(this.STORAGE_KEYS.ROLE);
    } catch (e) {
      console.error("Failed to clear auth from localStorage:", e);
    }
  }

  /**
   * Get current user email
   */
  static getUserEmail(): string | null {
    return appState.authConfig?.email || null;
  }

  /**
   * Get current subscription name
   */
  static getSubscriptionName(): string | null {
    return appState.selectedRole?.subscription.name || null;
  }

  /**
   * Get current subscription ID
   */
  static getSubscriptionId(): string | null {
    return appState.authConfig?.subscriptionId || null;
  }

  /**
   * Get auth token
   */
  static getToken(): string | null {
    return appState.authConfig?.token || null;
  }
}
