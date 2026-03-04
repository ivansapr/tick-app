import axios from "axios";
import type {
  TickTask,
  TickProject,
  AuthConfig,
  TickRole,
  TickEntry,
} from "./types.js";

export class TickAPI {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
    if (config.token && config.subscriptionId) {
      axios.defaults.baseURL = `https://www.tickspot.com/${config.subscriptionId}/api/v2`;
      axios.defaults.headers.common["Authorization"] =
        `Token token=${config.token}`;
    }
    axios.defaults.headers.common["User-Agent"] =
      `TickClient (${config.email})`;
  }

  async authenticate(): Promise<TickRole[] | null> {
    try {
      const response = await axios.get(
        "https://www.tickspot.com/api/v2/roles.json",
        {
          auth: {
            username: this.config.email,
            password: this.config.password,
          },
          headers: {
            "User-Agent": `TickClient (${this.config.email})`,
          },
        },
      );

      return response.data as TickRole[];
    } catch (error) {
      console.error("Authentication failed:", error);
      return null;
    }
  }

  setSubscription(subscriptionId: string, token: string) {
    this.config.subscriptionId = subscriptionId;
    this.config.token = token;
    axios.defaults.baseURL = `https://www.tickspot.com/${subscriptionId}/api/v2`;
    axios.defaults.headers.common["Authorization"] = `Token token=${token}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.config.token || !this.config.subscriptionId) {
        return false;
      }
      const response = await axios.get("/users.json");
      return response.status === 200;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }

  async getTasks(): Promise<TickTask[]> {
    try {
      console.log("Fetching tasks...");
      console.log("API Base URL:", axios.defaults.baseURL);
      console.log(
        "Authorization header:",
        axios.defaults.headers.common["Authorization"],
      );

      const response = await axios.get("/tasks.json");
      console.log("API Response:", response.data);

      if (Array.isArray(response.data)) {
        return response.data.map(this.mapTickTask);
      } else {
        console.error("Unexpected API response format:", response.data);
        return [];
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      if (axios.isAxiosError(error)) {
        console.error("Response status:", error.response?.status);
        console.error("Response data:", error.response?.data);
      }
      return [];
    }
  }

  async getTask(id: string): Promise<TickTask | null> {
    try {
      const response = await axios.get(`/tasks/${id}.json`);
      return this.mapTickTask(response.data);
    } catch (error) {
      console.error("Failed to fetch task:", error);
      return null;
    }
  }

  async createTask(
    task: Omit<TickTask, "id" | "url" | "created_at" | "updated_at">,
  ): Promise<TickTask | null> {
    try {
      const response = await axios.post("/tasks.json", {
        name: task.name,
        project_id: task.project_id,
        billable: task.billable,
        budget: task.budget,
      });
      return this.mapTickTask(response.data);
    } catch (error) {
      console.error("Failed to create task:", error);
      return null;
    }
  }

  async updateTask(
    id: string,
    task: Partial<TickTask>,
  ): Promise<TickTask | null> {
    try {
      const response = await axios.put(`/tasks/${id}.json`, {
        name: task.name,
        project_id: task.project_id,
        budget: task.budget,
        billable: task.billable,
      });
      return this.mapTickTask(response.data);
    } catch (error) {
      console.error("Failed to update task:", error);
      return null;
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    try {
      await axios.delete(`/tasks/${id}.json`);
      return true;
    } catch (error) {
      console.error("Failed to delete task:", error);
      return false;
    }
  }

  async getProjects(): Promise<TickProject[]> {
    try {
      const response = await axios.get("/projects.json");
      return response.data.map(this.mapTickProject);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      return [];
    }
  }

  async getEntries(startDate?: string, endDate?: string): Promise<TickEntry[]> {
    try {
      let url = "/entries.json";
      const params = new URLSearchParams();

      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      if (params.toString()) {
        url += "?" + params.toString();
      }

      const response = await axios.get(url);
      const mappedEntries = response.data.map(this.mapTickEntry);
      return await this.enrichEntries(mappedEntries);
    } catch (error) {
      console.error("Failed to fetch entries:", error);
      return [];
    }
  }

  async createEntry(
    entry: Omit<
      TickEntry,
      "id" | "created_at" | "updated_at" | "user_id" | "url"
    >,
  ): Promise<TickEntry | null> {
    try {
      const response = await axios.post("/entries.json", {
        task_id: entry.task_id,
        hours: entry.hours,
        notes: entry.notes,
        date: entry.date,
      });
      const createdEntry = this.mapTickEntry(response.data);
      const [enrichedEntry] = await this.enrichEntries([createdEntry]);
      return enrichedEntry;
    } catch (error) {
      console.error("Failed to create entry:", error);
      return null;
    }
  }

  async updateEntry(
    id: string,
    entry: Partial<TickEntry>,
  ): Promise<TickEntry | null> {
    try {
      const response = await axios.put(`/entries/${id}.json`, {
        task_id: entry.task_id,
        hours: entry.hours,
        notes: entry.notes,
        date: entry.date,
      });
      const updatedEntry = this.mapTickEntry(response.data);
      const [enrichedEntry] = await this.enrichEntries([updatedEntry]);
      return enrichedEntry;
    } catch (error) {
      console.error("Failed to update entry:", error);
      return null;
    }
  }

  async deleteEntry(id: string): Promise<boolean> {
    try {
      await axios.delete(`/entries/${id}.json`);
      return true;
    } catch (error) {
      console.error("Failed to delete entry:", error);
      return false;
    }
  }

  private mapTickTask(task: any): TickTask {
    return {
      id: task.id.toString(),
      name: task.name || "Untitled Task",
      budget: task.budget || 0,
      position: task.position || 0,
      project_id: task.project_id,
      date_closed: task.date_closed,
      billable: task.billable || false,
      url: task.url,
      created_at: task.created_at,
      updated_at: task.updated_at,
      project: task.project ? this.mapTickProject(task.project) : undefined,
    };
  }

  private mapTickEntry(entry: any): TickEntry {
    return {
      id: entry.id.toString(),
      date: entry.date,
      hours: entry.hours || 0,
      notes: entry.notes || "",
      task_id: entry.task_id,
      user_id: entry.user_id,
      url: entry.url,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
      task: entry.task ? this.mapTickTask(entry.task) : undefined,
      project: entry.project ? this.mapTickProject(entry.project) : undefined,
      user: entry.user
        ? {
            id: entry.user.id,
            first_name: entry.user.first_name,
            last_name: entry.user.last_name,
            email: entry.user.email,
          }
        : undefined,
    };
  }

  private mapTickProject(project: any): TickProject {
    // Generate a color for UI purposes if not provided
    const colors = [
      "#3b82f6",
      "#ef4444",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#06b6d4",
      "#84cc16",
      "#f97316",
    ];
    const colorIndex = project.id ? parseInt(project.id) % colors.length : 0;

    return {
      id: project.id.toString(),
      name: project.name || "Untitled Project",
      budget: project.budget || 0,
      date_closed: project.date_closed,
      notifications: project.notifications || false,
      billable: project.billable || false,
      recurring: project.recurring || false,
      client_id: project.client_id,
      owner_id: project.owner_id,
      url: project.url,
      created_at: project.created_at,
      updated_at: project.updated_at,
      color: colors[colorIndex], // Generated color for UI
    };
  }

  private async enrichEntries(
    sourceEntries: TickEntry[],
  ): Promise<TickEntry[]> {
    const entries = [...sourceEntries];
    const needsTaskData = entries.some((entry) => !entry.task);
    if (!needsTaskData) {
      return entries;
    }

    const loadedTasks = await this.getTasks();
    if (loadedTasks.length === 0) {
      return entries;
    }

    const taskById = new Map(loadedTasks.map((task) => [task.id, task]));
    const hasMissingProjects = entries.some(
      (entry) =>
        !entry.project &&
        !entry.task?.project &&
        taskById.get(entry.task_id.toString())?.project_id,
    );

    let projectById = new Map<string, TickProject>();
    if (hasMissingProjects) {
      const loadedProjects = await this.getProjects();
      projectById = new Map(
        loadedProjects.map((project) => [project.id, project]),
      );
    }

    return entries.map((entry) => {
      const resolvedTask = entry.task || taskById.get(entry.task_id.toString());
      const resolvedProject =
        entry.project ||
        resolvedTask?.project ||
        (resolvedTask?.project_id
          ? projectById.get(resolvedTask.project_id.toString())
          : undefined);

      return {
        ...entry,
        task: resolvedTask,
        project: resolvedProject,
      };
    });
  }
}
