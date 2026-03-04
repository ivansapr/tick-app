import { writable, get } from 'svelte/store';
import type { TickTask } from '../types.js';

// Store for tasks assigned to the current user with dates
export const userAssignedTasks = writable<TickTask[]>([]);

// Local storage key for user tasks
const USER_TASKS_KEY = 'tickUserTasks';

// Load user tasks from localStorage
export function loadUserTasks(): TickTask[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(USER_TASKS_KEY);
    if (stored) {
      const tasks = JSON.parse(stored) as TickTask[];
      userAssignedTasks.set(tasks);
      return tasks;
    }
  } catch (error) {
    console.error('Failed to load user tasks from localStorage:', error);
  }

  return [];
}

// Save user tasks to localStorage
export function saveUserTasks(tasks: TickTask[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(USER_TASKS_KEY, JSON.stringify(tasks));
    userAssignedTasks.set(tasks);
  } catch (error) {
    console.error('Failed to save user tasks to localStorage:', error);
  }
}

// Add a new task assignment
export function addUserTask(task: TickTask): void {
  const currentTasks = get(userAssignedTasks);
  const newTasks = [...currentTasks.filter(t => t.id !== task.id), task];
  saveUserTasks(newTasks);
}

// Remove a task assignment
export function removeUserTask(taskId: string): void {
  const currentTasks = get(userAssignedTasks);
  const newTasks = currentTasks.filter(t => t.id !== taskId);
  saveUserTasks(newTasks);
}

// Update a task assignment
export function updateUserTask(taskId: string, updates: Partial<TickTask>): void {
  const currentTasks = get(userAssignedTasks);
  const newTasks = currentTasks.map(t =>
    t.id === taskId ? { ...t, ...updates } : t
  );
  saveUserTasks(newTasks);
}

// Get tasks for a specific date
export function getTasksForDate(date: string): TickTask[] {
  const currentTasks = get(userAssignedTasks);
  return currentTasks.filter(task => task.date === date);
}