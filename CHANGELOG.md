# Change Log

All notable changes to the "vscode-deepl" extension will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

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

## 1.0.3

- Added more settings to use more deepl api parameters

## 1.0.2

- Added more settings to use more deepl api parameters

## 1.0.1

- Added extension logo

## 1.0.0

- Initial release