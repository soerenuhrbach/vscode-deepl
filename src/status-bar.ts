import * as vscode from 'vscode';
import * as deepl from './deepl';
import { state } from './state';
import { effect } from '@vue/reactivity';
import { createMachine, assign, interpret } from 'xstate';

type StatusBarEvent =
  { type: 'SET_TARGET_LANGUAGE'; value: string | null } |
  { type: 'SET_API_KEY', value: string | null };

type StatusBarContext = {
  apiKey: string | null;
  targetLanguage: string | null;
};

export function createStatusBarStateMaschine() {
  return createMachine<StatusBarContext, StatusBarEvent>({
    id: 'statusBar',
    context: {
      apiKey: null,
      targetLanguage: null,
    },
    initial: 'missingApiKey',
    states: {
      missingApiKey: {},
      configuredApiKey: {
        initial: 'noTargetLanguageSelected',
        states: {
          targetLanguageSelected: {},
          noTargetLanguageSelected: {}
        },
        on: {
          /* eslint-disable-next-line */
          SET_TARGET_LANGUAGE: [
            {
              target: 'configuredApiKey.targetLanguageSelected',
              actions: assign({
                targetLanguage: (_, event) => event.value
              }),
              cond: 'valueIsNotNullOrEmpty'
            },
            {
              target: 'configuredApiKey.noTargetLanguageSelected'
            }
          ]
        }
      },
    },
    on: {
      /* eslint-disable-next-line */
      SET_API_KEY: [
        {
          target: 'configuredApiKey',
          actions: assign({
            apiKey: (_, event) => event.value
          }),
          cond: 'valueIsNotNullOrEmpty'
        },
        {
          target: 'missingApiKey'
        }
      ]
    }
  },
  {
    guards: {
      valueIsNotNullOrEmpty: (_, event) => !!event.value
    }
  });	
}

export function createStatusBarItem() {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);

  const maschine = createStatusBarStateMaschine();
  const service = interpret(maschine)
    .onTransition(async (xstate) => {
      const prefix = '$(globe) ';

      if (xstate.matches('missingApiKey')) {
        statusBarItem.text = prefix + 'Set your DeepL API key';
        statusBarItem.command = 'deepl.configure';
        statusBarItem.tooltip = 'Set your DeepL API key';
      }

      if (xstate.matches('configuredApiKey')) {
        statusBarItem.command = 'deepl.translateTo';
        statusBarItem.tooltip = 'Select the language you want to translate into';
      }

      if (xstate.matches('configuredApiKey.noTargetLanguageSelected')) {
        statusBarItem.text = prefix + 'Select language';
      }

      if (xstate.matches('configuredApiKey.targetLanguageSelected')) {
        const lang = xstate.context.targetLanguage;
        const languages = await deepl.languages('target');
        const selectedLanguage = languages.find(x => x.language === lang);
        statusBarItem.text = prefix + (selectedLanguage?.name ?? xstate.context.targetLanguage);
      }
    })
    .start();

  effect(() => {
    service.send({ type: 'SET_API_KEY', value: state.apiKey });
    service.send({ type: 'SET_TARGET_LANGUAGE', value: state.targetLanguage });
  });
  
  statusBarItem.show();

  return statusBarItem;
}