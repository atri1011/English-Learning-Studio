# English Learning Studio

一个前端本地优先的英语学习工具：导入文章后可逐句阅读、AI 分析、单词收藏与回译练习。

## 功能概览

- 文章库
  - 支持 `粘贴文本`、上传 `.txt/.md`、`URL 导入`
  - 自动分句、统计词数与句数
  - 支持标签与按标签筛选
- 逐句阅读与分析
  - 点击句子打开分析面板
  - 支持 `翻译`、`语法`、`成分`、`讲解`、`追问` 五个分析视图
  - 支持一键“全部分析”
  - 快捷键：`J / ↓` 下一句、`K / ↑` 上一句、`Esc` 关闭面板
- 生词本
  - 阅读时可点词查询（词形、音标、词性、中文释义）
  - 一键收藏/取消收藏，支持搜索与按文章筛选
- 回译练习
  - 可创建“英文原文 + 中文提示”练习素材
  - AI 输出综合评分、维度评分、错误类型、改写建议、复盘建议
  - 保留练习历史，并标记最佳成绩
- 设置与数据管理
  - 支持多个 OpenAI 兼容 API 配置，支持启用切换与连接测试
  - 支持数据导出/恢复（文章、句子、分析、生词、练习、API 配置）

## 技术栈

- React 19 + TypeScript
- Vite 7
- React Router 7
- Zustand（状态管理）
- Dexie（IndexedDB 持久化）
- Tailwind CSS v4 + Radix UI/shadcn 风格组件

## 运行环境

- Node.js（使用与 Vite 7 兼容的版本）
- npm

## 快速开始

```bash
npm install
npm run dev
```

默认启动后访问 `http://localhost:5173`。

## 可用脚本

```bash
npm run dev      # 本地开发
npm run build    # TypeScript 构建 + Vite 打包
npm run preview  # 预览构建产物
npm run lint     # ESLint 检查
```

## 首次使用流程

1. 打开“设置”页，新增一个 API 配置。
2. 填写 `baseURL`、`apiKey`、`model`、`temperature`、`maxTokens`。
3. 注意：`baseURL` 只填服务基础地址，不要包含 `/v1/chat/completions`。
4. 测试连接通过后，导入文章并开始使用分析功能。

## 数据与隐私说明

- 项目是前端应用，无独立后端。
- 数据默认存储在浏览器 IndexedDB（数据库名：`EnglishLearningStudio`）。
- 首次进入会自动写入一篇演示文章。
- 备份文件包含 API Key，请妥善保管。

## 项目结构

```text
src/
  app/                    # 应用入口与路由
  components/             # 通用 UI 与布局
  features/
    articles/             # 文章导入、列表、详情
    reader/               # 阅读区与分析面板
    analysis/             # 句子分析与追问
    vocabulary/           # 生词本
    practice/             # 回译练习
    settings/             # API 与数据管理
  lib/
    api/                  # OpenAI 兼容接口客户端
    db/                   # Dexie 数据库与备份逻辑
  stores/                 # Zustand 状态层
  types/                  # 领域类型定义
```

## 部署说明

- 已提供 `vercel.json` 单页应用重写配置（所有路由回退到 `/`）。
- 部署前先执行：

```bash
npm run build
```

将 `dist` 目录作为静态产物部署即可。

## 常见问题

- URL 导入失败：通常是目标站点跨域限制，建议改用“复制后粘贴导入”。
- AI 返回空结果或报错：优先检查 API Key、模型名与 `maxTokens` 设置。
- 切换设备后数据丢失：本地 IndexedDB 不会自动跨设备同步，请先导出备份。
