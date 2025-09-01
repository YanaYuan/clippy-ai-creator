# GitHub上传指南

## 方式一：使用Personal Access Token (推荐)

### 1. 创建Personal Access Token
1. 访问：https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 填写信息：
   - Note: "Clippy AI Creator"
   - Expiration: "30 days" 或 "No expiration"
   - 勾选权限：repo (完整仓库权限)
4. 点击 "Generate token"
5. **重要**：复制生成的token，它只显示一次！

### 2. 上传代码
```bash
# 在当前项目目录运行：
git push https://YanaYuan:[YOUR_TOKEN]@github.com/YanaYuan/clippy-ai-creator.git main
```

替换 [YOUR_TOKEN] 为你刚才复制的token

## 方式二：使用GitHub Desktop (最简单)

### 1. 下载安装
- 访问：https://desktop.github.com
- 下载并安装GitHub Desktop

### 2. 登录并上传
1. 打开GitHub Desktop
2. 使用GitHub账号登录
3. 选择 "Add an existing repository from your hard drive"
4. 选择项目文件夹：C:\Users\yinyuan\Downloads\FakeClippy_0901
5. 点击 "Publish repository"

## 方式三：直接在GitHub网页上传

### 1. 创建空仓库
1. 访问：https://github.com/YanaYuan
2. 点击 "New repository"
3. 名称：clippy-ai-creator
4. 选择 "Public"
5. 点击 "Create repository"

### 2. 上传文件
1. 在新建的仓库页面，点击 "uploading an existing file"
2. 拖拽项目文件夹中的所有文件
3. 填写提交信息："Initial commit: Clippy AI Creator"
4. 点击 "Commit changes"

---
推荐使用方式一或方式二，更专业且方便。
