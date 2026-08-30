import * as assert from 'assert/strict';
import * as sinon from 'sinon';
import * as vscodeMock from 'vscode';
import { AuthorizationError, Translator } from 'deepl-node';
import type { Language, TextResult } from 'deepl-node';
import * as debug from '../../src/debug';
import * as deepl from '../../src/deepl';
import { state } from '../../src/state';

const FAKE_TARGET_LANGUAGES: Language[] = [
  { name: 'German', code: 'de', supportsFormality: true },
  { name: 'English (American)', code: 'en-US', supportsFormality: false },
];

function fakeTextResult(text: string): TextResult {
  return { text, detectedSourceLang: 'en', billedCharacters: text.length };
}

describe('deepl.ts', () => {
  let getTargetLanguagesStub: sinon.SinonStub;

  beforeEach(() => {
    state.apiKey = 'sk-test-key';
    state.formality = undefined;
    deepl.invalidateLanguageCache();
    getTargetLanguagesStub = sinon.stub(Translator.prototype, 'getTargetLanguages').resolves(FAKE_TARGET_LANGUAGES);
    sinon.stub(Translator.prototype, 'getSourceLanguages').resolves([]);
  });

  afterEach(() => {
    (vscodeMock as unknown as { __resetVscodeMock(): void }).__resetVscodeMock();
    sinon.restore();
    deepl.invalidateLanguageCache();
    state.apiKey = undefined;
    state.formality = undefined;
  });

  describe('translate()', () => {
    it('omits formality when the resolved target language does not support it (regression: bug #7)', async () => {
      state.formality = 'more';
      const translateTextStub = sinon.stub(Translator.prototype, 'translateText').resolves(fakeTextResult('Hello'));

      await deepl.translate('Hallo', undefined, 'en-US');

      const options = translateTextStub.firstCall.args[3] as { formality?: string };
      assert.equal(options.formality, undefined);
    });

    it('sends formality through when the resolved target language supports it', async () => {
      state.formality = 'more';
      const translateTextStub = sinon.stub(Translator.prototype, 'translateText').resolves(fakeTextResult('Hallo'));

      await deepl.translate('Hello', undefined, 'de');

      const options = translateTextStub.firstCall.args[3] as { formality?: string };
      assert.equal(options.formality, 'more');
    });

    it('never sends formality when it is set to "default"', async () => {
      state.formality = 'default';
      const translateTextStub = sinon.stub(Translator.prototype, 'translateText').resolves(fakeTextResult('Hallo'));

      await deepl.translate('Hello', undefined, 'de');

      const options = translateTextStub.firstCall.args[3] as { formality?: string };
      assert.equal(options.formality, undefined);
    });

    it('throws a clear, catchable error instead of crashing when no api key is available and the user cancels the prompt (regression: bug #13)', async () => {
      state.apiKey = undefined;
      sinon.stub(vscodeMock.window, 'showInputBox').resolves(undefined);

      await assert.rejects(() => deepl.translate('Hello', undefined, 'de'), /no DeepL API key was configured/i);
    });

    it('propagates a non-authorization error unchanged, so commands.ts can catch and display it (contract for bug #6)', async () => {
      sinon.stub(Translator.prototype, 'translateText').rejects(new Error('Bad request, message: something is wrong'));

      await assert.rejects(() => deepl.translate('Hello', undefined, 'de'), /Bad request/);
    });

    it('logs the source language in the debug message only when one is actually set (regression: bug #19)', async () => {
      sinon.stub(Translator.prototype, 'translateText').resolves(fakeTextResult('Hallo'));
      const writeSpy = sinon.spy(debug, 'write');

      await deepl.translate('Hello', 'en', 'de');

      const startMessage = writeSpy.getCalls().map(call => call.args[0]).find(message => message.startsWith('Start translating'));
      assert.ok(startMessage, 'expected a "Start translating" debug message');
      assert.match(startMessage!, /from 'en'/, 'the source language should be mentioned when one is set');
      assert.doesNotMatch(startMessage!, /undefined/, 'the message must not contain the literal string "undefined"');
    });

    it('logs a plain message with no source-language mention when auto-detecting (regression: bug #19)', async () => {
      sinon.stub(Translator.prototype, 'translateText').resolves(fakeTextResult('Hallo'));
      const writeSpy = sinon.spy(debug, 'write');

      await deepl.translate('Hello', undefined, 'de');

      const startMessage = writeSpy.getCalls().map(call => call.args[0]).find(message => message.startsWith('Start translating'));
      assert.ok(startMessage, 'expected a "Start translating" debug message');
      assert.doesNotMatch(startMessage!, /undefined/, 'auto-detect mode must not print the literal string "undefined" as the source language');
    });

    it('does not double-decrement the retry budget across handleTranslationFailure (regression: bug #11)', async () => {
      // translateText always echoes the input back unchanged, so every attempt looks "unsuccessful"
      // and the user is offered a correction every time the retry budget allows one.
      sinon.stub(Translator.prototype, 'translateText').resolves(fakeTextResult('Hello'));
      const warningStub = sinon.stub(vscodeMock.window, 'showWarningMessage').resolves('Select source language and try again');
      sinon.stub(vscodeMock.window, 'showQuickPick').resolves({ label: 'German', description: 'de' });

      // With a retries=2 budget, a correctly single-decrementing implementation allows two
      // correction rounds (2 -> handled at 1 -> handled at 0 -> gives up). A double-decrementing
      // implementation burns the budget twice as fast and only allows one round.
      await deepl.translate('Hello', undefined, 'de', 2);

      assert.equal(warningStub.callCount, 2, 'a retries=2 budget should allow two correction rounds, not one');
    });

    it('logs a diagnostic instead of silently giving up when the re-entered api key is unchanged (regression: bug #15)', async () => {
      state.apiKey = 'sk-original-key';
      sinon.stub(Translator.prototype, 'translateText').rejects(new AuthorizationError('Authorization failure'));
      sinon.stub(vscodeMock.window, 'showWarningMessage').resolves('Change api key and try again');
      sinon.stub(vscodeMock.window, 'showInputBox').resolves('sk-original-key');
      const writeSpy = sinon.spy(debug, 'write');

      await assert.rejects(() => deepl.translate('Hello', undefined, 'de'));

      assert.ok(
        writeSpy.getCalls().some(call => /identical to the currently configured one/.test(call.args[0])),
        'expected a diagnostic log entry explaining why the retry was skipped'
      );
    });
  });

  describe('language cache', () => {
    it('invalidates the cache when the api key changes, forcing a fresh fetch (regression: bug #12)', async () => {
      await deepl.getTargetLanguages();
      assert.equal(getTargetLanguagesStub.callCount, 1);

      await deepl.getTargetLanguages();
      assert.equal(getTargetLanguagesStub.callCount, 1, 'a second call before invalidation should be served from cache');

      deepl.invalidateLanguageCache();
      await deepl.getTargetLanguages();
      assert.equal(getTargetLanguagesStub.callCount, 2, 'a call after invalidation should trigger a fresh fetch');
    });

    it('shares a single in-flight request between concurrent callers (regression: bug #17)', async () => {
      getTargetLanguagesStub.restore();
      let resolveFetch!: (languages: Language[]) => void;
      const pending = new Promise<Language[]>(resolve => {
        resolveFetch = resolve;
      });
      const freshStub = sinon.stub(Translator.prototype, 'getTargetLanguages').returns(pending);

      const first = deepl.getTargetLanguages();
      const second = deepl.getTargetLanguages();

      resolveFetch(FAKE_TARGET_LANGUAGES);
      const [firstResult, secondResult] = await Promise.all([first, second]);

      assert.equal(freshStub.callCount, 1, 'concurrent calls before resolution must share a single in-flight request');
      assert.deepEqual(firstResult, FAKE_TARGET_LANGUAGES);
      assert.deepEqual(secondResult, FAKE_TARGET_LANGUAGES);
    });
  });
});
