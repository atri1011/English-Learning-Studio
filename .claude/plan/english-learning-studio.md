# English Learning Studio - 实施计划

## 项目概述
纯前端英语学习网站，用户上传英文文章后通过 AI 按需分析（语法分析、句子成分、双语翻译、逐句讲解），渐进式披露结果。

## 技术栈
- React 19 + Vite
- Tailwind CSS + shadcn/ui
- React Router v7
- Dexie.js (IndexedDB)
- Zustand

## 实施步骤

### Step 1: 工程初始化
- Vite + React 19 + TypeScript 脚手架
- 配置 Tailwind CSS + shadcn/ui
- 配置 React Router
- 配置 Dexie.js + Zustand
- 全局样式（主题 CSS 变量、字体引入）
- AppShell 布局骨架（Header + Sidebar + Main）
- Vercel 部署配置

### Step 2: 数据层
- Dexie schema 定义（articles / sentences / analysisResults / apiProfiles / appKv）
- 文章仓储层（CRUD）
- 分句服务（article-parser.ts）
- API 配置仓储层

### Step 3: 文章管理（Library 页）
- 文章列表页（网格布局、卡片展示）
- 文章导入对话框（粘贴文本 / 上传 .txt）
- 文章删除、编辑标题
- 空状态引导

### Step 4: 阅读器（Reader 页）
- 双栏布局：阅读区（max-w-[65ch]，衬线字体，leading-[1.75]）+ 侧边分析面板（w-96）
- 句子列表渲染（SentenceItem 组件，hover/click 交互）
- 侧边面板骨架（Tabs 切换：翻译 / 语法 / 成分 / 讲解）
- 移动端适配：底部 Drawer 替代侧边栏
- 句子 URL 深链（/articles/:id/sentences/:sentenceId）

### Step 5: API 配置与兼容层
- Settings 页面：API Profile 表单（baseURL / apiKey / model / temperature / maxTokens）
- 多配置管理（增删改、切换激活）
- OpenAI 兼容客户端（openai-compatible-client.ts）
- 连接测试功能
- 错误分类与映射

### Step 6: AI 分析核心链路
- Prompt 模板（grammar / constituents / translation / explanation）
- JSON Schema 定义与校验
- analysis-orchestrator（按需触发、缓存检查、请求去重）
- 重试策略（指数退避、JSON 修复重试）
- 分析结果持久化到 IndexedDB

### Step 7: 分析结果展示
- TranslationCard：英中对照、短语对齐
- GrammarCard：时态/语态/从句类型可视化
- ConstituentsCard：句子成分高亮（背景色 + 底部虚线标注）
- ExplanationCard：语法点、词汇、表达技巧、练习题
- 加载状态（Shimmer 骨架屏）

### Step 8: 主题与优化
- 亮色/暗色主题切换
- 护眼（Sepia）模式
- 字号调节
- 性能优化（句子组件 memo、LRU 缓存）
- 导出/导入数据

## 核心设计参数

### 阅读排版
- 字体：Merriweather（正文）/ Inter（UI）
- 字号：18px (text-lg)
- 行高：1.75
- 最大宽度：65ch
- 段落间距：1.5rem

### 句子成分颜色
| 成分 | 亮色模式 | 暗色模式 |
|------|----------|----------|
| 主语 S | bg-rose-500/15 | bg-rose-400/20 |
| 谓语 V | bg-blue-500/15 | bg-blue-400/20 |
| 宾语 O | bg-emerald-500/15 | bg-emerald-400/20 |
| 修饰语 | bg-amber-500/15 | bg-amber-400/20 |

### 数据模型
- articles: id, title, rawText, sentenceCount, wordCount, status, timestamps
- sentences: id, articleId, order, text, checksum, charStart, charEnd
- analysisResults: id, requestHash, articleId, sentenceId, analysisType, status, resultJson, model, attempts, timestamps
- apiProfiles: id, name, baseURL, apiKey, model, temperature, maxTokens, isActive
