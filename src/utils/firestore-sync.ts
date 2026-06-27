import { db } from "../lib/firebase";
import {
  doc,
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { Task, Goal, Message } from "../types";

// Helper to remove undefined properties recursively before writing to Firestore
function removeUndefined(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  const clean: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      clean[key] = removeUndefined(obj[key]);
    }
  }
  return clean;
}

// Setup typed Firestore helpers
export async function saveUserToFirestore(
  uid: string,
  profile: { email: string; displayName: string; photoURL: string },
) {
  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(
      userDocRef,
      removeUndefined({
        ...profile,
        uid,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true },
    );
  } catch (err) {
    console.error("Firestore: Error saving user profile:", err);
  }
}

export async function fetchTasksFromFirestore(userId: string): Promise<Task[]> {
  try {
    const q = query(collection(db, "tasks"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const result: Task[] = [];
    snapshot.forEach((d) => {
      result.push(d.data() as Task);
    });
    return result;
  } catch (err) {
    console.error("Firestore: Error fetching tasks:", err);
    return [];
  }
}

export async function saveTaskToFirestore(userId: string, task: Task) {
  try {
    const docRef = doc(db, "tasks", task.id);
    await setDoc(
      docRef,
      removeUndefined({
        ...task,
        userId,
      }),
      { merge: true },
    );
  } catch (err) {
    console.error("Firestore: Error saving task:", err);
  }
}

export async function deleteTaskFromFirestore(taskId: string) {
  try {
    const docRef = doc(db, "tasks", taskId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Firestore: Error deleting task:", err);
  }
}

export async function fetchGoalsFromFirestore(userId: string): Promise<Goal[]> {
  try {
    const q = query(collection(db, "goals"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const result: Goal[] = [];
    snapshot.forEach((d) => {
      result.push(d.data() as Goal);
    });
    return result;
  } catch (err) {
    console.error("Firestore: Error fetching goals:", err);
    return [];
  }
}

export async function saveGoalToFirestore(userId: string, goal: Goal) {
  try {
    const docRef = doc(db, "goals", goal.id);
    await setDoc(
      docRef,
      removeUndefined({
        ...goal,
        userId,
      }),
      { merge: true },
    );
  } catch (err) {
    console.error("Firestore: Error saving goal:", err);
  }
}

export async function fetchMessagesFromFirestore(
  userId: string,
): Promise<Message[]> {
  try {
    const q = query(
      collection(db, "conversations"),
      where("userId", "==", userId),
    );
    const snapshot = await getDocs(q);
    const result: Message[] = [];
    snapshot.forEach((d) => {
      result.push(d.data() as Message);
    });
    result.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    return result;
  } catch (err) {
    console.error("Firestore: Error fetching messages:", err);
    return [];
  }
}

export async function saveMessageToFirestore(userId: string, msg: Message) {
  try {
    const docRef = doc(db, "conversations", msg.id);
    await setDoc(
      docRef,
      removeUndefined({
        ...msg,
        userId,
      }),
      { merge: true },
    );
  } catch (err) {
    console.error("Firestore: Error saving message:", err);
  }
}

export async function clearConversationsInFirestore(userId: string) {
  try {
    const q = query(
      collection(db, "conversations"),
      where("userId", "==", userId),
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error("Firestore: Error clearing conversations:", err);
  }
}
export async function getUserOnboardingStatus(uid: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, "users", uid);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return false;
    return snap.data()?.onboardingCompleted ?? false;
  } catch (err) {
    console.error("Firestore: Error reading onboarding status:", err);
    // Fail-safe: return true so we never accidentally re-run onboarding on error
    return true;
  }
}

/**
 * Sets onboardingCompleted = true on the user document.
 * Safe to call multiple times (merge: true).
 */
export async function markOnboardingComplete(uid: string): Promise<void> {
  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, { onboardingCompleted: true }, { merge: true });
  } catch (err) {
    console.error("Firestore: Error marking onboarding complete:", err);
  }
}
