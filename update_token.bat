@echo off
echo.
echo =============================================
echo        GitHub Token 更新工具
echo =============================================
echo.
echo 请按照以下步骤操作：
echo.
echo 1. 访问: https://github.com/settings/tokens
echo 2. 删除旧的token
echo 3. 创建新token (勾选 repo 权限)
echo 4. 复制新token
echo.
echo 然后运行此脚本并粘贴新token
echo.
set /p new_token="请粘贴你的新GitHub Token: "

if "%new_token%"=="" (
    echo 错误：Token不能为空
    pause
    exit
)

echo.
echo 正在更新Git配置...
git remote set-url origin https://YanaYuan:%new_token%@github.com/YanaYuan/clippy-ai-creator.git

echo.
echo 正在推送安全修复到GitHub...
git push

if %errorlevel% equ 0 (
    echo.
    echo ✅ 成功！Git配置已更新，代码已推送
    echo 🔐 Token已安全保存在本地Git配置中
    echo.
    echo 下一步：在Vercel中配置API密钥
    echo 访问: https://vercel.com/yanas-projects/clippy-ai-creator/settings/environment-variables
    echo 添加环境变量: API_KEY = sk-wAR2VA6TYUt20h9xUA326L3F1CWcZxZQa6nBZaaNekPd8Nzz
) else (
    echo.
    echo ❌ 推送失败，请检查Token是否正确
)

echo.
pause
