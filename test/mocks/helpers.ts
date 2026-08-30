import type * as vscode from 'vscode';

/**
 * A simple in-memory Memento (used for both workspaceState and, where needed, globalState).
 * `updateDelay`, when set, defers the promise returned by update() by one macrotask - useful for
 * asserting that a caller actually awaits update() rather than firing-and-forgetting it.
 */
export function createFakeMemento(initial: Record<string, unknown> = {}, options: { updateDelay?: boolean } = {}): vscode.Memento {
  const store = new Map<string, unknown>(Object.entries(initial));

  return {
    get<T>(key: string, defaultValue?: T): T | undefined {
      return store.has(key) ? (store.get(key) as T) : defaultValue;
    },
    update(key: string, value: unknown): Promise<void> {
      const apply = () => {
        if (value === undefined) {
          store.delete(key);
        } else {
          store.set(key, value);
        }
      };

      if (options.updateDelay) {
        return new Promise<void>(resolve => setImmediate(() => {
          apply();
          resolve();
        }));
      }

      apply();
      return Promise.resolve();
    },
  };
}

export function createFakeSecretStorage(initial: Record<string, string> = {}): vscode.SecretStorage {
  const store = new Map<string, string>(Object.entries(initial));
  const listeners: Array<(e: vscode.SecretStorageChangeEvent) => unknown> = [];

  return {
    get(key: string): Promise<string | undefined> {
      return Promise.resolve(store.get(key));
    },
    store(key: string, value: string): Promise<void> {
      store.set(key, value);
      listeners.forEach(listener => listener({ key }));
      return Promise.resolve();
    },
    delete(key: string): Promise<void> {
      store.delete(key);
      listeners.forEach(listener => listener({ key }));
      return Promise.resolve();
    },
    onDidChange(listener: (e: vscode.SecretStorageChangeEvent) => unknown): vscode.Disposable {
      listeners.push(listener);
      return { dispose: () => undefined };
    },
  };
}

export function createFakeExtensionContext(overrides: Partial<{
  workspaceState: vscode.Memento;
  secrets: vscode.SecretStorage;
}> = {}): vscode.ExtensionContext {
  return {
    subscriptions: [],
    workspaceState: overrides.workspaceState ?? createFakeMemento(),
    secrets: overrides.secrets ?? createFakeSecretStorage(),
  };
}
