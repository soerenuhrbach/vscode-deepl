// vscode's real .d.ts declares an ambient global `Thenable<T>` (a structural alternative to
// Promise<T> used throughout its API surface). Real src/*.ts files reference this type directly.
// We declare a minimal, compatible version here in isolation rather than pulling in the whole
// @types/vscode package, which would otherwise shadow the path-mapped mock in test/mocks/vscode.ts
// for every other type (Memento, ExtensionContext, ...).
interface Thenable<T> {
  // Mirrors vscode.d.ts's own two-overload shape exactly - this is what makes it structurally
  // assignable both from and to a native Promise<T> without extra casts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then<TResult>(onfulfilled?: (value: T) => TResult | Thenable<TResult>, onrejected?: (reason: any) => TResult | Thenable<TResult>): Thenable<TResult>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then<TResult>(onfulfilled?: (value: T) => TResult | Thenable<TResult>, onrejected?: (reason: any) => void): Thenable<TResult>;
}
