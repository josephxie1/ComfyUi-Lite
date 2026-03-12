<div align="center">

# ComfyUI Lite ⚡

**轻量化 ComfyUI — 无需 PyTorch，节点并发执行，远程 API 驱动**

[![GitHub](https://img.shields.io/badge/GitHub-ComfyUI--Lite-181717?style=flat&logo=github)](https://github.com/josephxie1/ComfyUi-Lite)

</div>

## 简介

ComfyUI Lite 是基于 [ComfyUI](https://github.com/comfyanonymous/ComfyUI) 的轻量化分支，专为无 GPU 环境设计。移除了 PyTorch 硬依赖，采用节点并发执行机制，通过远程 API 调用 AI 模型（如 Gemini、GPT 等），适用于轻量级部署与工作流编排场景。

### 与原版的主要区别

| 特性 | ComfyUI | ComfyUI Lite |
|------|---------|--------------|
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

这是最核心的变更 — 整个 pipeline 中的 `IMAGE` 类型从 `torch.Tensor` 改为 `numpy.ndarray`：

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

如果你要适配自定义节点，需要将所有 `torch` 相关的图像处理替换为 `numpy` / `PIL` 等价操作。

## 快速开始

### 环境要求

- Python 3.10+
- 不需要 GPU 和 CUDA

### 安装

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

`releases/` 目录下的预构建包：

| 包 | 说明 |
|---|---|
| `comfyui_lite_frontend` | 自定义前端（品牌 + 工作流/资产管理） |
| `comfyui_workflow_templates_core` | 模版加载器 + 清单 |
| `comfyui_workflow_templates_media_api` | API 工作流模版（Gemini、GPT Image 等） |

> 💡 也可从 [GitHub Releases](https://github.com/josephxie1/ComfyUi-Lite/releases) 下载最新的 wheel 文件。

### 运行

```bash
python -m main
```

打开浏览器访问 http://localhost:8188

## 桌面版（macOS）

基于 Electron 的独立桌面应用，内置 Python 环境管理，开箱即用。

### 开发模式

```bash
cd desktop
yarn install
yarn start
```

### 打包 DMG

需要先配置 Apple 签名和公证环境变量：

```bash
# ~/.zshrc 中添加
export APPLE_ID="your@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="YOUR_TEAM_ID"
```

然后执行：

```bash
cd desktop
yarn make
```

产物：`desktop/dist/ComfyUI Lite-1.0.0-arm64.dmg`

### 清理测试数据

```bash
rm -rf ~/Library/Application\ Support/ComfyUI\ Lite ~/Documents/ComfyUILite
```

## 新增功能

### 工作流管理
- **版本历史** — 工作流自动保存版本快照，支持查看历史记录和回滚
- **封面图片** — 为工作流设置自定义封面，方便在列表中快速识别
- **收藏功能** — 标记常用工作流，快速访问

### 资产管理
- **集中管理** — 统一浏览和管理模型、图片等资源文件
- **资产浏览器** — 可视化资产列表，支持搜索和筛选
- **批量操作** — 支持多选删除、收藏等批量操作

## 前端开发

前端基于 Vue 3 + TypeScript + Vite，自定义了品牌和交互。

### 开发模式

```bash
cd ComfyUI_frontend
npm install
npm run dev
```

### 构建前端 pip 包

```bash
cd ComfyUI_frontend

# 构建（注意必须设置 USE_PROD_CONFIG=true）
USE_PROD_CONFIG=true npx vite build

# 打包为 pip 包
rm -rf pip_package/comfyui_frontend_package/static
cp -r dist pip_package/comfyui_frontend_package/static
cd pip_package
python -m build --wheel

# 安装
pip install dist/comfyui_lite_frontend-1.0.0-py3-none-any.whl --force-reinstall
```

> ⚠️ **重要**: 构建时必须加 `USE_PROD_CONFIG=true`，否则 Firebase 会使用开发环境配置，导致用户账号和积分不同步。

## 项目结构

```
ComfyUI-Lite/
├── main.py                  # 入口
├── execution.py             # 节点并发执行引擎
├── requirements.txt         # Python 依赖（无 torch）
├── app/                     # 服务端核心
│   ├── frontend_management.py  # 前端包加载
│   └── user_manager.py      # 用户管理
├── comfy_api_nodes/         # 远程 API 节点
├── ComfyUI_frontend/        # 前端源码（Vue 3 + Vite）
│   ├── src/                 # 源码
│   ├── public/              # 静态资源（SVG logo 等）
│   └── pip_package/         # 前端 pip 打包
├── desktop/                 # Electron 桌面版
│   ├── src/                 # 主进程 TypeScript 源码
│   ├── assets/              # 打包资源（ComfyUI, UI, uv）
│   ├── builder-debug.config.ts  # electron-builder 配置
│   └── dist/                # 打包产物（DMG）
├── custom_nodes/            # 自定义节点
└── releases/                # 预构建 wheel 包
```

## 技术特性

### 无 PyTorch 依赖
移除了所有 `import torch` 硬依赖，不再需要安装 CUDA 和 GPU 驱动。部署体积从 10GB+ 缩减至 ~200MB。

### 节点并发执行

这是与原版最大的架构改变。原版 ComfyUI 的执行引擎是**同步串行**的 — 每个节点必须等上一个执行完才能开始。对于本地 GPU 推理这没问题，但对于远程 API 调用就是巨大的瓶颈。

ComfyUI Lite 重构了 `execution.py`，改为 **async 并发引擎**：

```
原版（串行）：  Node A → 等待 → Node B → 等待 → Node C → 等待 → 完成
Lite（并发）：  Node A ─┐
                Node B ─┼─ 同时执行 → 完成
                Node C ─┘
```

**核心改动：**
- 执行入口从 `def execute()` 改为 `async def execute_async()`，使用 `asyncio.run()` 驱动
- 无依赖关系的节点通过 `asyncio.gather()` **批量并发执行**
- 节点函数支持 `async def`，远程 API 调用不再阻塞其他节点
- 每个节点的 batch 数据（如多张图片）也支持并发处理，通过 `asyncio.create_task()` 分发

**实际效果：** 例如一个工作流有 5 个独立的 Gemini 图片生成节点，原版需要串行等 5 次 API 响应（~50s），Lite 版并发执行只需 ~10s。

### 远程 API 驱动
所有 AI 推理通过远程 API 完成（Gemini、GPT Image 等），无需本地计算资源。节点的 `FUNCTION` 方法可以直接定义为 `async def`，执行引擎会自动并发调度。

## 自定义节点

| 节点 | 说明 |
|------|------|
| Gemini Image | Google Gemini 图片生成/编辑 |
| GPT Image | OpenAI GPT-4o 图片生成 |
| Midjourney Suite | MJ 图片生成/变体/放大 |
| Grid Image | 图片网格拼接 |

所有节点均使用 `async def` 实现，支持并发执行。详见 `custom_nodes/` 目录。

## 致谢

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) — 原版后端（by [comfyanonymous](https://github.com/comfyanonymous)）
- [ComfyUI Frontend](https://github.com/Comfy-Org/ComfyUI_frontend) — 原版前端框架（by [Comfy-Org](https://github.com/Comfy-Org)）
- [ComfyUI Desktop](https://github.com/Comfy-Org/electron-app) — 原版桌面应用（by [Comfy-Org](https://github.com/Comfy-Org)）

## License

本项目包含多个组件，均遵循 **GNU General Public License v3.0 (GPL-3.0)** 协议：

| 组件 | 来源 | License |
|------|------|---------|
| 后端 (Python) | [comfyanonymous/ComfyUI](https://github.com/comfyanonymous/ComfyUI) | GPL-3.0 |
| 前端 (Vue 3) | [Comfy-Org/ComfyUI_frontend](https://github.com/Comfy-Org/ComfyUI_frontend) | GPL-3.0 |
| 桌面版 (Electron) | [Comfy-Org/electron-app](https://github.com/Comfy-Org/electron-app) | GPL-3.0 |

### 修改说明

根据 GPL-3.0 第 5 条要求，本项目对上述组件做了以下主要修改：

**后端：**
- 移除 PyTorch 硬依赖，改为纯 API 驱动（numpy 替代 torch.Tensor）
- 执行引擎从串行改为 asyncio 并发模型
- 移除非 API 工作流模版，仅保留远程 API 模版
- 新增自定义节点（Gemini Image、GPT Image、Midjourney 等）

**前端：**
- 自定义品牌（XDCLAB logo、主题色）
- 新增工作流版本历史、封面图片、收藏功能
- 新增资产管理、批量操作

**桌面版：**
- 移除 PyTorch/CUDA 相关安装流程
- 自定义 Tray 图标和安装界面
- 简化环境构建（CPU only，无 GPU 检测）

### 合规声明

- 本项目的完整源代码在 [GitHub](https://github.com/josephxie1/ComfyUi-Lite) 上公开
- 本项目继承 GPL-3.0 协议，任何接收分发副本的用户同样享有查看、修改、再分发源代码的权利
- 原版 ComfyUI 的版权归 comfyanonymous 及其贡献者所有

```
ComfyUI Lite — Copyright (C) 2024 josephxie1
Based on ComfyUI — Copyright (C) 2024 comfyanonymous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```
