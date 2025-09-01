@echo off
chcp 65001 >nul
echo.
echo =====================================
echo     Clippy AI Creator - Vercel部署
echo =====================================
echo.
echo ✅ 代码已成功上传到 GitHub！
echo 📁 仓库地址: https://github.com/YanaYuan/clippy-ai-creator
echo.
echo 现在开始部署到 Vercel：
echo.
echo 步骤 1: 访问 Vercel 网站
echo 步骤 2: 使用 GitHub 账号登录
echo 步骤 3: 导入 clippy-ai-creator 项目
echo 步骤 4: 配置环境变量
echo 步骤 5: 部署项目
echo.
set /p open_vercel="是否打开 Vercel 网站开始部署? (y/n): "
if /i "%open_vercel%"=="y" (
    echo 正在打开 Vercel...
    start https://vercel.com/new
    echo.
    echo 📋 部署配置信息：
    echo.
    echo 环境变量设置：
    echo - API_KEY: 你的Claude API密钥
    echo - BASE_URL: https://www.dmxapi.cn/v1  
    echo - MODEL: claude-sonnet-4-20250514
    echo.
    echo 💡 提示：在Vercel中选择你的GitHub仓库时，
    echo    搜索: clippy-ai-creator
    echo.
)
echo.
echo 📖 详细部署指南已保存在 DEPLOYMENT_GUIDE.md
echo.
pause
