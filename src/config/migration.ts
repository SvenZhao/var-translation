import { window, workspace, ExtensionContext } from 'vscode';

interface MigrationRule {
  oldKey: string;
  newKeys: { key: string; extractor: (value: string) => string }[];
}

const MIGRATION_RULES: MigrationRule[] = [
  {
    oldKey: 'baiduSecret',
    newKeys: [
      { key: 'baidu.appId', extractor: (value: string) => value.split(',')[0] || '' },
      { key: 'baidu.secretKey', extractor: (value: string) => value.split(',')[1] || '' },
    ],
  },
  {
    oldKey: 'tencentSecret',
    newKeys: [
      { key: 'tencent.secretId', extractor: (value: string) => value.split(',')[0] || '' },
      { key: 'tencent.secretKey', extractor: (value: string) => value.split(',')[1] || '' },
    ],
  },
  {
    oldKey: 'googleTld',
    newKeys: [
      { key: 'google.tld', extractor: (value: string) => value },
    ],
  },
];

const MIGRATION_DONE_KEY = 'varTranslation-config-migrated';

export async function migrateOldConfig(context: ExtensionContext): Promise<void> {
  const { globalState } = context;

  if (globalState.get<boolean>(MIGRATION_DONE_KEY)) {
    return;
  }

  const config = workspace.getConfiguration('varTranslation');
  let migrated = false;

  for (const rule of MIGRATION_RULES) {
    const oldValue = config.get<string>(rule.oldKey);
    if (!oldValue) continue;

    for (const newKey of rule.newKeys) {
      const extractedValue = newKey.extractor(oldValue);
      if (extractedValue) {
        await config.update(newKey.key, extractedValue, true);
      }
    }

    await config.update(rule.oldKey, undefined, true);
    migrated = true;
  }

  if (migrated) {
    window.showInformationMessage('驼峰翻译助手：配置已自动迁移到新格式，旧配置项已清除。');
  }

  await globalState.update(MIGRATION_DONE_KEY, true);
}
