import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ProjectSnapshot } from '@/types';

interface LoomisDB extends DBSchema {
  projects: {
    key: string;
    value: ProjectSnapshot;
    indexes: { 'by-updated': number };
  };
}

const DB_NAME = 'loomis-studio';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LoomisDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<LoomisDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('projects', { keyPath: 'id' });
        store.createIndex('by-updated', 'updatedAt');
      },
    });
  }
  return dbPromise;
}

export async function saveProject(project: ProjectSnapshot): Promise<void> {
  const db = await getDb();
  await db.put('projects', {
    ...project,
    updatedAt: Date.now(),
  });
}

export async function loadProject(id: string): Promise<ProjectSnapshot | undefined> {
  const db = await getDb();
  return db.get('projects', id);
}

export async function listProjects(): Promise<ProjectSnapshot[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('projects', 'by-updated');
  return all.reverse();
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('projects', id);
}

export async function renameProject(id: string, name: string): Promise<void> {
  const db = await getDb();
  const project = await db.get('projects', id);
  if (!project) return;
  await db.put('projects', { ...project, name, updatedAt: Date.now() });
}

export function createProjectId(): string {
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
