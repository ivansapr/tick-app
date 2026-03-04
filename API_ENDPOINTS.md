# Tick API Endpoints Documentation

## Base Configuration

```typescript
Base URL: https://www.tickspot.com/{subscriptionId}/api/v2
Headers:
  Authorization: Token token={api_token}
  User-Agent: TickClient ({email})
```

## Authentication

### Authenticate User
Get available roles/subscriptions for user.

**Endpoint:** `GET https://www.tickspot.com/api/v2/roles.json`  
**Auth:** Basic (username/password)

**Response:** `TickRole[]`
```typescript
{
  id: string;
  subscription_id: string;
  api_token: string;
  subscription: {
    id: string;
    name: string;
  };
}
```

---

## Tasks

### Get All Tasks
**Endpoint:** `GET /tasks.json`

**Response:** `TickTask[]`
```typescript
{
  id: string;
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
```

### Get Single Task
**Endpoint:** `GET /tasks/{id}.json`

**Response:** `TickTask`

### Create Task
**Endpoint:** `POST /tasks.json`

**Request:**
```typescript
{
  name: string;
  project_id: number;
  billable: boolean;
  budget: number;
}
```

**Response:** `TickTask`

### Update Task
**Endpoint:** `PUT /tasks/{id}.json`

**Request:**
```typescript
{
  name?: string;
  project_id?: number;
  budget?: number;
  billable?: boolean;
}
```

**Response:** `TickTask`

### Delete Task
**Endpoint:** `DELETE /tasks/{id}.json`

**Response:** `204 No Content`

---

## Projects

### Get All Projects
**Endpoint:** `GET /projects.json`

**Response:** `TickProject[]`
```typescript
{
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
  color?: string; // UI-generated field
}
```

---

## Entries

### Get Entries
**Endpoint:** `GET /entries.json`

**Query Parameters:**
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD

**Response:** `TickEntry[]`
```typescript
{
  id: string;
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
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}
```

### Create Entry
**Endpoint:** `POST /entries.json`

**Request:**
```typescript
{
  task_id: number;
  hours: number;
  notes: string;
  date: string; // YYYY-MM-DD
}
```

**Response:** `TickEntry`

### Update Entry
**Endpoint:** `PUT /entries/{id}.json`

**Request:**
```typescript
{
  task_id?: number;
  hours?: number;
  notes?: string;
  date?: string; // YYYY-MM-DD
}
```

**Response:** `TickEntry`

### Delete Entry
**Endpoint:** `DELETE /entries/{id}.json`

**Response:** `204 No Content`

---

## Usage Example

```typescript
import { TickAPI } from './lib/api';

const api = new TickAPI({
  email: 'user@example.com',
  password: 'password', // Only for auth
  token: 'api_token',
  subscriptionId: '12345',
  baseUrl: 'https://www.tickspot.com'
});

// Authenticate
const roles = await api.authenticate();
if (roles) {
  api.setSubscription(roles[0].subscription_id, roles[0].api_token);
}

// Fetch data
const tasks = await api.getTasks();
const projects = await api.getProjects();
const entries = await api.getEntries('2024-01-01', '2024-01-31');

// Create entry
const entry = await api.createEntry({
  task_id: 123,
  hours: 2.5,
  notes: 'Completed feature X',
  date: '2024-01-15'
});

// Update entry
const updated = await api.updateEntry('456', { hours: 3.0 });

// Delete entry
await api.deleteEntry('456');
```

---

## Error Handling

All methods return `null` or `false` on error. Check console for detailed error messages.

```typescript
const task = await api.getTask('123');
if (!task) {
  // Handle error
  console.error('Failed to fetch task');
}
```
