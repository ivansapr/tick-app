import {
  TickRole,
  TickProject,
  TickTask,
  TickEntry,
  CreateEntryRequest,
  UpdateEntryRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
  TickAPIConfig,
} from '../types/tick';

export class TickAPI {
  private email: string;
  private password?: string;
  private token?: string;
  private subscriptionId?: string;
  private baseUrl: string;

  constructor(config: TickAPIConfig) {
    this.email = config.email;
    this.password = config.password;
    this.token = config.token;
    this.subscriptionId = config.subscriptionId;
    this.baseUrl = config.baseUrl || 'https://www.tickspot.com';
  }

  private getAuthHeader(): string {
    if (this.token) {
      return `Token token=${this.token}`;
    }
    if (this.password) {
      const credentials = btoa(`${this.email}:${this.password}`);
      return `Basic ${credentials}`;
    }
    throw new Error('No authentication credentials available');
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': this.getAuthHeader(),
      'User-Agent': `TickClient (${this.email})`,
      'Content-Type': 'application/json',
    };
  }

  private getApiUrl(endpoint: string): string {
    if (!this.subscriptionId) {
      throw new Error('Subscription ID not set');
    }
    return `${this.baseUrl}/${this.subscriptionId}/api/v2${endpoint}`;
  }

  async authenticate(): Promise<TickRole[] | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/roles.json`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'User-Agent': `TickClient (${this.email})`,
        },
      });

      if (!response.ok) {
        console.error('Authentication failed:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  setSubscription(subscriptionId: string, token: string): void {
    this.subscriptionId = subscriptionId;
    this.token = token;
  }

  // Tasks
  async getTasks(): Promise<TickTask[] | null> {
    try {
      const response = await fetch(this.getApiUrl('/tasks.json'), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error('Failed to fetch tasks:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Get tasks error:', error);
      return null;
    }
  }

  async getTask(id: string): Promise<TickTask | null> {
    try {
      const response = await fetch(this.getApiUrl(`/tasks/${id}.json`), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error('Failed to fetch task:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Get task error:', error);
      return null;
    }
  }

  async createTask(data: CreateTaskRequest): Promise<TickTask | null> {
    try {
      const response = await fetch(this.getApiUrl('/tasks.json'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('Failed to create task:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Create task error:', error);
      return null;
    }
  }

  async updateTask(id: string, data: UpdateTaskRequest): Promise<TickTask | null> {
    try {
      const response = await fetch(this.getApiUrl(`/tasks/${id}.json`), {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('Failed to update task:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Update task error:', error);
      return null;
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    try {
      const response = await fetch(this.getApiUrl(`/tasks/${id}.json`), {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error('Failed to delete task:', response.statusText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete task error:', error);
      return false;
    }
  }

  // Projects
  async getProjects(): Promise<TickProject[] | null> {
    try {
      const response = await fetch(this.getApiUrl('/projects.json'), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error('Failed to fetch projects:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Get projects error:', error);
      return null;
    }
  }

  // Entries
  async getEntries(startDate?: string, endDate?: string): Promise<TickEntry[] | null> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const url = `${this.getApiUrl('/entries.json')}${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error('Failed to fetch entries:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Get entries error:', error);
      return null;
    }
  }

  async createEntry(data: CreateEntryRequest): Promise<TickEntry | null> {
    try {
      const response = await fetch(this.getApiUrl('/entries.json'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('Failed to create entry:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Create entry error:', error);
      return null;
    }
  }

  async updateEntry(id: string, data: UpdateEntryRequest): Promise<TickEntry | null> {
    try {
      const response = await fetch(this.getApiUrl(`/entries/${id}.json`), {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        console.error('Failed to update entry:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Update entry error:', error);
      return null;
    }
  }

  async deleteEntry(id: string): Promise<boolean> {
    try {
      const response = await fetch(this.getApiUrl(`/entries/${id}.json`), {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        console.error('Failed to delete entry:', response.statusText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Delete entry error:', error);
      return false;
    }
  }

  // Helper method to get credentials
  getCredentials(): { email: string; token?: string; subscriptionId?: string } {
    return {
      email: this.email,
      token: this.token,
      subscriptionId: this.subscriptionId,
    };
  }
}
