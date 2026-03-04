// Tick API Types

export interface TickRole {
  id: string;
  subscription_id: string;
  api_token: string;
  subscription: {
    id: string;
    name: string;
  };
}

export interface TickProject {
  id: number;
  name: string;
  budget: number;
  date_closed?: string | null;
  notifications: boolean;
  billable: boolean;
  recurring: boolean;
  client_id?: number;
  owner_id?: number;
  url: string;
  created_at: string;
  updated_at: string;
  color?: string;
}

export interface TickTask {
  id: number;
  name: string;
  budget: number;
  position: number;
  project_id: number;
  date_closed?: string | null;
  billable: boolean;
  url: string;
  created_at: string;
  updated_at: string;
  project?: TickProject;
}

export interface TickUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface TickEntry {
  id: number;
  date: string; // YYYY-MM-DD
  hours: number;
  notes: string;
  task_id: number;
  user_id: number;
  url: string;
  created_at: string;
  updated_at: string;
  task?: TickTask;
  project?: TickProject;
  user?: TickUser;
}

export interface CreateEntryRequest {
  task_id: number;
  hours: number;
  notes: string;
  date: string; // YYYY-MM-DD
}

export interface UpdateEntryRequest {
  task_id?: number;
  hours?: number;
  notes?: string;
  date?: string; // YYYY-MM-DD
}

export interface CreateTaskRequest {
  name: string;
  project_id: number;
  billable: boolean;
  budget: number;
}

export interface UpdateTaskRequest {
  name?: string;
  project_id?: number;
  budget?: number;
  billable?: boolean;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface TickAPIConfig {
  email: string;
  password?: string;
  token?: string;
  subscriptionId?: string;
  baseUrl?: string;
}

export interface RepeatOptions {
  frequency: "daily" | "weekdays" | "weekly" | "monthly";
  endDate: string;
}

export interface CreateRepeatedEntryRequest {
  task_id: number;
  hours: number;
  notes: string;
  start_date: string;
  repeat: RepeatOptions;
}
