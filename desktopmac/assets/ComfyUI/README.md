<div align="center">

# ComfyUI Lite ⚡

**[中文](#中文) | [English](#english)**

</div>

---

<a id="中文"></a>

## 中文

**轻量化 ComfyUI — 无需 PyTorch，节点并发执行，远程 API 驱动**

[![GitHub](https://img.shields.io/badge/GitHub-ComfyUI--Lite-181717?style=flat&logo=github)](https://github.com/josephxie1/ComfyUi-Lite)

### 简介

[ComfyUI](https://github.com/comfyanonymous/ComfyUI) 是目前最强大的开源 AI 图像工作流引擎，但它有一个核心假设：**用户拥有本地 GPU**。

这带来了几个痛点：

- **部署门槛高** — 必须安装 PyTorch + CUDA，环境搭建复杂，包体积 10GB+
- **无法在轻量设备上运行** — 没有 NVIDIA GPU 的 Mac、云服务器、嵌入式设备都无法使用
- **执行效率低** — 节点串行执行，调用远程 API 时大量时间浪费在等待上
- **难以作为工作流编排平台** — 与外部 AI 服务（Gemini、GPT 等）集成时，本地 GPU 反而是多余的负担

**ComfyUI Lite** 正是为了解决这些问题而生。它从 ComfyUI 分支而来，做了三个核心改造：

1. **移除 PyTorch** — 部署体积从 10GB+ 降至 ~200MB，任何设备都能运行
2. **并发执行引擎** — 节点不再排队等待，独立节点同时执行，API 调用效率提升 5-10x
3. **远程 API 驱动** — 将 ComfyUI 从「本地推理工具」转变为「AI 工作流编排平台」

### 与原版的主要区别

| 特性 | ComfyUI | ComfyUI Lite |
|------|---------|----|
| PyTorch 依赖 | ✅ 必需 | ❌ 已移除 |
| 本地 GPU 推理 | ✅ 支持 | ❌ 不支持 |
| 远程 API 节点 | ✅ 可选 | ✅ 核心能力 |
| 节点执行方式 | 串行 | 并发 |
| 图像张量类型 | `torch.Tensor` | `numpy.ndarray` |
| 部署体积 | ~10GB+ | ~200MB |
| 适用场景 | 本地 AI 创作 | 轻量部署 / 工作流编排 |

> ⚠️ **重要兼容性说明**
>
> **原版 ComfyUI 的自定义节点（custom nodes）不兼容本版本。** 由于移除了 PyTorch，所有使用 `torch.Tensor` 处理图像的节点都需要迁移为 `numpy.ndarray`。

### 图像张量变更

整个 pipeline 中的 `IMAGE` 类型从 `torch.Tensor` 改为 `numpy.ndarray`：

```python
# ❌ 原版 ComfyUI（torch.Tensor）
# shape: (B, C, H, W), dtype: torch.float32
image = torch.zeros(1, 3, 512, 512)

# ✅ ComfyUI Lite（numpy.ndarray）
# shape: (B, H, W, C), dtype: np.float32, 值域 [0, 1]
image = np.zeros((1, 512, 512, 3), dtype=np.float32)
```

**关键区别：**
- 类型：`torch.Tensor` → `numpy.ndarray`
- 通道顺序：`(B, C, H, W)` → `(B, H, W, C)`
- 操作函数：`torch.*` → `numpy.*` 或 `PIL`

### 快速开始

**环境要求：** Python 3.10+，不需要 GPU 和 CUDA

```bash
# 克隆仓库
git clone https://github.com/josephxie1/ComfyUi-Lite.git
cd ComfyUi-Lite

# 创建虚拟环境（推荐）
conda create -n comfyui_lite python=3.12
conda activate comfyui_lite

# 安装 Python 依赖
pip install -r requirements.txt

# 安装预构建包（从 releases 目录）
pip install releases/comfyui_lite_frontend-1.0.0-py3-none-any.whl
pip install releases/comfyui_workflow_templates_core-0.3.166-py3-none-any.whl
pip install releases/comfyui_workflow_templates_media_api-0.3.62-py3-none-any.whl
```

或者直接从 GitHub Release 在线安装（无需克隆 releases 目录）：

```bash
pip install https://github.com/josephxie1/ComfyUi-Lite/releases/download/v1.0.0/comfyui_lite_frontend-1.0.0-py3-none-any.whl
pip install https://github.com/josephxie1/ComfyUi-Lite/releases/download/v1.0.0/comfyui_workflow_templates_core-0.3.166-py3-none-any.whl
pip install https://github.com/josephxie1/ComfyUi-Lite/releases/download/v1.0.0/comfyui_workflow_templates_media_api-0.3.62-py3-none-any.whl
```

| 包 | 说明 |
|---|---|
| `comfyui_lite_frontend` | 自定义前端（品牌 + 工作流/资产管理） |
| `comfyui_workflow_templates_core` | 模版加载器 + 清单 |
| `comfyui_workflow_templates_media_api` | API 工作流模版（Gemini、GPT Image 等） |

### 运行

```bash
python -m main
```

打开浏览器访问 http://localhost:8188

### 桌面版（macOS）

基于 Electron 的独立桌面应用，内置 Python 环境管理，开箱即用。

```bash
# 开发模式
cd desktop && yarn install && yarn start

# 打包 DMG（需配置 Apple 签名环境变量）
yarn make
```

产物：`desktop/dist/ComfyUI Lite-1.0.0-arm64.dmg`

### 新增功能

- **工作流管理** — 版本历史（自动快照 + 回滚）、封面图片、收藏
- **资产管理** — 集中浏览模型/图片、搜索筛选、批量操作

### 技术特性

**无 PyTorch 依赖** — 部署体积从 10GB+ 缩减至 ~200MB

**节点并发执行** — 原版串行执行改为 async 并发引擎：
```
原版（串行）：  Node A → 等待 → Node B → 等待 → Node C
Lite（并发）：  Node A ─┐
                Node B ─┼─ 同时执行 → 完成
                Node C ─┘
```

**远程 API 驱动** — 所有 AI 推理通过远程 API 完成，节点支持 `async def`，自动并发调度。

### 自定义节点

| 节点 | 说明 |
|------|------|
| Gemini Image | Google Gemini 图片生成/编辑 |
| GPT Image | OpenAI GPT-4o 图片生成 |
| Midjourney Suite | MJ 图片生成/变体/放大 |
| Grid Image | 图片网格拼接 |

### 前端开发

```bash
cd ComfyUI_frontend
npm install && npm run dev

# 构建 pip 包（必须加 USE_PROD_CONFIG=true）
USE_PROD_CONFIG=true npx vite build
cd pip_package && python -m build --wheel
```

### 项目结构

```
ComfyUI-Lite/
├── main.py                  # 入口
├── execution.py             # 节点并发执行引擎
├── requirements.txt         # Python 依赖（无 torch）
├── comfy_api_nodes/         # 远程 API 节点
├── ComfyUI_frontend/        # 前端源码（Vue 3 + Vite）
├── desktop/                 # Electron 桌面版
├── custom_nodes/            # 自定义节点
└── releases/                # 预构建 wheel 包
```

---

<a id="english"></a>

## English

**Lightweight ComfyUI — No PyTorch, Concurrent Node Execution, Remote API Driven**

[![GitHub](https://img.shields.io/badge/GitHub-ComfyUI--Lite-181717?style=flat&logo=github)](https://github.com/josephxie1/ComfyUi-Lite)

### Introduction

[ComfyUI](https://github.com/comfyanonymous/ComfyUI) is the most powerful open-source AI image workflow engine, but it has one core assumption: **the user has a local GPU**.

This creates several pain points:

- **High deployment barrier** — Requires PyTorch + CUDA, complex environment setup, 10GB+ package size
- **Can't run on lightweight devices** — Unusable on Macs without NVIDIA GPU, cloud servers, or embedded devices
- **Low execution efficiency** — Sequential node execution wastes time waiting during remote API calls
- **Poor fit as a workflow orchestration platform** — When integrating with external AI services (Gemini, GPT, etc.), local GPU becomes unnecessary overhead

**ComfyUI Lite** was built to solve these problems. Forked from ComfyUI, it makes three core changes:

1. **Remove PyTorch** — Deployment size reduced from 10GB+ to ~200MB, runs on any device
2. **Concurrent execution engine** — Independent nodes execute simultaneously, 5-10x faster for API workflows
3. **Remote API driven** — Transforms ComfyUI from a "local inference tool" into an "AI workflow orchestration platform"

### Key Differences from Original

| Feature | ComfyUI | ComfyUI Lite |
|---------|---------|---|
| PyTorch | ✅ Required | ❌ Removed |
| Local GPU Inference | ✅ Supported | ❌ Not supported |
| Remote API Nodes | ✅ Optional | ✅ Core capability |
| Node Execution | Sequential | Concurrent |
| Image Tensor Type | `torch.Tensor` | `numpy.ndarray` |
| Deployment Size | ~10GB+ | ~200MB |
| Use Case | Local AI Creation | Lightweight Deploy / Workflow Orchestration |

> ⚠️ **Compatibility Notice**
>
> **Original ComfyUI custom nodes are NOT compatible.** All nodes using `torch.Tensor` for image processing must be migrated to `numpy.ndarray`.

### Image Tensor Changes

The `IMAGE` type throughout the pipeline changed from `torch.Tensor` to `numpy.ndarray`:

```python
# ❌ Original ComfyUI (torch.Tensor)
# shape: (B, C, H, W), dtype: torch.float32
image = torch.zeros(1, 3, 512, 512)

# ✅ ComfyUI Lite (numpy.ndarray)
# shape: (B, H, W, C), dtype: np.float32, range [0, 1]
image = np.zeros((1, 512, 512, 3), dtype=np.float32)
```

**Key differences:**
- Type: `torch.Tensor` → `numpy.ndarray`
- Channel order: `(B, C, H, W)` → `(B, H, W, C)`
- Operations: `torch.*` → `numpy.*` or `PIL`

### Quick Start

**Requirements:** Python 3.10+, No GPU or CUDA needed

```bash
# Clone repository
git clone https://github.com/josephxie1/ComfyUi-Lite.git
cd ComfyUi-Lite

# Create virtual environment (recommended)
conda create -n comfyui_lite python=3.12
conda activate comfyui_lite

# Install Python dependencies
pip install -r requirements.txt

# Install pre-built packages (from releases directory)
pip install releases/comfyui_lite_frontend-1.0.0-py3-none-any.whl
pip install releases/comfyui_workflow_templates_core-0.3.166-py3-none-any.whl
pip install releases/comfyui_workflow_templates_media_api-0.3.62-py3-none-any.whl
```

Or install directly from GitHub Release (no need to clone releases directory):

```bash
pip install https://github.com/josephxie1/ComfyUi-Lite/releases/download/v1.0.0/comfyui_lite_frontend-1.0.0-py3-none-any.whl
pip install https://github.com/josephxie1/ComfyUi-Lite/releases/download/v1.0.0/comfyui_workflow_templates_core-0.3.166-py3-none-any.whl
pip install https://github.com/josephxie1/ComfyUi-Lite/releases/download/v1.0.0/comfyui_workflow_templates_media_api-0.3.62-py3-none-any.whl
```

| Package | Description |
|---|---|
| `comfyui_lite_frontend` | Custom frontend (branding + workflow/asset management) |
| `comfyui_workflow_templates_core` | Template loader + catalog |
| `comfyui_workflow_templates_media_api` | API workflow templates (Gemini, GPT Image, etc.) |

### Run

```bash
python -m main
```

Open browser at http://localhost:8188

### Desktop App (macOS)

Standalone Electron app with built-in Python environment management.

```bash
# Development mode
cd desktop && yarn install && yarn start

# Build DMG (requires Apple signing env vars)
yarn make
```

Output: `desktop/dist/ComfyUI Lite-1.0.0-arm64.dmg`

### Features

- **Workflow Management** — Version history (auto snapshots + rollback), cover images, favorites
- **Asset Management** — Centralized model/image browsing, search, batch operations

### Technical Highlights

**No PyTorch** — Deployment size reduced from 10GB+ to ~200MB

**Concurrent Node Execution** — Sequential execution replaced with async concurrent engine:
```
Original (sequential):  Node A → wait → Node B → wait → Node C
Lite (concurrent):      Node A ─┐
                        Node B ─┼─ execute simultaneously → done
                        Node C ─┘
```

**Remote API Driven** — All AI inference via remote APIs. Nodes support `async def` for automatic concurrent scheduling.

### Custom Nodes

| Node | Description |
|------|------|
| Gemini Image | Google Gemini image generation/editing |
| GPT Image | OpenAI GPT-4o image generation |
| Midjourney Suite | MJ image generation/variants/upscale |
| Grid Image | Image grid composition |

### Frontend Development

```bash
cd ComfyUI_frontend
npm install && npm run dev

# Build pip package (USE_PROD_CONFIG=true required)
USE_PROD_CONFIG=true npx vite build
cd pip_package && python -m build --wheel
```

### Project Structure

```
ComfyUI-Lite/
├── main.py                  # Entry point
├── execution.py             # Concurrent node execution engine
├── requirements.txt         # Python deps (no torch)
├── comfy_api_nodes/         # Remote API nodes
├── ComfyUI_frontend/        # Frontend source (Vue 3 + Vite)
├── desktop/                 # Electron desktop app
├── custom_nodes/            # Custom nodes
└── releases/                # Pre-built wheel packages
```

---

## Acknowledgments

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) — Original backend (by [comfyanonymous](https://github.com/comfyanonymous))
- [ComfyUI Frontend](https://github.com/Comfy-Org/ComfyUI_frontend) — Original frontend (by [Comfy-Org](https://github.com/Comfy-Org))
- [ComfyUI Desktop](https://github.com/Comfy-Org/electron-app) — Original desktop app (by [Comfy-Org](https://github.com/Comfy-Org))

## License

All components are licensed under **GNU General Public License v3.0 (GPL-3.0)**.

| Component | Source | License |
|-----------|--------|---------|
| Backend (Python) | [comfyanonymous/ComfyUI](https://github.com/comfyanonymous/ComfyUI) | GPL-3.0 |
| Frontend (Vue 3) | [Comfy-Org/ComfyUI_frontend](https://github.com/Comfy-Org/ComfyUI_frontend) | GPL-3.0 |
| Desktop (Electron) | [Comfy-Org/electron-app](https://github.com/Comfy-Org/electron-app) | GPL-3.0 |

```
ComfyUI Lite — Copyright (C) 2024 josephxie1
Based on ComfyUI — Copyright (C) 2024 comfyanonymous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
```
