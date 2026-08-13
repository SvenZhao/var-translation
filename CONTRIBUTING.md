# 贡献指南

欢迎贡献代码、提交 Issue 或参与讨论。在动手之前，请先阅读本指南。

## 开发环境

```bash
npm install          # 安装依赖
npm run compile      # 编译（开发模式，带 sourcemap）
npm run watch        # 监听模式编译
npm run lint         # ESLint 检查
npm run test         # 引擎测试
```

在 VS Code 中打开本项目，按 `F5` 启动「扩展开发宿主」即可调试插件。

## 新增翻译引擎

项目采用模块化的引擎架构：每个引擎是一个继承 `BaseTranslateEngine` 的类，在注册表中登记后即可在设置中选用。

以新增「示例翻译引擎」为例，共 5 步：

### 1. 创建引擎类

在 `src/translate/engines/` 下新建 `example.ts`，参考 `deeplx.ts`、`baidu.ts` 等现有实现：

```ts
import { window } from 'vscode';
import { BaseTranslateEngine, TranslateResult } from './base';

export class ExampleTranslateEngine extends BaseTranslateEngine {
  readonly name = 'Example';
  readonly configSection = 'example';

  protected async translate(src: string, targetLang: string): Promise<TranslateResult> {
    // 从配置读取密钥/地址
    const apiKey = this.getConfigValue('apiKey');

    // 调用你的翻译 API，返回 { text: 翻译结果 }
    return { text: src };
  }
}
```

- `configSection` 对应设置项前缀（即 `varTranslation.example.apiKey`）
- 失败时调用 `window.showErrorMessage` 返回 `{ text: '' }`，避免抛出未处理异常

### 2. 注册引擎类型

`src/translate/engines/index.ts` 中的 `EengineType` 枚举添加新类型：

```ts
export enum EengineType {
  // ...现有枚举
  example = 'example',
}
```

### 3. 加入引擎注册表

同一文件的 `engineRegistry` 中注册实例：

```ts
export const engineRegistry: Record<string, BaseTranslateEngine> = {
  // ...现有注册
  [EengineType.example]: new ExampleTranslateEngine(),
};
```

### 4. 添加设置项

在 `package.json` 中：

- `contributes.commands` 无关，但需在 `contributes.configuration.properties` 添加引擎配置：
  - `varTranslation.example.apiKey` 等配置项（`varTranslation.{configSection}.{key}`）
- 在 `varTranslation.translationEngine` 的 `enum` 和 `enumDescriptions` 中加入引擎类型，用户才能在设置/状态栏中切换

### 5. 本地验证

```bash
npm run lint        # 静态检查通过
npm run compile     # 编译通过
npm run test        # 引擎测试通过
```

在扩展开发宿主中实际翻译一次，确认配置引导（命令面板 →「配置翻译引擎」）与翻译链路都正常，然后提交 PR。

## 提交规范

- Commit message 使用 Conventional Commits 风格：`feat: ...`、`fix: ...`、`chore: ...`、`docs: ...`
- 仓库配置了 `f2elint` 的 commit-msg 检查（`npm run f2elint-scan`）
- 新功能请附上可复现的测试或操作步骤

## 其他贡献方式

- 报告 bug / 提需求：[提交 Issue](https://github.com/SvenZhao/var-translation/issues)
- 翻译引擎的稳定性和测试成本较高，维护者无法逐一验证，欢迎各引擎的使用者贡献自己验证过的引擎（见上文指南）
