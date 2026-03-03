import { capitalCase, snakeCase } from "change-case";
import { window, workspace } from "vscode";
import { isEnglishOnly } from "../utils";
import { engineRegistry, EengineType } from "./engines";
import { TranslateLogger } from "./logger";
import { t } from "../i18n";
import { packageJSON } from "../extension";

interface CacheItem {
  engine: string;
  key: string;
  result: string;
}

class VarTranslator {
  private text = '';
  private cache = new Map<string, CacheItem>();
  private config = workspace.getConfiguration('varTranslation');

  constructor() {
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('varTranslation')) {
        this.config = workspace.getConfiguration('varTranslation');
        this.showStatus(t('engine.configUpdated'));
      }
    });
  }

  get isEnglish() {
    return isEnglishOnly(this.text);
  }

  private get targetLang(): string {
    if (this.isEnglish) {
      return this.config.get<string>('targetLanguage') || 'zh';
    }
    return 'en';
  }

  private get cacheKey() {
    return this.isEnglish
      ? snakeCase(this.text)
      : this.text;
  }

  private get engineType(): string {
    return this.config.translationEngine || EengineType.google;
  }

  private showStatus(message: string) {
    const msg = `${packageJSON.displayName}: ${message}`;
    console.log(msg);
    window.setStatusBarMessage(msg, 2000);
  }

  setText(text: string) {
    this.text = text.trim();
  }

  async translate(): Promise<string> {
    if (!this.text) return '';

    const cacheKey = `${this.engineType}_${this.cacheKey}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.showStatus(t('engine.cached', { text: this.text }));
      return cached.result;
    }

    try {
      const engine = engineRegistry[this.engineType] || engineRegistry[EengineType.google];
      if (!engine) {
        this.showStatus(t('engine.notFound'));
        TranslateLogger.error(`Engine not found: ${this.engineType}`);
        return '';
      }

      const processedText = this.isEnglish
        ? capitalCase(this.text)
        : this.text;

      this.showStatus(t('engine.translating', {
        engine: this.engineType,
        text: processedText,
        target: this.targetLang,
      }));

      let { text: result } = await engine.execute(processedText, this.targetLang);
      result = result.replace(/["\n\r]/g, '');

      if (result) {
        this.cache.set(cacheKey, {
          engine: this.engineType,
          key: this.cacheKey,
          result,
        });
      }
      return result;
    } catch (error: any) {
      this.showStatus(t('engine.failed', { message: error.message }));
      return '';
    }
  }
}

export default VarTranslator;
