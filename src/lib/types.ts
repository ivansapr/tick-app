export interface TickTask {
  id: string;
  name: string;
  budget: number;
  position: number;
  project_id: number;
  date?: string;
  date_closed?: string | null;
  billable: boolean;
  url: string;
  created_at: string;
  updated_at: string;
  // Expanded fields from includes
  project?: TickProject;
}

export interface TickProject {
  id: string;
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
  color?: string; // Custom field for UI purposes
}

export interface AuthConfig {
  email: string;
  password: string;
  token?: string;
  subscriptionId?: string;
  baseUrl: string;
}

export interface TickRole {
  id: string;
  subscription_id: string;
  api_token: string;
  subscription: {
    id: string;
    name: string;
  };
}

export interface TickEntry {
  id: string;
  date: string;
  hours: number;
  notes: string;
  task_id: number;
  user_id: number;
  url: string;
  created_at: string;
  updated_at: string;
  // Expanded fields from includes
  task?: TickTask;
  project?: TickProject;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface CalendarEvent extends TickTask {
  isDragging?: boolean;
  isResizing?: boolean;
}
