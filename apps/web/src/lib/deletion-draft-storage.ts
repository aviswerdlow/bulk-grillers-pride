import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { DeletionDraft } from '@/machines/deletionWizard';

// Database schema
interface DeletionDraftDB extends DBSchema {
  drafts: {
    key: string;
    value: DeletionDraft;
    indexes: {
      'by-date': Date;
      'by-expiry': Date;
    };
  };
}

const DB_NAME = 'DeletionWizardDB';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

// Get database instance
async function getDB(): Promise<IDBPDatabase<DeletionDraftDB>> {
  return openDB<DeletionDraftDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create the drafts store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by-date', 'savedAt');
        store.createIndex('by-expiry', 'expiresAt');
      }
    },
  });
}

// Save a draft
export async function saveDeletionDraft(draft: DeletionDraft): Promise<string> {
  const db = await getDB();
  
  // Add timestamp if not present
  if (!draft.savedAt) {
    draft.savedAt = new Date();
  }
  
  // Set expiry to 7 days if not present
  if (!draft.expiresAt) {
    draft.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  
  await db.put(STORE_NAME, draft);
  return draft.id;
}

// Load a specific draft
export async function loadDeletionDraft(draftId: string): Promise<DeletionDraft | null> {
  const db = await getDB();
  const draft = await db.get(STORE_NAME, draftId);
  
  if (!draft) {
    return null;
  }
  
  // Check if draft has expired
  if (new Date(draft.expiresAt) < new Date()) {
    await deleteDeletionDraft(draftId);
    return null;
  }
  
  return draft;
}

// Get all drafts (non-expired)
export async function getAllDeletionDrafts(): Promise<DeletionDraft[]> {
  const db = await getDB();
  const drafts = await db.getAll(STORE_NAME);
  
  const now = new Date();
  const validDrafts: DeletionDraft[] = [];
  
  // Filter out expired drafts and clean them up
  for (const draft of drafts) {
    if (new Date(draft.expiresAt) < now) {
      await db.delete(STORE_NAME, draft.id);
    } else {
      validDrafts.push(draft);
    }
  }
  
  // Sort by most recent first
  return validDrafts.sort((a, b) => 
    new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

// Delete a draft
export async function deleteDeletionDraft(draftId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, draftId);
}

// Clear all drafts
export async function clearAllDeletionDrafts(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

// Clean up expired drafts (can be called periodically)
export async function cleanupExpiredDrafts(): Promise<number> {
  const db = await getDB();
  const now = new Date();
  let deletedCount = 0;
  
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const index = tx.store.index('by-expiry');
  
  // Get all drafts that have expired
  const range = IDBKeyRange.upperBound(now);
  
  for await (const cursor of index.iterate(range)) {
    await cursor.delete();
    deletedCount++;
  }
  
  await tx.done;
  return deletedCount;
}

// Get draft count
export async function getDraftCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_NAME);
}

// Check if a draft exists
export async function draftExists(draftId: string): Promise<boolean> {
  const db = await getDB();
  const draft = await db.get(STORE_NAME, draftId);
  return draft !== undefined;
}