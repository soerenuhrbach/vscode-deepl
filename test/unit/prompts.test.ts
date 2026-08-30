import * as assert from 'assert/strict';
import * as sinon from 'sinon';
import * as vscodeMock from 'vscode';
import { showApiKeyPrompt, showSourceLanguagePrompt } from '../../src/prompts';
import { state } from '../../src/state';

describe('prompts.ts', () => {
  afterEach(() => {
    (vscodeMock as unknown as { __resetVscodeMock(): void }).__resetVscodeMock();
    sinon.restore();
    state.apiKey = undefined;
  });

  describe('showApiKeyPrompt', () => {
    it('trims surrounding whitespace from the entered key (regression: bug #9)', async () => {
      sinon.stub(vscodeMock.window, 'showInputBox').resolves('  sk-abc-123  ');

      const key = await showApiKeyPrompt();

      assert.equal(key, 'sk-abc-123');
    });

    it('treats a whitespace-only entry as no key at all', async () => {
      sinon.stub(vscodeMock.window, 'showInputBox').resolves('   ');

      const key = await showApiKeyPrompt();

      assert.equal(key, undefined);
    });

    it('passes an already-clean key through unchanged', async () => {
      sinon.stub(vscodeMock.window, 'showInputBox').resolves('sk-abc-123');

      const key = await showApiKeyPrompt();

      assert.equal(key, 'sk-abc-123');
    });

    it('resolves to undefined when the user cancels the prompt', async () => {
      sinon.stub(vscodeMock.window, 'showInputBox').resolves(undefined);

      const key = await showApiKeyPrompt();

      assert.equal(key, undefined);
    });
  });

  describe('showSourceLanguagePrompt', () => {
    it('always offers "Detect language" even with no api key configured', async () => {
      state.apiKey = undefined;
      const quickPickStub = sinon.stub(vscodeMock.window, 'showQuickPick').resolves(undefined);

      await showSourceLanguagePrompt();

      const items = quickPickStub.firstCall.args[0] as { label: string; description?: string }[];
      assert.ok(items.some(item => item.label === 'Detect language' && item.description === undefined));
    });
  });
});
