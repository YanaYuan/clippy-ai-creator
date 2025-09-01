// Vercel流式体验修复 - 假流式响应
console.log('🔄 Loading Vercel stream fix...');

// 保存原始的sendMessage函数
window.originalSendMessage = window.sendMessage;

// 重写sendMessage函数以支持假流式响应
window.sendMessage = async function() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const sendIcon = sendButton.querySelector('i');
    
    const message = messageInput.value.trim();
    if (!message && uploadedFiles.length === 0) return;
    
    // Process uploaded files
    let fileContents = null;
    if (uploadedFiles.length > 0) {
        fileContents = await processFilesForMessage();
        if (fileContents === null) return;
    }
    
    // Prepare message content
    let fullMessage = message;
    
    // Add selected Design DNA template if available
    if (selectedTemplate) {
        fullMessage = `[Design Template: ${selectedTemplate}] ${fullMessage}`;
    }
    
    // Simple document detection
    const documentKeywords = ['presentation', 'slide', 'slideshow', 'report', 'document', 'spreadsheet', 'table', 'form', 'webpage', 'website', 'dashboard', 'chart', 'graph', 'word', 'excel', 'ppt', 'powerpoint', 'doc', 'docx', 'xlsx', 'pptx', 'proposal', 'resume', 'cv', 'invoice', 'flyer', 'brochure', 'certificate', 'letter', 'memo', 'agenda', 'timeline', 'budget', 'calendar', 'schedule'];
    const hasDocumentKeyword = documentKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
    );
    
    if (hasDocumentKeyword && !message.toLowerCase().includes('html')) {
        fullMessage += " - create this as an html";
    }
    
    if (fileContents && fileContents.length > 0) {
        const hasImages = fileContents.some(file => file.isImage);
        
        if (hasImages) {
            fullMessage += "\n\n--- IMPORTANT INSTRUCTIONS FOR HTML GENERATION ---\n";
            fullMessage += "When creating HTML content, DO NOT embed base64 image data directly in the HTML.\n";
            fullMessage += "Instead, use placeholder image sources like this:\n";
            fullMessage += "- Use src=\"IMAGE_PLACEHOLDER_1\" for the first image\n";
            fullMessage += "- Use src=\"IMAGE_PLACEHOLDER_2\" for the second image\n";
            fullMessage += "- Use src=\"IMAGE_PLACEHOLDER_3\" for the third image\n";
            fullMessage += "The actual image data will be injected automatically after the HTML loads.\n\n";
        }
        
        fullMessage += "--- Uploaded Files ---\n";
        fileContents.forEach((file, index) => {
            if (file.isImage) {
                let sizeInfo = '';
                if (file.originalSize && file.compressedSize) {
                    const compressionRatio = Math.round((1 - file.compressedSize / file.originalSize) * 100);
                    sizeInfo = ` (compressed -${compressionRatio}%)`;
                }
                fullMessage += `\nImage ${index + 1}: ${file.name}${sizeInfo}\n`;
                fullMessage += `Description: Please analyze this image and use it as IMAGE_PLACEHOLDER_${index + 1} in your HTML.\n`;
                fullMessage += `[Image Data: ${file.content}]\n`;
            } else if (file.isHtml) {
                fullMessage += `\nHTML File ${index + 1}: ${file.name}\n`;
                fullMessage += `Content:\n${file.content}\n`;
            } else {
                fullMessage += `\nDocument ${index + 1}: ${file.name}\nContent:\n${file.content}\n`;
            }
        });
    }
    
    // Add user message to chat
    let displayMessage = message;
    
    if (selectedTemplate) {
        displayMessage = `[Design Template: ${selectedTemplate}] ${displayMessage}`;
    }
    
    if (uploadedFiles.length > 0) {
        const fileNames = uploadedFiles.map(f => {
            const icon = isImageFile(f.file) ? '🖼️' : (isHtmlFile(f.file) ? '🌐' : '📄');
            let sizeInfo = '';
            if (f.originalSize && f.compressedSize) {
                const compressionRatio = Math.round((1 - f.compressedSize / f.originalSize) * 100);
                sizeInfo = ` (-${compressionRatio}%)`;
            }
            return `${icon} ${f.name}${sizeInfo}`;
        }).join(', ');
        displayMessage += `\n📎 Attached: ${fileNames}`;
    }
    addMessage(displayMessage, true);
    conversationHistory.push({ role: "user", content: fullMessage });
    
    // Clear input, files, and disable button
    messageInput.value = '';
    uploadedFiles = [];
    updateFileList();
    
    // Set loading state
    sendButton.disabled = true;
    sendButton.classList.add('loading');
    
    if (sendIcon) {
        sendIcon.style.display = 'none';
    }
    
    if (loadingSpinner) {
        loadingSpinner.style.display = 'inline-block';
        loadingSpinner.style.visibility = 'visible';
    }
    
    // Create placeholder for assistant message
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = '<span class="typing-indicator">●</span>';
    
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        // 调用API获取完整响应 - 动态获取API配置
        const apiBaseUrl = window.API_CONFIG ? window.API_CONFIG.baseUrl : "/api";
        const response = await fetch(apiBaseUrl + '/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversationHistory
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
        // 开始模拟流式输出效果
        const fullContent = result.content;
        messageContent.innerHTML = '';
        
        let currentIndex = 0;
        let displayedContent = '';
        let isHtmlDetected = false;
        
        // 检测是否包含HTML
        if (detectHTML(fullContent)) {
            isHtmlDetected = true;
        }
        
        // 逐字符显示，模拟流式效果
        const typeWriter = async () => {
            if (currentIndex < fullContent.length) {
                // 一次添加几个字符，让效果更自然
                const charsToAdd = Math.min(2, fullContent.length - currentIndex);
                displayedContent += fullContent.substr(currentIndex, charsToAdd);
                currentIndex += charsToAdd;
                
                // 更新显示内容
                if (isHtmlDetected) {
                    const cleanContent = getCleanMessageForHTML(displayedContent);
                    messageContent.innerHTML = formatMessage(cleanContent);
                    
                    // 更新预览
                    updateLivePreview(displayedContent);
                } else {
                    messageContent.innerHTML = formatMessage(displayedContent);
                }
                
                // 滚动到底部
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // 控制打字速度
                const delay = Math.random() * 40 + 20; // 20-60ms随机延迟
                setTimeout(typeWriter, delay);
            } else {
                // 打字完成，添加到对话历史
                conversationHistory.push({
                    role: "assistant",
                    content: fullContent
                });
                
                // 如果是HTML内容，添加预览按钮
                if (isHtmlDetected) {
                    // Replace placeholder with actual button
                    replaceHtmlPlaceholder(messageDiv, fullContent);
                    
                    // 最终更新预览
                    updateLivePreview(fullContent);
                    setTimeout(() => updateLivePreview(fullContent), 500);
                }
            }
        };
        
        // 开始打字效果
        await typeWriter();
        
    } catch (error) {
        console.error('Error:', error);
        messageContent.innerHTML = `❌ Sorry, I encountered an error: ${error.message}`;
    } finally {
        // Re-enable button
        sendButton.disabled = false;
        sendButton.classList.remove('loading');
        
        if (sendIcon) {
            sendIcon.style.display = 'inline-block';
            sendIcon.style.visibility = 'visible';
        }
        
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        
        messageInput.focus();
    }
};

// 确保模板发送函数也使用新的API格式
window.originalSendTemplateInstructionToClaud = window.sendTemplateInstructionToClaud;

window.sendTemplateInstructionToClaud = async function(templateName) {
    // All templates now send their complete HTML content
    const templateHtml = templateContents[templateName];
    
    if (!templateHtml) {
        console.error('Template content not found:', templateName);
        return;
    }
    
    try {
        const fullMessage = `This is a slide template in HTML, read and understand its style, layout, and components:\n\n${templateHtml}`;
        
        // Add to conversation history
        conversationHistory.push({ role: "user", content: fullMessage });
        
        // Create placeholder for assistant response
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = '<span class="typing-indicator">🧬 Analyzing template...</span>';
        
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // 调用新的API - 动态获取API配置
        const apiBaseUrl = window.API_CONFIG ? window.API_CONFIG.baseUrl : "/api";
        const response = await fetch(apiBaseUrl + '/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversationHistory
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            messageContent.innerHTML = formatMessage(result.content);
            conversationHistory.push({ role: "assistant", content: result.content });
        } else {
            throw new Error(result.error);
        }
        
    } catch (error) {
        console.error('Error sending template to Claude:', error);
        
        // Show error message
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = '❌ Sorry, I encountered an error while processing the template. Please try again.';
        
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
};

console.log('✅ Vercel stream fix loaded successfully!');
