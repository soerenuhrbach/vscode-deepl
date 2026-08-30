// Minimal hand-rolled stand-in for the `vscode` module, swapped in for unit tests via a
// TypeScript path mapping (see test/tsconfig.json: paths["vscode"]) plus tsconfig-paths'
// runtime require-hook. It only implements the surface actually used under src/ - it is not,
// and is not meant to be, a faithful reproduction of the real VS Code API.
//
// `window`, `workspace` and `env` are plain mutable objects so tests can both assign directly
// (e.g. `vscodeMock.window.activeTextEditor = fakeEditor`) and wrap methods with sinon stubs
// (e.g. `sinon.stub(vscodeMock.window, 'showWarningMessage').resolves(...)`).

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export interface Disposable {
  dispose(): void;
}

export class Position {
  constructor(public readonly line: number, public readonly character: number) {}
}

export class Range {
  constructor(
    public readonly startLine: number,
    public readonly startCharacter: number,
    public readonly endLine: number,
    public readonly endCharacter: number
  ) {}

  get start(): Position {
    return new Position(this.startLine, this.startCharacter);
  }

  get end(): Position {
    return new Position(this.endLine, this.endCharacter);
  }
}

export interface SelectionOptions {
  isEmpty?: boolean;
  isSingleLine?: boolean;
}

// The real vscode.Selection derives isEmpty/isSingleLine from start/end - this mock allows
// overriding them directly, which keeps test fixtures short (e.g. "an empty selection at 0,0").
export class Selection extends Range {
  readonly isEmpty: boolean;
  readonly isSingleLine: boolean;

  constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number, options: SelectionOptions = {}) {
    super(startLine, startCharacter, endLine, endCharacter);
    this.isEmpty = options.isEmpty ?? (startLine === endLine && startCharacter === endCharacter);
    this.isSingleLine = options.isSingleLine ?? (startLine === endLine);
  }
}

export interface TextLine {
  range: Range;
}

export interface TextDocument {
  getText(range?: Range): string;
  lineAt(line: number): TextLine;
}

export interface TextEditorEdit {
  replace(location: Range, value: string): void;
}

export interface TextEditor {
  document: TextDocument;
  selections: Selection[];
  edit(callback: (editBuilder: TextEditorEdit) => void): Promise<boolean>;
}

export interface Progress<T> {
  report(value: T): void;
}

export interface ProgressOptions {
  location: ProgressLocation;
  title?: string;
  cancellable?: boolean;
}

export interface QuickPickItem {
  label: string;
  description?: string;
}

export interface QuickPickOptions {
  title?: string;
  placeHolder?: string;
}

export interface InputBoxOptions {
  title?: string;
  placeHolder?: string;
  ignoreFocusOut?: boolean;
  validateInput?(value: string): string | undefined | null | Promise<string | undefined | null>;
}

export interface MessageOptions {
  detail?: string;
  modal?: boolean;
}

export interface OutputChannel {
  appendLine(value: string): void;
}

export interface StatusBarItem {
  text: string;
  tooltip: string | undefined;
  command: string | undefined;
  show(): void;
  hide(): void;
  dispose(): void;
}

export interface Memento {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown): Promise<void>;
}

export interface SecretStorageChangeEvent {
  key: string;
}

export interface SecretStorage {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  onDidChange(listener: (e: SecretStorageChangeEvent) => unknown): Disposable;
}

export interface ExtensionContext {
  subscriptions: Disposable[];
  workspaceState: Memento;
  secrets: SecretStorage;
}

export interface WorkspaceConfiguration {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown, target?: ConfigurationTarget): Promise<void>;
}

export interface ConfigurationChangeEvent {
  affectsConfiguration(section: string): boolean;
}

export interface Extension {
  // Matches the real vscode.Extension type: package.json content is arbitrary, untyped JSON.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packageJSON: any;
}

export interface Clipboard {
  readText(): Promise<string>;
}

export const window = {
  activeTextEditor: undefined as TextEditor | undefined,
  showWarningMessage: async (_message: string, _optionsOrItem?: unknown, ..._items: string[]): Promise<string | undefined> => undefined,
  showErrorMessage: async (_message: string, ..._items: string[]): Promise<string | undefined> => undefined,
  showInputBox: async (_options?: InputBoxOptions): Promise<string | undefined> => undefined,
  showQuickPick: async (_items: QuickPickItem[] | Promise<QuickPickItem[]>, _options?: QuickPickOptions): Promise<QuickPickItem | undefined> => undefined,
  withProgress: async <T>(_options: ProgressOptions, task: (progress: Progress<{ increment: number }>) => Promise<T> | T): Promise<T> => {
    const progress: Progress<{ increment: number }> = { report: () => undefined };
    return task(progress);
  },
  createOutputChannel: (_name: string): OutputChannel => ({
    appendLine: () => undefined,
  }),
  createStatusBarItem: (_alignment?: StatusBarAlignment, _priority?: number): StatusBarItem => ({
    text: '',
    tooltip: undefined,
    command: undefined,
    show: () => undefined,
    hide: () => undefined,
    dispose: () => undefined,
  }),
};

export const env = {
  clipboard: {
    readText: async (): Promise<string> => '',
  } as Clipboard,
};

function createWorkspaceConfiguration(): WorkspaceConfiguration {
  const store = new Map<string, unknown>();
  return {
    get<T>(key: string): T | undefined {
      return store.get(key) as T | undefined;
    },
    update(key: string, value: unknown): Promise<void> {
      if (value === undefined) {
        store.delete(key);
      } else {
        store.set(key, value);
      }
      return Promise.resolve();
    },
  };
}

// A single shared configuration instance, mirroring how vscode.workspace.getConfiguration()
// always returns a view over the same underlying settings. Tests seed it directly, e.g.
// `vscodeMock.workspace.getConfiguration().update('deepl.formality', 'more')`.
const sharedWorkspaceConfiguration = createWorkspaceConfiguration();

export const workspace = {
  getConfiguration: (_section?: string): WorkspaceConfiguration => sharedWorkspaceConfiguration,
  onDidChangeConfiguration: (_listener: (e: ConfigurationChangeEvent) => unknown): Disposable => ({ dispose: () => undefined }),
};

export const extensions = {
  getExtension: (_extensionId: string): Extension | undefined => ({
    packageJSON: { name: 'vscode-deepl-test', version: '0.0.0-test' },
  }),
};

export const commands = {
  registerCommand: (_command: string, _callback: (...args: unknown[]) => unknown): Disposable => ({ dispose: () => undefined }),
};

/**
 * Resets every piece of mutable mock state back to its defaults. Call this in `afterEach` so
 * tests don't leak activeTextEditor / configuration values / stubs into one another.
 */
export function __resetVscodeMock(): void {
  window.activeTextEditor = undefined;
  // Re-point get/update at a fresh, empty backing store rather than mutating the map in place,
  // since callers may have captured `workspace.getConfiguration()`'s return value by reference.
  Object.assign(sharedWorkspaceConfiguration, createWorkspaceConfiguration());
}
