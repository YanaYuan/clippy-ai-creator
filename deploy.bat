@echo off
echo 正在推送代码到GitHub...
git remote set-url origin https://github.com/YanaYuan/clippy-ai-creator.git
git push -u origin main
if %errorlevel% equ 0 (
    echo ✅ 代码已成功推送到GitHub!
    echo 📁 仓库地址: https://github.com/YanaYuan/clippy-ai-creator
    echo.
    echo 下一步：部署到Vercel
    echo 1. 访问 https://vercel.com
    echo 2. 使用GitHub账号登录
    echo 3. 点击 "Import Project"
    echo 4. 选择 clippy-ai-creator 仓库
    echo 5. 点击 "Deploy"
) else (
    echo ❌ 推送失败，请先在GitHub上创建仓库
    echo 1. 访问 https://github.com/YanaYuan
    echo 2. 点击 "New" 创建新仓库
    echo 3. 仓库名: clippy-ai-creator
    echo 4. 设为 Public，不要添加README
    echo 5. 创建后再次运行此脚本
)
pause
