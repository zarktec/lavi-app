import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { flushQueue } from "@/offline/sync";
import { syncReminders } from "./syncReminders";

export const BACKGROUND_TASK = "lavi-background-sync";

// Se define en el ámbito del módulo para que exista cuando el sistema la despierte.
TaskManager.defineTask(BACKGROUND_TASK, async () => {
  try {
    await syncReminders();
    await flushQueue();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Frecuencia mínima que permite el sistema (15 min). El SO decide cuándo correrla: nada crítico depende de ella. */
export async function registerBackgroundSync() {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK)) return;
  await BackgroundTask.registerTaskAsync(BACKGROUND_TASK, { minimumInterval: 15 });
}

export async function unregisterBackgroundSync() {
  if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK)) {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_TASK);
  }
}
