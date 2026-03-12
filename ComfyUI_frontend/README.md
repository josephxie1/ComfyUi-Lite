# ComfyUI Lite Frontend

基于 [Comfy-Org/ComfyUI_frontend](https://github.com/Comfy-Org/ComfyUI_frontend) 修改的自定义前端。

## 主要修改

- 品牌自定义（XDCLAB logo、主题色）
- 工作流版本历史、封面图片、收藏功能
- 资产管理、批量操作
- 移除 Comfy-Org 注册/登录（替换为自有账号体系）

## 开发

```bash
npm install
npm run dev
```

## 构建 pip 包

```bash
# 构建（必须设置 USE_PROD_CONFIG=true）
USE_PROD_CONFIG=true npx vite build

# 打包
rm -rf pip_package/comfyui_frontend_package/static
cp -r dist pip_package/comfyui_frontend_package/static
cd pip_package && python -m build --wheel

# 安装
pip install dist/comfyui_lite_frontend-1.0.0-py3-none-any.whl --force-reinstall
```

> ⚠️ 构建时必须加 `USE_PROD_CONFIG=true`，否则 Firebase 会使用开发环境配置。

## License

基于 [Comfy-Org/ComfyUI_frontend](https://github.com/Comfy-Org/ComfyUI_frontend) 修改，遵循 GPL-3.0 协议。
