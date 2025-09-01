@echo off
chcp 65001 >nul
echo.
echo =====================================
echo     Clippy AI Creator - 代码上传工具
echo =====================================
echo.
echo 请选择上传方式：
echo.
echo 1. 使用 Personal Access Token (推荐)
echo 2. 使用用户名和密码 (传统方式)
echo 3. 打开上传指南文档
echo 4. 退出
echo.
set /p choice="请输入选择 (1-4): "

if "%choice%"=="1" goto token_method
if "%choice%"=="2" goto password_method
if "%choice%"=="3" goto open_guide
if "%choice%"=="4" goto exit

:token_method
echo.
echo === Personal Access Token 方式 ===
echo.
echo 步骤 1: 获取 Personal Access Token
echo 1. 访问: https://github.com/settings/tokens
echo 2. 点击 "Generate new token (classic)"
echo 3. 勾选 "repo" 权限
echo 4. 复制生成的 token
echo.
set /p token="请粘贴你的 Personal Access Token: "
if "%token%"=="" (
    echo 错误：Token不能为空
    pause
    goto token_method
)
echo.
echo 正在上传代码...
git push https://YanaYuan:%token%@github.com/YanaYuan/clippy-ai-creator.git main
goto check_result

:password_method
echo.
echo === 用户名密码方式 ===
echo 注意：GitHub已不推荐此方式，建议使用Token
echo.
git push origin main
goto check_result

:check_result
if %errorlevel% equ 0 (
    echo.
    echo ✅ 代码上传成功！
    echo 📁 仓库地址: https://github.com/YanaYuan/clippy-ai-creator
    echo.
    echo 下一步：部署到 Vercel
    echo 1. 访问: https://vercel.com
    echo 2. 使用 GitHub 账号登录
    echo 3. 导入 clippy-ai-creator 项目
    echo 4. 配置环境变量后部署
    echo.
    set /p deploy="是否要打开 Vercel 网站? (y/n): "
    if /i "%deploy%"=="y" start https://vercel.com
) else (
    echo.
    echo ❌ 上传失败！
    echo 可能的原因：
    echo - 仓库不存在，请先在 GitHub 创建
    echo - Token 权限不足
    echo - 网络连接问题
    echo.
    echo 建议使用 GitHub Desktop 客户端上传
)
goto end

:open_guide
start UPLOAD_GUIDE.md
goto end

:exit
exit

:end
echo.
pause
