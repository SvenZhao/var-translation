# var-translation v2 改进设计文档

## 概述

基于用户反馈和维护需求，对驼峰翻译助手进行小幅优化，不做大的架构重构。

## 需求决策汇总

| # | 问题 | 决策 |
|---|------|------|
| 1 | 配置管理混乱 | 分组折叠 + 引导式配置命令 + 旧配置自动迁移 |
| 2 | 添加 Bing 翻译 | Azure Translator 官方 API |
| 3 | 引擎维护性差 | 拆文件 + 统一接口 + Output Channel 日志 + 引擎独立测试 |
| 4 | 国际化 | UI 文案中英双语 + 多语言翻译方向 |
| 5 | 文件翻译命名 | 不做（低频场景，投入产出比不高） |
| 6 | 架构调整 | 维持现状 + 小幅优化 |

---

## 模块一：引擎拆分 + 统一接口 + 日志 + 测试

### 目录结构

```
src/translate/
├── engines/
│   ├── base.ts              # 统一接口定义
│   ├── google.ts
│   ├── baidu.ts
│   ├── tencent.ts
│   ├── chatgpt.ts
│   ├── copilot.ts
│   ├── libretranslate.ts
│   ├── deeplx.ts
│   ├── bing.ts              # 新增
│   └── index.ts             # 引擎注册表，统一导出
├── logger.ts                # Output Channel 日志模块
├── index.ts                 # VarTranslator 类（基本不变）
```

### 统一引擎接口

```typescript
// engines/base.ts
export interface TranslateResult {
  text: string;
}

export interface TranslateEngine {
  name: string;
  translate(src: string, targetLang: string): Promise<TranslateResult>;
}
```

- 每个引擎文件独立，实现 `TranslateEngine` 接口
- `engines/index.ts` 作为注册表，统一导出所有引擎
- 删除 `src/inc/translate.ts`（与 `src/translate/engine.ts` 重复）

### 统一日志模块

```typescript
// logger.ts
// 创建 OutputChannel "驼峰翻译助手"
// 记录：引擎名、输入文本、目标语言、耗时、结果/错误
// 用户可在 VS Code "输出"面板查看
```

### 引擎独立测试

- 每个引擎可以独立运行测试，不依赖 VS Code 插件宿主环境
- 通过 mock `vscode` 模块和配置，直接用 mocha 跑测试
- 测试文件放在 `src/test/engines/` 下

---

## 模块二：添加 Bing 翻译

- **接入方式**：Azure Translator Text API v3
- **配置项**：
  - `varTranslation.bing.subscriptionKey` — Azure 订阅密钥
  - `varTranslation.bing.region` — 可选，默认 `global`
- **API 端点**：`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0`
- **实现**：独立文件 `engines/bing.ts`，实现 `TranslateEngine` 接口，使用 `axios` 调用

---

## 模块三：配置管理优化

### 分组折叠

`package.json` 中配置项按引擎分组：

- `varTranslation.translationEngine` — 顶层，选择引擎
- `varTranslation.google.*` — Google 相关
- `varTranslation.baidu.*` — 百度相关
- `varTranslation.tencent.*` — 腾讯相关
- `varTranslation.openai.*` — OpenAI 相关（已有）
- `varTranslation.bing.*` — Bing 相关（新增）
- `varTranslation.libretranslate.*` — LibreTranslate 相关（已有）
- `varTranslation.deeplx.*` — DeepLX 相关（已有）
- `varTranslation.copilot.*` — Copilot 相关（已有）

### 引导式配置命令

注册命令 `extension.varTranslation.configEngine`（"配置翻译引擎"）：

1. QuickPick 选择引擎
2. 根据所选引擎，依次弹出 InputBox 引导填写密钥
3. 自动写入 VS Code 配置
4. 填完后自动测试连通性

### 旧配置自动迁移

- 插件激活时检测旧配置 key 是否有值
- 旧 key 映射：
  - `varTranslation.baiduSecret` → `varTranslation.baidu.appId` + `varTranslation.baidu.secretKey`
  - `varTranslation.tencentSecret` → `varTranslation.tencent.secretId` + `varTranslation.tencent.secretKey`
  - `varTranslation.googleTld` → `varTranslation.google.tld`
- 自动迁移后清除旧 key，弹提示"配置已自动迁移到新格式"
- 只做一次

---

## 模块四：国际化

### UI 文案国际化

- 新增 `package.nls.json`（英文，默认）和 `package.nls.zh-cn.json`（中文）
- 所有命令标题、配置描述、菜单文案用 `%key%` 占位符替换
- 代码中的用户提示通过 `i18n` 工具函数统一管理，根据 `vscode.env.language` 返回对应语言文案

### 多语言翻译方向

- 移除写死的 `isChinese` 中英互译逻辑
- 自动检测输入语言：
  - 非英文 → 翻译为英文（变量命名场景）
  - 英文 → 翻译为用户配置的目标语言
- 新增配置项 `varTranslation.targetLanguage`，默认 `zh`，可选 `ja`、`ko`、`fr`、`de` 等
- 翻译引擎的 prompt 相应调整，不再写死语言

---

## 实施优先级

1. **模块一**：引擎拆分（其他模块的基础）
2. **模块二**：添加 Bing 翻译
3. **模块三**：配置管理优化 + 旧配置迁移
4. **模块四**：国际化
