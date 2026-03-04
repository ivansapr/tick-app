import type {
  TickTask,
  AuthConfig,
  TickRole,
  TickEntry,
  TickProject,
} from "./types.js";

class AppState {
  authConfig = $state<AuthConfig | null>(null);
  userRoles = $state<TickRole[]>([]);
  selectedRole = $state<TickRole | null>(null);
  tasks = $state<TickTask[]>([]);
  entries = $state<TickEntry[]>([]);
  projects = $state<TickProject[]>([]);
  selectedDate = $state<Date>(new Date());
  selectedProject = $state<string | null>(null);
  isLoading = $state<boolean>(false);
}

export const appState = new AppState();
