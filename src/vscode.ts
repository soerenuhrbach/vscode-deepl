// Taken from https://stackoverflow.com/a/73382616

import * as vscode from 'vscode';

/**
 * Shows a message that auto closes after a certain timeout. Since there's no API for this functionality the
 * progress output is used instead, which auto closes at 100%.
 * This means the function cannot (and should not) be used for warnings or errors. These types of message require
 * the user to really take note.
 *
 * @param message The message to show.
 * @param timeout The time in milliseconds after which the message should close (default 3secs).
 */
export const showMessageWithTimeout = (message: string, timeout = 3000): void => {
  void vscode.window.withProgress(
      {
          location: vscode.ProgressLocation.Notification,
          title: message,
          cancellable: false,
      },

      async (progress): Promise<void> => {
          await waitFor(timeout, () => { return false; });
          progress.report({ increment: 100 });
      },
  );
};

/**
 * Waits for a condition to become true.
 *
 * @param timeout The number of milliseconds to wait for the condition.
 * @param condition A function that checks if a condition has become true.
 *
 * @returns A promise that resolves to true, if the condition became true within the timeout range, otherwise false.
 */
export const waitFor = async (timeout: number, condition: () => boolean): Promise<boolean> => {
  while (!condition() && timeout > 0) {
      timeout -= 100;
      await sleep(100);
  }

  return timeout > 0 ? true : false;
};