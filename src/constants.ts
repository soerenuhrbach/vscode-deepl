export const DEEPL_CONFIGURATION_SECTION = 'deepl';

export const CONFIG_API_KEY = `${DEEPL_CONFIGURATION_SECTION}.apiKey`;
export const CONFIG_FORMALITY = `${DEEPL_CONFIGURATION_SECTION}.formality`;
export const CONFIG_IGNORE_TAGS = `${DEEPL_CONFIGURATION_SECTION}.ignoreTags`;
export const CONFIG_TAG_HANDLING = `${DEEPL_CONFIGURATION_SECTION}.tagHandling`;
export const CONFIG_SPLITTING_TAGS = `${DEEPL_CONFIGURATION_SECTION}.splittingTags`;
export const CONFIG_SPLIT_SENTENCES = `${DEEPL_CONFIGURATION_SECTION}.splitSentences`;
export const CONFIG_NON_SPLITTING_TAGS = `${DEEPL_CONFIGURATION_SECTION}.nonSplittingTags`;
export const CONFIG_PRESERVE_FORMATTING = `${DEEPL_CONFIGURATION_SECTION}.preserveFormatting`;
export const CONFIG_GLOSSARY_ID = `${DEEPL_CONFIGURATION_SECTION}.glossaryId`;
export const CONFIG_DEFAULT_TARGET_LANGUAGE = `${DEEPL_CONFIGURATION_SECTION}.defaultTargetLanguage`;
export const CONFIG_DEFAULT_SOURCE_LANGUAGE = `${DEEPL_CONFIGURATION_SECTION}.defaultSourceLanguage`;
export const CONFIG_TRANSLATION_MODE = `${DEEPL_CONFIGURATION_SECTION}.translationMode`;
export const WORKSPACE_TARGET_LANGUAGE = `${DEEPL_CONFIGURATION_SECTION}.targetLanguage`;
export const WORKSPACE_SOURCE_LANGUAGE = `${DEEPL_CONFIGURATION_SECTION}.sourceLanguage`;

export const EXTENSION_IDENTIFIER = 'soerenuhrbach.vscode-deepl';

export const COMMAND_CONFIGURE = 'deepl.configure';
export const COMMAND_TRANSLATE = 'deepl.translate';
export const COMMAND_TRANSLATE_TO = 'deepl.translateTo';
export const COMMAND_TRANSLATE_FROM_TO = 'deepl.translateToFrom';
export const COMMAND_TRANSLATE_AND_PASTE_FROM_CLIPBOARD = 'deepl.translateAndPasteFromClipboard';
export const COMMAND_DUPLICATE_AND_TRANSLATE = 'deepl.duplicateAndTranslate';
export const COMMAND_SET_TARGET_LANGAUGE = 'deepl.setTargetLanguage';