import { workspace } from 'vscode';
import { TranslateLogger } from '../logger';

export interface TranslateResult {
  text: string;
}

export interface EngineConfig {
  [key: string]: string;
}

export abstract class BaseTranslateEngine {
  abstract readonly name: string;
  abstract readonly configSection: string;
  protected instance: any;

  protected getConfig(): any {
    return workspace.getConfiguration('varTranslation')[this.configSection] || {};
  }

  protected getConfigValue(key: string): string {
    const sectionConfig = this.getConfig();
    if (typeof sectionConfig === 'object') {
      return sectionConfig[key] || '';
    }
    return '';
  }

  async execute(src: string, targetLang: string): Promise<TranslateResult> {
    const startTime = Date.now();
    try {
      const result = await this.translate(src, targetLang);
      const elapsed = Date.now() - startTime;
      TranslateLogger.info(
        `[${this.name}] "${src}" → ${targetLang} = "${result.text}" (${elapsed}ms)`
      );
      return result;
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      TranslateLogger.error(
        `[${this.name}] "${src}" → ${targetLang} failed (${elapsed}ms): ${error.message}`
      );
      throw error;
    }
  }

  protected abstract translate(src: string, targetLang: string): Promise<TranslateResult>;
}
