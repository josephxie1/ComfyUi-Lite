# ComfyUI Lite Desktop

基于 [Comfy-Org/electron-app](https://github.com/Comfy-Org/electron-app) 修改的 macOS 桌面应用。

## 主要修改

- 移除 PyTorch/CUDA 相关安装流程（CPU only）
- 自定义品牌（XDCLAB Tray 图标、应用图标）
- 简化环境构建（无 GPU 检测）
- 安装路径自动重置（删除数据目录后重新安装）

## 开发

```bash
yarn install
yarn start
```

## 打包 DMG

需要先配置 Apple 签名环境变量（见根目录 README）。

```bash
yarn make
```

产物：`dist/ComfyUI Lite-1.0.0-arm64.dmg`

## 清理

```bash
# 清理构建产物
rm -rf dist .vite

# 清理用户数据（重新安装）
rm -rf ~/Library/Application\ Support/ComfyUI\ Lite ~/Documents/ComfyUILite
```

## 常见问题

### node-pty 编译错误

```bash
npx electron-rebuild
```

### "不明开发者" 提示

确保 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID` 环境变量已设置，重新 `yarn make`。

## License

基于 [Comfy-Org/electron-app](https://github.com/Comfy-Org/electron-app) 修改，遵循 GPL-3.0 协议。
