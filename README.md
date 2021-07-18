# vscode-deepl

Translate texts directly inside vscode powered by [DeepL](https://www.deepl.com/translator). 
This extension provides all the necessary integrations to easily translate texts into all languages.

## Features

The extension provides the following functionalities:

* Translates selected texts and directly replaces them
* Automatically recognises the source language

The following commands are available to translate texts:

|Command|Description
|---|---
|DeepL: Translate|Translates the selected text to the last used language
|DeepL: Translate to ...|Asks for the target language and translates the selected text into the target language
|DeepL: Translate from ... to ...|Asks for source and target language and translates the selected text from the source language into the target language

The commands are accessible via the command pallette.

![Commands](doc/command-pallette.png)

In addition, the context menu is extended and now includes the translation commands

![Menu](doc/menu.png)

The currently selected target language is displayed in the status bar. By clicking the item you can change the target language.

![Status Bar](doc/statusbar.png)

## Requirements

In order to use this extension, you need a DeepL API key.
To get an API key, you need to create an account [here](https://www.deepl.com/pro).
After you have created an account, you will find your API key [here](https://www.deepl.com/pro-account/plan).
You can store the API key via the following settings.

## Extension Settings

This extension contributes the following settings:

* `deepl.apiKey`: The key is used to authenticate with the DeepL API. [See offical documentation](https://www.deepl.com/docs-api/accessing-the-api/authentication/)
* `deepl.usePro`: Whether to use the DeepL Pro API - check this option if you use the paid plan.

For this extension to work, the above settings must be made.

## Disclaimer

This extension is not an official implementation of the DeepL API from DeepL itself!
The author has no connection to DeepL.

## Privacy Policy

The texts are translated via the online service of [DeepL](https://www.deepl.com). Please take a look at their [privacy policy](https://www.deepl.com/en/privacy/).  
Dont use this extension if you dont agree with their privacy policy!

## Release Notes

### 1.0.0

Initial release of vscode-deepl

[MIT LICENSE](LICENSE)
