import * as assert from 'assert/strict';
import * as fs from 'fs';
import * as path from 'path';

// Static assertions against the settings schema itself - no vscode mock needed. These guard
// against regressing the source/target language enum split (bug #8) and the formality range
// (bug #18), both of which caused real "Bad request" translation failures for users.
describe('package.json configuration schema', () => {
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const properties = packageJson.contributes.configuration[0].properties as Record<string, { enum?: string[] }>;

  it('offers only source-valid English/Portuguese codes for deepl.defaultSourceLanguage', () => {
    const sourceEnum = properties['deepl.defaultSourceLanguage'].enum ?? [];

    assert.ok(sourceEnum.includes('EN'), 'defaultSourceLanguage should offer generic EN');
    assert.ok(!sourceEnum.includes('EN-GB'), 'DeepL rejects EN-GB as a source_lang value');
    assert.ok(!sourceEnum.includes('EN-US'), 'DeepL rejects EN-US as a source_lang value');
    assert.ok(sourceEnum.includes('PT'), 'defaultSourceLanguage should offer generic PT');
  });

  it('offers only target-valid English/Portuguese codes for deepl.defaultTargetLanguage', () => {
    const targetEnum = properties['deepl.defaultTargetLanguage'].enum ?? [];

    assert.ok(targetEnum.includes('EN-GB'), 'defaultTargetLanguage should offer EN-GB');
    assert.ok(targetEnum.includes('EN-US'), 'defaultTargetLanguage should offer EN-US');
    assert.ok(targetEnum.includes('PT-BR'), 'defaultTargetLanguage should offer PT-BR');
    assert.ok(targetEnum.includes('PT-PT'), 'defaultTargetLanguage should offer PT-PT');
    assert.ok(!targetEnum.includes('PT'), 'DeepL requires a dialect-qualified PT-BR/PT-PT for target_lang');
  });

  it('does not offer any code as a source language that is not also valid as one', () => {
    // EN-GB/EN-US/PT-BR/PT-PT must never appear in the source enum, no matter what else changes.
    const sourceEnum = properties['deepl.defaultSourceLanguage'].enum ?? [];
    for (const targetOnlyCode of ['EN-GB', 'EN-US', 'PT-BR', 'PT-PT']) {
      assert.ok(!sourceEnum.includes(targetOnlyCode), `${targetOnlyCode} is target-only and must not be offered as a source language`);
    }
  });

  it('supports the full deepl-node Formality range', () => {
    const formalityEnum = properties['deepl.formality'].enum ?? [];
    for (const value of ['default', 'less', 'more', 'prefer_less', 'prefer_more']) {
      assert.ok(formalityEnum.includes(value), `formality enum is missing '${value}'`);
    }
  });
});
