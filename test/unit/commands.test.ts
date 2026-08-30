import * as assert from 'assert/strict';
import * as sinon from 'sinon';
import * as vscodeMock from 'vscode';
import * as deepl from '../../src/deepl';
import * as commands from '../../src/commands';
import { state } from '../../src/state';

function createFakeEditor(text: string, selection: vscodeMock.Selection) {
  const replacements: { range: vscodeMock.Range; value: string }[] = [];
  const edit = sinon.spy((callback: (editBuilder: vscodeMock.TextEditorEdit) => void): Promise<boolean> => {
    callback({ replace: (range, value) => replacements.push({ range, value }) });
    return Promise.resolve(true);
  });

  const editor: vscodeMock.TextEditor = {
    document: {
      getText: () => text,
      lineAt: (line: number) => ({ range: new vscodeMock.Range(line, 0, line, text.length) }),
    },
    selections: [selection],
    edit,
  };

  return { editor, edit, replacements };
}

describe('commands.ts', () => {
  beforeEach(() => {
    state.apiKey = 'sk-test-key';
    state.targetLanguage = 'de';
    state.sourceLanguage = undefined;
  });

  afterEach(() => {
    (vscodeMock as unknown as { __resetVscodeMock(): void }).__resetVscodeMock();
    sinon.restore();
    state.apiKey = undefined;
    state.targetLanguage = undefined;
    state.sourceLanguage = undefined;
  });

  describe('translate (race condition regression: bug #4)', () => {
    it('applies the edit to the editor that was active when translation started, not one switched to mid-flight', async () => {
      const selectionA = new vscodeMock.Selection(0, 0, 0, 5, { isEmpty: false });
      const selectionB = new vscodeMock.Selection(0, 0, 0, 5, { isEmpty: false });
      const { editor: editorA, edit: editSpyA } = createFakeEditor('Hello', selectionA);
      const { editor: editorB, edit: editSpyB } = createFakeEditor('World', selectionB);

      vscodeMock.window.activeTextEditor = editorA;

      // Simulate the user switching to a different editor while the (network) translation call
      // is "in flight" - by the time it resolves, activeTextEditor no longer points at editorA.
      sinon.stub(deepl, 'translate').callsFake(async () => {
        vscodeMock.window.activeTextEditor = editorB;
        return { text: 'Hallo' } as unknown as Awaited<ReturnType<typeof deepl.translate>>;
      });

      await commands.translate();

      assert.equal(editSpyA.callCount, 1, 'the editor active when translation started should receive the edit');
      assert.equal(editSpyB.callCount, 0, 'the editor switched to mid-flight must NOT receive the edit');
    });
  });

  describe('translateAndPasteFromClipboard (race condition regression: bug #5)', () => {
    it('pastes into the editor that was active when the command started, not one switched to during the clipboard-read/prompt/translate chain', async () => {
      const { editor: editorA, edit: editSpyA } = createFakeEditor('', new vscodeMock.Selection(0, 0, 0, 0, { isEmpty: true }));
      const { editor: editorB, edit: editSpyB } = createFakeEditor('', new vscodeMock.Selection(0, 0, 0, 0, { isEmpty: true }));

      vscodeMock.window.activeTextEditor = editorA;

      sinon.stub(vscodeMock.env.clipboard, 'readText').callsFake(async () => {
        vscodeMock.window.activeTextEditor = editorB;
        return 'Hello';
      });
      sinon.stub(deepl, 'translate').resolves({ text: 'Hallo' } as unknown as Awaited<ReturnType<typeof deepl.translate>>);

      await commands.translateAndPasteFromClipboard();

      assert.equal(editSpyA.callCount, 1, 'the editor active when the command started should receive the pasted translation');
      assert.equal(editSpyB.callCount, 0, 'the editor switched to mid-flight must NOT receive the paste');
    });

    it('awaits the final editor.edit() call before the command resolves (regression: bug #10)', async () => {
      let editSettled = false;
      const editor: vscodeMock.TextEditor = {
        document: {
          getText: () => '',
          lineAt: (line: number) => ({ range: new vscodeMock.Range(line, 0, line, 0) }),
        },
        selections: [new vscodeMock.Selection(0, 0, 0, 0, { isEmpty: true })],
        edit: (callback: (editBuilder: vscodeMock.TextEditorEdit) => void): Promise<boolean> => {
          callback({ replace: () => undefined });
          // Settles on a later macrotask - if the command didn't await this edit, it would
          // already have resolved by the time this fires.
          return new Promise<boolean>(resolve => setImmediate(() => {
            editSettled = true;
            resolve(true);
          }));
        },
      };
      vscodeMock.window.activeTextEditor = editor;
      sinon.stub(vscodeMock.env.clipboard, 'readText').resolves('Hello');
      sinon.stub(deepl, 'translate').resolves({ text: 'Hallo' } as unknown as Awaited<ReturnType<typeof deepl.translate>>);

      await commands.translateAndPasteFromClipboard();

      assert.equal(editSettled, true, 'the command must not resolve before its final editor.edit() call has settled');
    });
  });

  describe('error handling (regression: bug #6)', () => {
    it('shows a friendly error message instead of letting a translation failure propagate uncaught', async () => {
      const { editor } = createFakeEditor('Hello', new vscodeMock.Selection(0, 0, 0, 5, { isEmpty: false }));
      vscodeMock.window.activeTextEditor = editor;

      sinon.stub(deepl, 'translate').rejects(new Error('Bad request, message: something is wrong'));
      const errorStub = sinon.stub(vscodeMock.window, 'showErrorMessage').resolves(undefined);

      await assert.doesNotReject(() => commands.translate());

      assert.equal(errorStub.callCount, 1);
      assert.match(errorStub.firstCall.args[0] as string, /Bad request/);
    });
  });
});
