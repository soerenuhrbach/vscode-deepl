import * as assert from 'assert/strict';
import * as sinon from 'sinon';
import * as vscodeMock from 'vscode';
import { createFakeExtensionContext, createFakeMemento, createFakeSecretStorage } from '../mocks/helpers';
import { loadExtensionState, migrateApiKeyFromConfigToSecrets, migrateWorkspaceStates, state } from '../../src/state';
import {
  CONFIG_API_KEY,
  CONFIG_PRESERVE_FORMATTING,
  CONFIG_TAG_HANDLING,
  WORKSPACE_SOURCE_LANGUAGE,
  WORKSPACE_TARGET_LANGUAGE,
} from '../../src/constants';

describe('state.ts', () => {
  afterEach(() => {
    (vscodeMock as unknown as { __resetVscodeMock(): void }).__resetVscodeMock();
    sinon.restore();
  });

  describe('migrateWorkspaceStates', () => {
    it('migrates the legacy target-language key to its OWN value, not the source-language value (regression: bug #1)', async () => {
      const context = createFakeExtensionContext({
        workspaceState: createFakeMemento({
          'deepl:sourceLanguage': 'DE',
          'deepl:targetLanguage': 'EN-US',
        }),
      });

      await migrateWorkspaceStates(context);

      assert.equal(context.workspaceState.get(WORKSPACE_SOURCE_LANGUAGE), 'DE');
      assert.equal(context.workspaceState.get(WORKSPACE_TARGET_LANGUAGE), 'EN-US');
      assert.equal(context.workspaceState.get('deepl:sourceLanguage'), undefined);
      assert.equal(context.workspaceState.get('deepl:targetLanguage'), undefined);
    });

    it('does nothing when no legacy keys are present', async () => {
      const context = createFakeExtensionContext();

      await migrateWorkspaceStates(context);

      assert.equal(context.workspaceState.get(WORKSPACE_SOURCE_LANGUAGE), undefined);
      assert.equal(context.workspaceState.get(WORKSPACE_TARGET_LANGUAGE), undefined);
    });

    it('awaits each workspaceState.update() call before resolving (regression: bug #16)', async () => {
      const memento = createFakeMemento({ 'deepl:sourceLanguage': 'DE' }, { updateDelay: true });
      const context = createFakeExtensionContext({ workspaceState: memento });

      let settled = false;
      const migration = migrateWorkspaceStates(context).then(() => {
        settled = true;
      });

      // The memento's update() only resolves on a later macrotask (setImmediate). If
      // migrateWorkspaceStates fired-and-forgot its update() calls instead of awaiting them,
      // `migration` would already be settled by the time these microtasks flush.
      await Promise.resolve();
      await Promise.resolve();
      assert.equal(settled, false, 'migrateWorkspaceStates resolved before its workspaceState.update() calls settled');

      await migration;
      assert.equal(settled, true);
      assert.equal(context.workspaceState.get(WORKSPACE_SOURCE_LANGUAGE), 'DE');
    });
  });

  describe('migrateApiKeyFromConfigToSecrets', () => {
    it('moves the api key into secret storage and clears it from configuration, instead of writing it back (regression: bug #3)', async () => {
      const config = vscodeMock.workspace.getConfiguration();
      await config.update(CONFIG_API_KEY, 'sk-plaintext-key');
      const context = createFakeExtensionContext();

      await migrateApiKeyFromConfigToSecrets(config, context);

      assert.equal(await context.secrets.get(CONFIG_API_KEY), 'sk-plaintext-key');
      assert.equal(config.get(CONFIG_API_KEY), undefined, 'the api key must be cleared from configuration, not left in plaintext');
    });

    it('does nothing when no api key is configured', async () => {
      const config = vscodeMock.workspace.getConfiguration();
      const context = createFakeExtensionContext();
      const storeSpy = sinon.spy(context.secrets, 'store');

      await migrateApiKeyFromConfigToSecrets(config, context);

      assert.equal(storeSpy.called, false);
    });
  });

  describe('loadExtensionState', () => {
    it('reads an explicit preserveFormatting=false as false, not undefined (regression: bug #2)', async () => {
      const config = vscodeMock.workspace.getConfiguration();
      await config.update(CONFIG_PRESERVE_FORMATTING, false);

      await loadExtensionState(createFakeExtensionContext());

      assert.equal(state.preserveFormatting, false);
    });

    it('reads preserveFormatting=true as true', async () => {
      const config = vscodeMock.workspace.getConfiguration();
      await config.update(CONFIG_PRESERVE_FORMATTING, true);

      await loadExtensionState(createFakeExtensionContext());

      assert.equal(state.preserveFormatting, true);
    });

    it('normalizes the tagHandling default sentinel "off" to undefined (regression: bug #14)', async () => {
      const config = vscodeMock.workspace.getConfiguration();
      await config.update(CONFIG_TAG_HANDLING, 'off');

      await loadExtensionState(createFakeExtensionContext());

      assert.equal(state.tagHandling, undefined);
    });

    it('passes through valid tagHandling values unchanged', async () => {
      const config = vscodeMock.workspace.getConfiguration();
      await config.update(CONFIG_TAG_HANDLING, 'html');

      await loadExtensionState(createFakeExtensionContext());

      assert.equal(state.tagHandling, 'html');
    });

    it('loads the api key from secret storage', async () => {
      const context = createFakeExtensionContext({
        secrets: createFakeSecretStorage({ [CONFIG_API_KEY]: 'sk-from-secrets' }),
      });

      await loadExtensionState(context);

      assert.equal(state.apiKey, 'sk-from-secrets');
    });
  });
});
