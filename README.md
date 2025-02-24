# Translate with DeepL for Visual Studio Code (vscode-deepl)

Translate texts in more than 25 languages directly in your favourite code editor powered by [DeepL](https://www.deepl.com/translator).
This extension provides all the necessary integrations to easily translate texts without leaving your code editor.

## Features

The extension provides the following functionalities:

* Translate selected text in more than 25 languages and replaces them directly
* Automatically recognises the source language

The following commands are available to translate texts:

|Command|Keybinding|Description
|---|---|---
|DeepL: Translate|alt+t|Translates the selected text into the last used target language 
|DeepL: Translate to ...|alt+shift+t|Asks for the target language and translates the selected text into the target language
|DeepL: Translate to ... from ...|alt+ctrl+shift+t|Asks for source and target language and translates the selected text from the source language into the target language
|DeepL: Translate and paste from clipboard|ctrl+shift+v|Translates the clipboard content and paste it
|DeepL: Duplicate and translate|ctrl+shift+d|Duplicates and translates the selected text

The commands are accessible via the command pallette.

![Commands](doc/command-pallette.png)

In addition, the context menu is extended and now includes the translation commands.

![Menu](doc/menu.png)

The currently selected target language is displayed in the status bar. By clicking the item you can change the target language.

![Status Bar](doc/statusbar.png)

## Requirements

In order to use this extension, you need a DeepL API key.
To get an API key, you need to create an account [here](https://www.deepl.com/pro).
After you have created an account, you will find your API key [here](https://www.deepl.com/pro-account/plan).
You will be asked to enter your api key, by using your first translation.

## Extension Settings

This extension contributes the following settings:

Optional settings:

* `deepl.formality`: Whether the translated text should lean towards formal or informal language in certain languages.
* `deepl.splitSentences`: Sets whether the translation engine should first split the input into sentences.
* `deepl.preserveFormatting`: Sets whether the translation engine should respect the original formatting, even if it would usually correct some aspects.
* `deepl.tagHandling`: Sets which kind of tags should be handled. Options currently available: 'xml'.
* `deepl.splittingTags`: Comma-separated list of XML tags which always cause splits.
* `deepl.nonSplittingTags`: Comma-separated list of XML tags which never split sentences. 
* `deepl.ignoreTags`: Comma-separated list of XML tags that indicate text not to be translated.
* `deepl.defaultTargetLanguage`: Specifies the default target language the text should be translated to. The default target language will be overwriten by choosing a different language using the language chooser. (See all available target languages in the [offical documentation](https://www.deepl.com/docs-api/translate-text))
* `deepl.defaultSourceLanguage`: Specifies the default source language the text should be translated to. The default source language will be overwriten by choosing a different language using the language chooser. (See all available source languages in the [offical documentation](https://www.deepl.com/docs-api/translate-text))
* `deepl.translationMode`: Whether the selected text should be replaced with the translation result or inserted into a new line below/above

## Disclaimer

This extension is not an official implementation of the DeepL API from DeepL itself!
The author has no connection to DeepL.

## Privacy Policy

The texts are translated via the online service of [DeepL](https://www.deepl.com). Please take a look at their [privacy policy](https://www.deepl.com/en/privacy/).  
Dont use this extension if you dont agree with their privacy policy!

## Release Notes

### 1.1.2

- Patched dependencies to resolve vulnerabilities.

### 1.1.1 

- Added command "DeepL: Duplicate and translate" which duplicates and translates the selected text.

### 1.1.0

- Removed the command "Translate to ... from ... below original text"
- Added new configuration `deepl.configuration` to specify whether the selected text should be replaced with the translation result or inserted into a new line below/above
- Added the command "Deepl: Translate and paste from clipboard" which allows to translate the clipboard content and paste it.
- Show warning message if translation result equals the original text with actions to resolve this conflict.

### 1.0.14

- Minor bug fixes

### 1.0.13

- Add missing vscode command to configure the extension (f.e. the api key)

### 1.0.12

- Use official 'deepl-node' package to interact with the DeepL api.
- API keys will no longer be stored in the vscode configuration. They will be stored in the Secret Store to make sure, that the api key cant be accessed by 3rd party extensions.

### 1.0.11
### 1.0.10
### 1.0.9

- Improved marketplace appearance

### 1.0.8

- You no longer need to explicitly set "deepl.usePro" in the configuration to use the DeepL Pro API because its now determined based on the given api key
- Added validation to avoid the usage of unsupported source / target languages

### 1.0.7

- Added new configuration options "defaultTargetLanguage" and "defaultSourceLanguage" to set global default languages.

### 1.0.6

- Added support for the "glossary_id" option

### 1.0.5

- Added a debug log
- Added new command 'DeepL: Translate below the original' to insert the translation a line below the original text.
- Added tag handling for "html"
- Bugs fixed 

### 1.0.4

- Header authentication is now used instead of parameter authentication
- Formality parameter is only applied for supported languages

### 1.0.3

Added more settings to use more deepl api parameters

### 1.0.2

Added more settings to use more deepl api parameters

### 1.0.1

Added extension logo

### 1.0.0

Initial release of vscode-deepl

[MIT LICENSE](LICENSE)
