// Global storage for HTML content
window.htmlContentStore = {};

// File upload management
let uploadedFiles = [];
let lastFileContents = []; // Store file contents for HTML image injection
const MAX_FILES = 3;

// Template management
let selectedTemplate = null;

const API_CONFIG = {
    baseUrl: "http://localhost:5000/api"
};

let conversationHistory = [];

function addMessage(content, isUser = false) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Check if this is an assistant message with HTML
    if (!isUser && detectHTML(content)) {
        // Show clean message without HTML code
        const cleanContent = getCleanMessageForHTML(content);
        const formattedContent = formatMessage(cleanContent);
        messageContent.innerHTML = formattedContent;
        
        messageDiv.appendChild(messageContent);
        
        // Replace placeholder with actual button
        replaceHtmlPlaceholder(messageDiv, content);
        
        // Auto-update live preview (try both immediately and after a delay)
        updateLivePreview(content);
        setTimeout(() => updateLivePreview(content), 500);
    } else {
        // Regular message formatting
        const formattedContent = formatMessage(content);
        messageContent.innerHTML = formattedContent;
        messageDiv.appendChild(messageContent);
    }
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatMessage(content) {
    // Simple formatting for better readability
    let formatted = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
    
    // Replace placeholder with a temporary message during streaming
    formatted = formatted.replace(/\[HTML_PREVIEW_PLACEHOLDER\]/g, '<em style="color: #666;">Your content is coming up soon...</em>');
    
    return formatted;
}

function getCleanMessageForHTML(content) {
    // Extract non-HTML parts of the message
    let cleanContent = content;
    
    // Remove HTML code blocks and replace with placeholder
    cleanContent = cleanContent.replace(/```html[\s\S]*?```/gi, '[HTML_PREVIEW_PLACEHOLDER]');
    cleanContent = cleanContent.replace(/```html[\s\S]*$/gi, '[HTML_PREVIEW_PLACEHOLDER]'); // Incomplete code blocks
    
    // Remove standalone 'html text that might appear during streaming
    cleanContent = cleanContent.replace(/^\s*['"`]?html['"`]?\s*/gi, '');
    cleanContent = cleanContent.replace(/\n\s*['"`]?html['"`]?\s*/gi, '\n');
    
    // More aggressive removal of HTML content during streaming
    const htmlPatterns = [
        /<html[\s\S]*?<\/html>/gi,
        /<html[\s\S]*$/gi,           // Incomplete HTML documents
        /<!DOCTYPE[\s\S]*?<\/html>/gi, // Full documents with DOCTYPE
        /<!DOCTYPE[\s\S]*$/gi,       // Incomplete DOCTYPE
        /<div[\s\S]*?<\/div>/gi,
        /<div[\s\S]*$/gi,            // Incomplete div tags
        /<section[\s\S]*?<\/section>/gi,
        /<section[\s\S]*$/gi,        // Incomplete section tags
        /<article[\s\S]*?<\/article>/gi,
        /<article[\s\S]*$/gi,        // Incomplete article tags
        /<form[\s\S]*?<\/form>/gi,
        /<form[\s\S]*$/gi,           // Incomplete form tags
        /<table[\s\S]*?<\/table>/gi,
        /<table[\s\S]*$/gi,          // Incomplete table tags
        /<style[\s\S]*?<\/style>/gi,
        /<style[\s\S]*$/gi,          // Incomplete style tags
        /<script[\s\S]*?<\/script>/gi,
        /<script[\s\S]*$/gi,         // Incomplete script tags
        /<body[\s\S]*?<\/body>/gi,
        /<body[\s\S]*$/gi,           // Incomplete body tags
        /<head[\s\S]*?<\/head>/gi,
        /<head[\s\S]*$/gi,           // Incomplete head tags
        /<nav[\s\S]*?<\/nav>/gi,
        /<nav[\s\S]*$/gi,            // Incomplete nav tags
        /<header[\s\S]*?<\/header>/gi,
        /<header[\s\S]*$/gi,         // Incomplete header tags
        /<footer[\s\S]*?<\/footer>/gi,
        /<footer[\s\S]*$/gi          // Incomplete footer tags
    ];
    
    // Check if we found substantial HTML content to replace
    let hasLargeHtmlBlock = false;
    htmlPatterns.forEach(pattern => {
        const matches = cleanContent.match(pattern);
        if (matches && matches.some(match => match.length > 50)) {
            hasLargeHtmlBlock = true;
        }
        cleanContent = cleanContent.replace(pattern, '[HTML_PREVIEW_PLACEHOLDER]');
    });
    
    // Remove any remaining HTML tags (complete or incomplete)
    cleanContent = cleanContent.replace(/<[^>]*>/g, '');      // Complete tags
    cleanContent = cleanContent.replace(/<[^>]*$/g, '');      // Incomplete opening tags
    cleanContent = cleanContent.replace(/^[^<]*>/g, '');      // Incomplete closing tags
    
    // Clean up extra whitespace and newlines
    cleanContent = cleanContent.replace(/\n\s*\n/g, '\n').trim();
    
    // Remove multiple consecutive placeholders (in case of multiple HTML blocks)
    cleanContent = cleanContent.replace(/(\[HTML_PREVIEW_PLACEHOLDER\]\s*){2,}/g, '[HTML_PREVIEW_PLACEHOLDER]');
    
    // If we have a placeholder but no substantial text, just show the placeholder
    if (cleanContent.includes('[HTML_PREVIEW_PLACEHOLDER]') && cleanContent.replace(/\[HTML_PREVIEW_PLACEHOLDER\]/g, '').trim().length < 30) {
        cleanContent = '[HTML_PREVIEW_PLACEHOLDER]';
    }
    
    // For streaming content, show a progress message if content is being cleaned but no placeholder yet
    if (!cleanContent.includes('[HTML_PREVIEW_PLACEHOLDER]') && cleanContent.length < 30 && content.length > 50) {
        return "I'm creating an HTML webpage for you... [HTML_PREVIEW_PLACEHOLDER]";
    }
    
    // If the message is mostly HTML and very little text remains, show a generic message
    if (!cleanContent.includes('[HTML_PREVIEW_PLACEHOLDER]') && cleanContent.length < 50) {
        return "I've created an HTML webpage for you: [HTML_PREVIEW_PLACEHOLDER]";
    }
    
    return cleanContent;
}

function detectHTML(content) {
    // More aggressive HTML detection patterns that catch HTML early
    const patterns = [
        /<html/i,                    // Just opening <html (without >)
        /<!DOCTYPE/i,                // DOCTYPE at start
        /<div/i,                     // Just opening <div (without >)
        /<body/i,                    // Just opening <body (without >)
        /<head/i,                    // Just opening <head (without >)
        /<p\s/i,                     // <p with space or attributes
        /<span/i,                    // Just opening <span (without >)
        /<section/i,                 // Just opening <section (without >)
        /<article/i,                 // Just opening <article (without >)
        /<nav/i,                     // Just opening <nav (without >)
        /<header/i,                  // Just opening <header (without >)
        /<footer/i,                  // Just opening <footer (without >)
        /<form/i,                    // Just opening <form (without >)
        /<table/i,                   // Just opening <table (without >)
        /<button/i,                  // Just opening <button (without >)
        /<input/i,                   // Just opening <input (without >)
        /```html/i,                  // HTML code blocks
        /<style/i,                   // Just opening <style (without >)
        /<script/i,                  // Just opening <script (without >)
        /<link/i,                    // Just opening <link (without >)
        /<meta/i,                    // Just opening <meta (without >)
        /<title/i,                   // Just opening <title (without >)
        /<h[1-6]/i,                  // Heading tags h1-h6
        /<ul/i,                      // Just opening <ul (without >)
        /<ol/i,                      // Just opening <ol (without >)
        /<li/i,                      // Just opening <li (without >)
        /<img/i,                     // Just opening <img (without >)
        /<a\s/i                      // <a with space or attributes
    ];
    
    return patterns.some(pattern => pattern.test(content));
}

function extractHTML(content) {
    // Try to extract HTML from code blocks first
    const codeBlockMatch = content.match(/```html\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
    }
    
    // Check if content contains DOCTYPE or html tag (full document)
    if (content.includes('<!DOCTYPE') || content.includes('<html>') || content.includes('<html ')) {
        // Extract full HTML document
        const docStart = Math.min(
            content.indexOf('<!DOCTYPE') !== -1 ? content.indexOf('<!DOCTYPE') : Infinity,
            content.indexOf('<html>') !== -1 ? content.indexOf('<html>') : Infinity,
            content.indexOf('<html ') !== -1 ? content.indexOf('<html ') : Infinity
        );
        if (docStart !== Infinity) {
            return content.substring(docStart).trim();
        }
    }
    
    // For HTML fragments, try to wrap them properly
    const fragmentPatterns = [
        /<div[\s\S]*?<\/div>/gi,
        /<section[\s\S]*?<\/section>/gi,
        /<article[\s\S]*?<\/article>/gi,
        /<form[\s\S]*?<\/form>/gi,
        /<table[\s\S]*?<\/table>/gi,
        /<body[\s\S]*?<\/body>/gi,
        /<head[\s\S]*?<\/head>/gi
    ];
    
    for (const pattern of fragmentPatterns) {
        const matches = content.match(pattern);
        if (matches) {
            // Wrap fragment in basic HTML structure
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude HTML Preview</title>
</head>
<body>
${matches.join('\n')}
</body>
</html>`;
        }
    }
    
    // Fallback: if we detect any HTML tags, wrap the entire content
    if (detectHTML(content)) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude HTML Preview</title>
</head>
<body>
${content}
</body>
</html>`;
    }
    
    // Last resort: return content as-is
    return content;
}

function addHtmlPreviewButton(messageDiv, content) {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'html-preview-container';
    
    const previewButton = document.createElement('button');
    previewButton.className = 'html-preview-button';
    previewButton.innerHTML = '<i class="fas fa-eye"></i> View Content';
    previewButton.title = 'Open HTML in new tab';
    
    previewButton.addEventListener('click', function() {
        try {
            const htmlContent = extractHTML(content);
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            
            // Open in new tab
            const newWindow = window.open(url, '_blank');
            
            // Clean up the blob URL after a delay
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 5000);
            
            // Show feedback
            const originalText = previewButton.innerHTML;
            previewButton.innerHTML = '✅ Opened';
            previewButton.disabled = true;
            
            setTimeout(() => {
                previewButton.innerHTML = originalText;
                previewButton.disabled = false;
            }, 2000);
            
        } catch (error) {
            console.error('Error creating HTML preview:', error);
            
            // Show error feedback
            const originalText = previewButton.innerHTML;
            previewButton.innerHTML = '❌ Error';
            previewButton.disabled = true;
            
            setTimeout(() => {
                previewButton.innerHTML = originalText;
                previewButton.disabled = false;
            }, 2000);
        }
    });
    
    buttonContainer.appendChild(previewButton);
    messageDiv.appendChild(buttonContainer);
}

function replaceHtmlPlaceholder(messageDiv, originalContent) {
    const messageContent = messageDiv.querySelector('.message-content');
    if (messageContent) {
        replaceHtmlPlaceholderInElement(messageContent, originalContent);
    }
}

function replaceHtmlPlaceholderInElement(element, originalContent) {
    if (element && (element.innerHTML.includes('[HTML_PREVIEW_PLACEHOLDER]') || element.innerHTML.includes('Your content is coming up soon...'))) {
        // Check if we already have buttons to avoid duplicates
        const existingButtons = element.querySelectorAll('.html-preview-button-inline');
        const placeholderCount = (element.innerHTML.match(/(\[HTML_PREVIEW_PLACEHOLDER\]|Your content is coming up soon\.\.\.)/g) || []).length;
        
        // Only proceed if we have more placeholders than buttons
        if (placeholderCount > existingButtons.length) {
            // Create a unique ID for this button
            const buttonId = 'html-btn-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            
            // Store the original content for this button
            window.htmlContentStore = window.htmlContentStore || {};
            window.htmlContentStore[buttonId] = originalContent;
            
            // Replace placeholder or temporary message with button HTML (with unique ID and data attribute)
            const buttonHTML = `<button class="html-preview-button-inline" id="${buttonId}" data-html-content="${buttonId}" title="Open HTML in new tab"><i class="fas fa-eye"></i> View Content in New Page</button>`;
            
            // Replace both possible placeholders
            let updatedHTML = element.innerHTML;
            updatedHTML = updatedHTML.replace('[HTML_PREVIEW_PLACEHOLDER]', buttonHTML);
            updatedHTML = updatedHTML.replace('<em style="color: #666;">Your content is coming up soon...</em>', buttonHTML);
            element.innerHTML = updatedHTML;
            
            // Auto-update live preview when HTML content is complete
            updateLivePreview(originalContent);
        }
    }
}

function updateLivePreview(content) {
    const previewFrame = document.getElementById('previewFrame');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    
    console.log('updateLivePreview called with content length:', content?.length);
    console.log('previewFrame found:', !!previewFrame);
    console.log('previewPlaceholder found:', !!previewPlaceholder);
    
    if (!previewFrame || !previewPlaceholder) {
        console.warn('Preview elements not found');
        return;
    }
    
    const htmlContent = extractHTML(content);
    console.log('Extracted HTML content length:', htmlContent?.length);
    
    if (htmlContent) {
        // Store reference to the file contents for image injection
        const imageReplacements = {};
        if (lastFileContents) {
            lastFileContents.forEach((file, index) => {
                if (file.isImage) {
                    imageReplacements[`IMAGE_PLACEHOLDER_${index + 1}`] = file.content;
                }
            });
        }
        
        // Create the HTML with image injection script
        let htmlWithImageInjection = htmlContent;
        
        // Add a script to inject images after the page loads
        if (Object.keys(imageReplacements).length > 0) {
            console.log('Adding image injection script for', Object.keys(imageReplacements).length, 'images');
            const imageInjectionScript = `
                <script>
                    const imageData = ${JSON.stringify(imageReplacements)};
                    
                    function injectImages() {
                        Object.entries(imageData).forEach(([placeholder, dataUrl]) => {
                            const images = document.querySelectorAll('img[src="' + placeholder + '"]');
                            images.forEach(img => {
                                img.src = dataUrl;
                            });
                        });
                    }
                    
                    // Inject images when DOM is ready
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', injectImages);
                    } else {
                        injectImages();
                    }
                    
                    // Also try again after a short delay for any late-loading elements
                    setTimeout(injectImages, 100);
                </script>
            `;
            
            // Insert the script before the closing body tag, or at the end if no body tag
            if (htmlWithImageInjection.includes('</body>')) {
                htmlWithImageInjection = htmlWithImageInjection.replace('</body>', imageInjectionScript + '</body>');
            } else {
                htmlWithImageInjection += imageInjectionScript;
            }
        }
        
        // Create blob and update iframe
        const blob = new Blob([htmlWithImageInjection], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        console.log('Updating preview frame with new content');
        previewFrame.src = url;
        previewFrame.style.display = 'block';
        previewPlaceholder.style.display = 'none';
        
        // Store current preview URL for controls
        window.currentPreviewUrl = url;
        
        // Clean up previous blob URL
        if (window.previousPreviewUrl) {
            setTimeout(() => {
                URL.revokeObjectURL(window.previousPreviewUrl);
            }, 1000);
        }
        window.previousPreviewUrl = url;
    } else {
        console.log('No HTML content extracted, keeping placeholder visible');
    }
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const sendIcon = sendButton.querySelector('i');
    
    console.log('Elements found:', {
        messageInput: !!messageInput,
        sendButton: !!sendButton,
        loadingSpinner: !!loadingSpinner,
        sendIcon: !!sendIcon
    });
    
    const message = messageInput.value.trim();
    if (!message && uploadedFiles.length === 0) return;
    
    // Process uploaded files
    let fileContents = null;
    if (uploadedFiles.length > 0) {
        fileContents = await processFilesForMessage();
        if (fileContents === null) return; // Error processing files
    }
    
    // Prepare message content
    let fullMessage = message;
    
    // Add selected Design DNA template if available
    if (selectedTemplate) {
        fullMessage = `[Design Template: ${selectedTemplate}] ${fullMessage}`;
    }
    
    // Simple document detection - add HTML instruction if document keywords are found
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
    
    // Add user message to chat (show original message + file names with icons)
    let displayMessage = message;
    
    // Show template being used
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
    addMessage(displayMessage, true);  // Show the message with template tag
    conversationHistory.push({ role: "user", content: fullMessage });
    
    // Clear input, files, and disable button
    messageInput.value = '';
    uploadedFiles = [];
    updateFileList();
    
    // Set loading state
    sendButton.disabled = true;
    sendButton.classList.add('loading');
    
    // Debug logging
    console.log('Setting loading state...');
    console.log('Send button:', sendButton);
    console.log('Send icon:', sendIcon);
    console.log('Loading spinner:', loadingSpinner);
    
    if (sendIcon) {
        sendIcon.style.display = 'none';
        console.log('Send icon hidden');
    } else {
        console.error('Send icon not found!');
    }
    
    if (loadingSpinner) {
        loadingSpinner.style.display = 'inline-block';
        loadingSpinner.style.visibility = 'visible';
        console.log('Loading spinner shown');
    } else {
        console.error('Loading spinner not found!');
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
    
    let assistantMessage = '';
    let isHtmlDetected = false;
    
    try {
        const response = await fetch(API_CONFIG.baseUrl + '/chat', {
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
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data.trim() === '') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        
                        if (parsed.error) {
                            throw new Error(parsed.error);
                        }
                        
                        if (parsed.done) {
                            break;
                        }
                        
                        if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                            const delta = parsed.choices[0].delta;
                            if (delta.content) {
                                assistantMessage += delta.content;
                                
                                // Check if HTML is detected (once detected, stay in HTML mode)
                                if (!isHtmlDetected && detectHTML(assistantMessage)) {
                                    isHtmlDetected = true;
                                }
                                
                                if (isHtmlDetected) {
                                    // Show clean content for HTML responses
                                    const cleanContent = getCleanMessageForHTML(assistantMessage);
                                    messageContent.innerHTML = formatMessage(cleanContent);
                                    
                                    // Don't replace placeholder during streaming - wait for completion
                                } else {
                                    // Normal content, show as usual
                                    messageContent.innerHTML = formatMessage(assistantMessage);
                                }
                                
                                chatMessages.scrollTop = chatMessages.scrollHeight;
                            }
                        }
                    } catch (parseError) {
                        console.warn('Failed to parse chunk:', data);
                    }
                }
            }
        }
        
        // Add complete message to conversation history
        if (assistantMessage) {
            conversationHistory.push({ role: "assistant", content: assistantMessage });
            
            // Finalize the message content if HTML was detected
            if (isHtmlDetected) {
                const cleanContent = getCleanMessageForHTML(assistantMessage);
                
                // Replace placeholder with inline button BEFORE formatting
                if (cleanContent.includes('[HTML_PREVIEW_PLACEHOLDER]')) {
                    // Create a temporary element to work with
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = formatMessage(cleanContent);
                    
                    // Now replace the formatted placeholder
                    replaceHtmlPlaceholderInElement(tempDiv, assistantMessage);
                    
                    // Update the message content
                    messageContent.innerHTML = tempDiv.innerHTML;
                } else {
                    // No placeholder, just format normally
                    messageContent.innerHTML = formatMessage(cleanContent);
                }
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
        messageContent.innerHTML = 'Sorry, I encountered an error while processing your request. Please try again.';
    } finally {
        // Re-enable button
        sendButton.disabled = false;
        sendButton.classList.remove('loading');
        
        const sendIcon = sendButton.querySelector('i');
        console.log('Cleanup - Send icon:', sendIcon);
        console.log('Cleanup - Loading spinner:', loadingSpinner);
        
        if (sendIcon) {
            sendIcon.style.display = 'inline-block';
            sendIcon.style.visibility = 'visible';
            console.log('Send icon restored');
        } else {
            console.error('Send icon not found during cleanup!');
        }
        
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
            console.log('Loading spinner hidden');
        } else {
            console.error('Loading spinner not found during cleanup!');
        }
        
        messageInput.focus();
    }
}

// File handling functions
function isImageFile(file) {
    return file.type.startsWith('image/');
}

function isHtmlFile(file) {
    return file.type === 'text/html' || file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm');
}

function compressImage(file, maxWidth = 1024, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Calculate new dimensions while maintaining aspect ratio
            let { width, height } = img;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxWidth) {
                    width = (width * maxWidth) / height;
                    height = maxWidth;
                }
            }
            
            // Set canvas dimensions
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress image
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to compressed JPEG base64
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

function getOptimalCompression(file) {
    const fileSize = file.size;
    
    if (fileSize > 5 * 1024 * 1024) { // > 5MB
        return { maxWidth: 800, quality: 0.6 };  // Aggressive compression
    } else if (fileSize > 2 * 1024 * 1024) { // > 2MB
        return { maxWidth: 1024, quality: 0.7 }; // Medium compression
    } else if (fileSize > 1 * 1024 * 1024) { // > 1MB
        return { maxWidth: 1024, quality: 0.8 }; // Light compression
    } else {
        return { maxWidth: 1024, quality: 0.9 }; // Minimal compression
    }
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    
    // Check if adding these files would exceed the limit
    if (uploadedFiles.length + files.length > MAX_FILES) {
        alert(`You can only upload up to ${MAX_FILES} files. Currently ${uploadedFiles.length} files uploaded.`);
        return;
    }
    
    // Process each file
    files.forEach(async (file) => {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
            return;
        }
        
        const fileObj = {
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            compressing: isImageFile(file) // Flag to show compression status
        };
        
        uploadedFiles.push(fileObj);
        updateFileList(); // Show file immediately with compression indicator
        
        // Compress image files in the background
        if (isImageFile(file)) {
            try {
                const compressionSettings = getOptimalCompression(file);
                const compressedBase64 = await compressImage(file, compressionSettings.maxWidth, compressionSettings.quality);
                
                // Update file object with compressed data
                fileObj.compressedData = compressedBase64;
                fileObj.compressing = false;
                fileObj.originalSize = file.size;
                fileObj.compressedSize = Math.round(compressedBase64.length * 0.75); // Approximate size
                
                updateFileList(); // Update UI to show compression complete
            } catch (error) {
                console.error('Error compressing image:', error);
                fileObj.compressing = false;
                updateFileList();
            }
        }
    });
    
    event.target.value = ''; // Reset input
}

function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    uploadedFiles.forEach(fileObj => {
        const fileItem = document.createElement('div');
        const isImage = isImageFile(fileObj.file);
        fileItem.className = `file-item ${isImage ? 'image-file' : ''}`;
        
        if (isImage) {
            // Create image preview
            const imagePreview = document.createElement('img');
            imagePreview.className = 'image-preview';
            imagePreview.src = fileObj.compressedData || URL.createObjectURL(fileObj.file);
            imagePreview.alt = fileObj.name;
            
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            
            let statusText = '';
            let iconClass = 'fas fa-image';
            
            if (fileObj.compressing) {
                statusText = ' (compressing...)';
                iconClass = 'fas fa-spinner fa-spin';
            } else if (fileObj.compressedData) {
                const compressionRatio = Math.round((1 - fileObj.compressedSize / fileObj.originalSize) * 100);
                statusText = ` (-${compressionRatio}%)`;
            }
            
            fileInfo.innerHTML = `
                <i class="${iconClass}"></i>
                <span class="file-name" title="${fileObj.name}">${fileObj.name}${statusText}</span>
                <span class="remove-file" onclick="removeFile(${fileObj.id})" title="Remove file">×</span>
            `;
            
            fileItem.appendChild(imagePreview);
            fileItem.appendChild(fileInfo);
        } else {
            // Regular file display
            const isHtml = isHtmlFile(fileObj.file);
            const icon = isHtml ? 'fas fa-globe' : 'fas fa-file';
            
            let fileDisplayHTML = `
                <i class="${icon}"></i>
                <span class="file-name" title="${fileObj.name}">${fileObj.name}</span>
            `;
            
            // Add preview button for HTML files
            if (isHtml) {
                fileDisplayHTML += `
                    <button class="html-file-preview-btn" onclick="previewUploadedHtml(${fileObj.id})" title="Preview HTML">
                        <i class="fas fa-eye"></i>
                    </button>
                `;
            }
            
            fileDisplayHTML += `
                <span class="remove-file" onclick="removeFile(${fileObj.id})" title="Remove file">×</span>
            `;
            
            fileItem.innerHTML = fileDisplayHTML;
        }
        
        fileList.appendChild(fileItem);
    });
}

function removeFile(fileId) {
    // Clean up image preview URLs to prevent memory leaks
    const fileToRemove = uploadedFiles.find(file => file.id === fileId);
    if (fileToRemove && isImageFile(fileToRemove.file)) {
        const existingPreview = document.querySelector(`img[src*="${fileId}"]`);
        if (existingPreview && existingPreview.src.startsWith('blob:')) {
            URL.revokeObjectURL(existingPreview.src);
        }
    }
    
    uploadedFiles = uploadedFiles.filter(file => file.id !== fileId);
    updateFileList();
}

// Design DNA template selection function
async function importDesignDNA() {
    showTemplateSelectionModal();
}

// Clear the selected template
function clearSelectedTemplate() {
    // Clear the stored template
    selectedTemplate = null;
    
    // Update template badge
    updateTemplateBadge();
    
    // Add visual message to chat
    addMessage('🧬 Design template cleared. No template is currently active.', true);
}

// Update template badge display
function updateTemplateBadge(templateName = null) {
    const templateBadgeContainer = document.getElementById('templateBadgeContainer');
    if (!templateBadgeContainer) return;
    
    const activeTemplate = templateName || selectedTemplate;
    
    if (activeTemplate) {
        // Show template badge
        templateBadgeContainer.style.display = 'block';
        templateBadgeContainer.innerHTML = `
            <div class="template-badge">
                <i class="fas fa-dna"></i>
                <span class="template-name">${activeTemplate}</span>
                <button class="template-clear-btn" onclick="clearSelectedTemplate()" title="Clear template">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    } else {
        // Hide template badge
        templateBadgeContainer.style.display = 'none';
        templateBadgeContainer.innerHTML = '';
    }
}

// Show template selection modal
function showTemplateSelectionModal() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'template-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'template-modal-content';
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        animation: modalSlideIn 0.3s ease-out;
    `;
    
    // Add CSS animation
    if (!document.querySelector('#modal-animations')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'modal-animations';
        styleSheet.textContent = `
            @keyframes modalSlideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styleSheet);
    }
    
    // Modal content HTML
    modalContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 25px;">
            <h3 style="margin: 0; color: #333; font-size: 1.4em;">
                <i class="fas fa-dna" style="color: #8B5CF6; margin-right: 10px;"></i>
                Select Design Template
            </h3>
            <p style="color: #666; margin: 10px 0 0 0; font-size: 0.95em;">
                Choose a template style for your next creation
            </p>
        </div>
        
        <div class="template-options" style="margin-bottom: 25px;">
            <div class="template-option" data-template="TemplateAnalysis" style="
                padding: 15px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                margin-bottom: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
            ">
                <i class="fas fa-chart-line" style="color: #4299e1; margin-right: 12px; font-size: 1.2em;"></i>
                <div>
                    <div style="font-weight: 600; color: #333;">Analysis Template</div>
                    <div style="font-size: 0.85em; color: #666;">For data analysis and insights</div>
                </div>
            </div>
            
            <div class="template-option" data-template="TemplateChart" style="
                padding: 15px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                margin-bottom: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
            ">
                <i class="fas fa-chart-bar" style="color: #10B981; margin-right: 12px; font-size: 1.2em;"></i>
                <div>
                    <div style="font-weight: 600; color: #333;">Chart Template</div>
                    <div style="font-size: 0.85em; color: #666;">For graphs and visual data</div>
                </div>
            </div>
            
            <div class="template-option" data-template="TemplateTable" style="
                padding: 15px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                margin-bottom: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
            ">
                <i class="fas fa-table" style="color: #F59E0B; margin-right: 12px; font-size: 1.2em;"></i>
                <div>
                    <div style="font-weight: 600; color: #333;">Table Template</div>
                    <div style="font-size: 0.85em; color: #666;">For structured data tables</div>
                </div>
            </div>
            
            <div class="template-option" data-template="ProductOverviewStyleDNA" style="
                padding: 15px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                margin-bottom: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
            ">
                <i class="fas fa-box" style="color: #EF4444; margin-right: 12px; font-size: 1.2em;"></i>
                <div>
                    <div style="font-weight: 600; color: #333;">Product Overview Template</div>
                    <div style="font-size: 0.85em; color: #666;">For product showcases and features</div>
                </div>
            </div>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button class="cancel-btn" style="
                padding: 10px 20px;
                border: 1px solid #ccc;
                background: white;
                color: #666;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9em;
            ">Cancel</button>
            <button class="confirm-btn" style="
                padding: 10px 20px;
                border: none;
                background: linear-gradient(45deg, #8B5CF6, #A855F7);
                color: white;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9em;
                opacity: 0.5;
                pointer-events: none;
            " disabled>Select Template</button>
        </div>
    `;
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Add event listeners
    const templateOptions = modalContent.querySelectorAll('.template-option');
    const confirmBtn = modalContent.querySelector('.confirm-btn');
    const cancelBtn = modalContent.querySelector('.cancel-btn');
    
    // Template selection
    templateOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove previous selection
            templateOptions.forEach(opt => {
                opt.style.border = '2px solid #e0e0e0';
                opt.style.background = 'white';
            });
            
            // Select current option
            option.style.border = '2px solid #8B5CF6';
            option.style.background = 'rgba(139, 92, 246, 0.05)';
            
            selectedTemplate = option.dataset.template;
            
            // Enable confirm button
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.pointerEvents = 'auto';
        });
        
        // Hover effects
        option.addEventListener('mouseenter', () => {
            if (!option.style.border.includes('#8B5CF6')) {
                option.style.border = '2px solid #ccc';
            }
        });
        
        option.addEventListener('mouseleave', () => {
            if (!option.style.border.includes('#8B5CF6')) {
                option.style.border = '2px solid #e0e0e0';
            }
        });
    });
    
    // Confirm selection
    confirmBtn.addEventListener('click', () => {
        if (selectedTemplate) {
            setSelectedTemplate(selectedTemplate);
            document.body.removeChild(modalOverlay);
        }
    });
    
    // Cancel selection
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
    
    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });
}

// Set the selected template
function setSelectedTemplate(templateName) {
    // Store the selected template globally
    selectedTemplate = templateName;
    
    // Add visual message to chat first
    addMessage(`🧬 Design template selected: ${templateName}.`, true);
    
    // Then send instruction to Claude about using this template
    sendTemplateInstructionToClaud(templateName);
    
    // Update template badge display
    updateTemplateBadge(templateName);
}

// Send template instruction to Claude
async function sendTemplateInstructionToClaud(templateName) {
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
        
        let assistantMessage = '';
        
        // Send to Claude and get streaming response
        const apiResponse = await fetch(API_CONFIG.baseUrl + '/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversationHistory
            })
        });
        
        if (!apiResponse.ok) {
            throw new Error(`HTTP error! status: ${apiResponse.status}`);
        }
        
        const reader = apiResponse.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data.trim() === '') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        
                        if (parsed.error) {
                            throw new Error(parsed.error);
                        }
                        
                        if (parsed.done) {
                            break;
                        }
                        
                        if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                            const delta = parsed.choices[0].delta;
                            if (delta.content) {
                                assistantMessage += delta.content;
                                messageContent.innerHTML = formatMessage(assistantMessage);
                                chatMessages.scrollTop = chatMessages.scrollHeight;
                            }
                        }
                    } catch (parseError) {
                        console.warn('Failed to parse chunk:', data);
                    }
                }
            }
        }
        
        // Add complete message to conversation history
        if (assistantMessage) {
            conversationHistory.push({ role: "assistant", content: assistantMessage });
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
}

// Template HTML content embedded in JavaScript
const templateContents = {
    'TemplateAnalysis': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <title>Robotics Product & Market Analysis - Interactive Presentation</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .slide-container {
            width: 1280px;
            height: 720px;
            position: relative;
            overflow: hidden;
            margin: 0 auto;
            page-break-after: always;
        }
        
        /* Advanced Background Patterns */
        .circuit-pattern {
            background-image: 
                linear-gradient(90deg, rgba(0,191,255,0.1) 1px, transparent 1px),
                linear-gradient(180deg, rgba(0,191,255,0.1) 1px, transparent 1px);
            background-size: 40px 40px;
        }
        
        .hexagon-pattern {
            background-image: 
                radial-gradient(circle at 25% 25%, rgba(0,191,255,0.2) 2px, transparent 2px),
                radial-gradient(circle at 75% 75%, rgba(138,43,226,0.2) 2px, transparent 2px);
            background-size: 60px 60px;
        }
        
        /* Animated Elements */
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
        }
        
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px rgba(0,191,255,0.5); }
            50% { box-shadow: 0 0 20px rgba(0,191,255,0.8); }
        }
        
        @keyframes slideIn {
            from { transform: translateX(-100px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
        .animate-slide-in { animation: slideIn 0.8s ease-out; }
        
        /* Custom Components */
        .robot-card {
            background: linear-gradient(135deg, rgba(0,51,102,0.8), rgba(75,0,130,0.8));
            border: 2px solid rgba(0,191,255,0.3);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }
        
        .robot-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            transition: left 0.5s;
        }
        
        .robot-card:hover::before {
            left: 100%;
        }
        
        .robot-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 40px rgba(0,191,255,0.3);
        }
        
        .stat-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: conic-gradient(from 0deg, #00bfff, #8a2be2, #00bfff);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }
        
        .stat-circle::before {
            content: '';
            position: absolute;
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: rgba(15, 23, 42, 0.9);
        }
        
        .market-segment {
            background: linear-gradient(45deg, rgba(0,191,255,0.1), rgba(138,43,226,0.1));
            border-left: 4px solid;
            border-image: linear-gradient(45deg, #00bfff, #8a2be2) 1;
            padding: 1.5rem;
            margin: 1rem 0;
            border-radius: 0 12px 12px 0;
            transition: all 0.3s ease;
        }
        
        .market-segment:hover {
            background: linear-gradient(45deg, rgba(0,191,255,0.2), rgba(138,43,226,0.2));
            transform: translateX(10px);
        }
        
        .timeline-item {
            position: relative;
            padding-left: 2rem;
            border-left: 3px solid rgba(0,191,255,0.3);
        }
        
        .timeline-item::before {
            content: '';
            position: absolute;
            left: -8px;
            top: 0;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: linear-gradient(45deg, #00bfff, #8a2be2);
        }
        
        .progress-bar {
            height: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            overflow: hidden;
            margin: 0.5rem 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #00bfff, #8a2be2);
            border-radius: 4px;
            transition: width 2s ease-in-out;
        }
        
        /* Additional styles for simple cover page */
        .bg-tech-pattern {
            background-image: radial-gradient(#ffffff22 1px, transparent 1px);
            background-size: 30px 30px;
        }
        .title-main {
            background: linear-gradient(135deg, #00bfff, #4a90e2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .subtitle-glow {
            text-shadow: 0 0 10px rgba(0, 191, 255, 0.5);
        }
        
        /* Interactive Elements */
        .interactive-icon {
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .interactive-icon:hover {
            transform: scale(1.2) rotate(10deg);
            color: #00bfff;
        }
        
        /* Glass Morphism */
        .glass {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        /* Data Visualization Styles */
        .chart-container {
            position: relative;
            height: 300px;
            width: 100%;
            background: rgba(0,51,102,0.3);
            border-radius: 15px;
            padding: 1rem;
            border: 1px solid rgba(0,191,255,0.3);
        }
        
        .metric-box {
            background: linear-gradient(135deg, rgba(0,191,255,0.2), rgba(138,43,226,0.2));
            border: 1px solid rgba(0,191,255,0.4);
            border-radius: 15px;
            padding: 1.5rem;
            text-align: center;
            transition: all 0.3s ease;
        }
        
        .metric-box:hover {
            transform: scale(1.05);
            background: linear-gradient(135deg, rgba(0,191,255,0.3), rgba(138,43,226,0.3));
        }
        
        /* Navigation Dots */
        .nav-dots {
            position: fixed;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 1000;
        }
        
        .nav-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgba(0,191,255,0.3);
            margin: 8px 0;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .nav-dot.active {
            background: #00bfff;
            transform: scale(1.3);
        }
        
        @media print {
            .slide-container { page-break-after: always; }
            .nav-dots { display: none; }
        }
    </style>
</head>
<body class="bg-slate-900">

<!-- Navigation Dots -->
<div class="nav-dots">
    <div class="nav-dot active" onclick="scrollToSlide(0)"></div>
    <div class="nav-dot" onclick="scrollToSlide(1)"></div>
    <div class="nav-dot" onclick="scrollToSlide(2)"></div>
    <div class="nav-dot" onclick="scrollToSlide(3)"></div>
</div>

<!-- SLIDE 1: COVER PAGE -->
<div id="slide1" class="slide-container bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white relative">
    <!-- Background Pattern -->
    <div class="absolute inset-0 circuit-pattern opacity-15"></div>
    
    <!-- Header -->
    <header class="pt-8 px-12 relative z-10">
        <div class="flex items-center justify-between mb-6">
            <div class="flex items-center text-cyan-300 text-lg font-medium tracking-wider">
                ROBOTICS INSTITUTE
            </div>
            <div class="flex space-x-2">
                <div class="w-3 h-3 bg-cyan-400 rounded-full"></div>
                <div class="w-3 h-3 bg-blue-400 rounded-full"></div>
                <div class="w-3 h-3 bg-purple-400 rounded-full"></div>
            </div>
        </div>
    </header>
    
    <!-- Main Content -->
    <div class="flex items-center h-5/6 px-12 relative z-10">
        <!-- Content Area -->
        <div class="flex-1 pr-20">
            <!-- Main Title -->
            <div class="mb-16">
                <h1 class="text-8xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4 leading-none tracking-tight">
                    ROBOTICS
                </h1>
                <h2 class="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-8">
                    Market Analysis
                </h2>
                <div class="w-32 h-1 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"></div>
            </div>
            
            <!-- Subtitle -->
            <p class="text-2xl text-blue-200/90 mb-16 subtitle-glow max-w-4xl leading-relaxed font-light">
                Comprehensive Analysis of Product Innovation and Market Dynamics in Robotics Industry
            </p>
            
            <!-- Call to Action -->
            <div class="robot-card inline-flex items-center px-8 py-4 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 backdrop-blur-lg border border-cyan-400/30 rounded-2xl">
                <i class="fas fa-chart-line mr-4 text-cyan-400 text-xl"></i>
                <span class="text-white font-semibold text-lg">Explore Market Insights</span>
            </div>
        </div>
        
        <!-- Right Side Design -->
        <div class="flex-shrink-0 relative">
            <div class="relative w-80 h-80">
                <!-- Simple elegant circle with robot -->
                <div class="w-full h-full bg-gradient-to-br from-slate-800/30 to-slate-900/20 backdrop-blur-xl rounded-full border border-cyan-400/20 flex items-center justify-center">
                    <i class="fas fa-robot text-6xl text-cyan-400 opacity-60"></i>
                </div>
            </div>
        </div>
    </div>
</div>
</body>
</html>`,

    'TemplateChart': `<!DOCTYPE html><html lang="zh"><head></head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0" name="viewport">
<title>盈利能力与收入表现对比</title>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.tailwindcss.com"></script><style>
        .slide-container {
            width: 1280px;
            min-height: 720px;
            
            position: relative;
        }
        .bg-tech-pattern {
            background-image: radial-gradient(#ffffff22 1px, transparent 1px);
            background-size: 30px 30px;
        }
        .gradient-border {
            position: relative;
        }
        .chart-container {
            position: relative;
            height: 200px;
            width: 100%;
            margin-bottom: 15px;
        }
        .data-card {
            background: rgba(0, 51, 102, 0.4);
            border: 1px solid rgba(0, 191, 255, 0.3);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
        }
        .metric-card {
            background: rgba(0, 51, 102, 0.4);
            border: 1px solid rgba(0, 191, 255, 0.3);
            border-radius: 8px;
            padding: 12px;
            text-align: center;
        }
        .platform-item {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid rgba(0, 191, 255, 0.2);
            padding: 8px 0;
        }
        .platform-item:last-child {
            border-bottom: none;
        }
        .platform-name {
            font-weight: bold;
            color: #e0f2fe;
        }
        .platform-revenue {
            font-weight: bold;
            color: #00bfff;
        }
        .profit-status {
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        .profit-positive {
            background-color: rgba(76, 175, 80, 0.3);
            color: #4ade80;
        }
        .profit-negative {
            background-color: rgba(244, 67, 54, 0.3);
            color: #f87171;
        }
        .profit-neutral {
            background-color: rgba(255, 193, 7, 0.3);
            color: #facc15;
        }
    </style>
</head>
<body>
<div class="slide-container bg-gradient-to-br from-gray-900 to-blue-900 text-white relative">
<!-- Background Pattern -->
<div class="absolute inset-0 bg-tech-pattern opacity-10"></div>
<!-- Header -->
<header class="pt-12 px-16">
<h1 class="text-4xl font-bold gradient-border inline-block">盈利能力与收入表现对比</h1>
<div class="w-full h-px bg-gradient-to-r from-blue-400 to-transparent mt-6 mb-8"></div>
<p class="text-lg text-blue-200">主流AI PPT生成产品的收入规模、盈利情况与单用户收入（ARPU）对比分析</p>
</header>
<!-- Main Content -->
<main class="px-16 mt-8">
<!-- Data Visualization Section -->
<div class="flex flex-row justify-between space-x-6">
<!-- Left Column: Revenue Comparison -->
<div class="w-1/2 flex flex-col">
<h3 class="text-2xl font-semibold text-blue-300 mb-3">
<i class="fas fa-chart-bar mr-2"></i>平台收入规模对比 (2024-2025)
</h3>
<div class="chart-container">
<canvas id="revenueChart"></canvas>
</div>
<div class="data-card">
<p class="text-xl font-semibold text-cyan-200 mb-1">收入差距分析:</p>
<p class="text-gray-300 mb-2">Gamma与Canva之间的收入差距达54倍，体现了AI专注型平台与设计巨头的市场规模差距。Gamma作为AI PPT纯玩家已达到5千万美元收入，领先同行。</p>
</div>
</div>
<!-- Right Column: Platform Metrics -->
<div class="w-1/2 flex flex-col">
<h3 class="text-2xl font-semibold text-blue-300 mb-3">
<i class="fas fa-coins mr-2"></i>主要平台盈利状况
</h3>
<div class="bg-blue-800 bg-opacity-40 p-4 rounded-lg border border-blue-600 mb-3">
<div class="platform-item">
<span class="platform-name">Gamma</span>
<div class="flex items-center space-x-2">
<span class="platform-revenue">$50M</span>
<span class="profit-status profit-positive">盈利</span>
</div>
</div>
<div class="platform-item">
<span class="platform-name">Tome</span>
<div class="flex items-center space-x-2">
<span class="platform-revenue">$18.8M</span>
<span class="profit-status profit-negative">已转型</span>
</div>
</div>
<div class="platform-item">
<span class="platform-name">Beautiful.AI</span>
<div class="flex items-center space-x-2">
<span class="platform-revenue">$8.3M</span>
<span class="profit-status profit-neutral">数据不明</span>
</div>
</div>
<div class="platform-item">
<span class="platform-name">Slidebean</span>
<div class="flex items-center space-x-2">
<span class="platform-revenue">$6.3M</span>
<span class="profit-status profit-neutral">数据不明</span>
</div>
</div>
<div class="platform-item">
<span class="platform-name">Canva (全平台)</span>
<div class="flex items-center space-x-2">
<span class="platform-revenue">$2.7B</span>
<span class="profit-status profit-positive">盈利</span>
</div>
</div>
</div>
<div class="data-card mt-2">
<p class="text-xl font-semibold text-cyan-200 mb-1">团队规模效率:</p>
<p class="text-gray-300 mb-2">• Gamma: 仅30人团队实现5000万美元收入<br/>
• Tome: 59人团队实现1880万美元收入<br/>
• Gamma人均创收约166万美元，是Tome的5.2倍</p>
</div>
</div>
</div>
</main>
<!-- Footer -->
<footer class="absolute bottom-0 w-full px-16 py-4 flex justify-between items-center text-sm text-gray-400">
</footer>
</div>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Revenue Comparison Chart
        var revenueCtx = document.getElementById('revenueChart').getContext('2d');
        var revenueChart = new Chart(revenueCtx, {
            type: 'bar',
            data: {
                labels: ['Gamma', 'Tome', 'Beautiful.AI', 'Slidebean', 'Canva (全平台)'],
                datasets: [
                    {
                        label: '年度收入 (百万美元)',
                        data: [50, 18.8, 8.3, 6.3, 2700],
                        backgroundColor: [
                            '#00bfff',
                            '#4a90e2',
                            '#75aaeb',
                            '#8fb8de',
                            '#add8e6'
                        ],
                        borderColor: '#ffffff',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'logarithmic',
                        min: 1,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#e0f2fe',
                            callback: function(value) {
                                if (value === 1) return '$1M';
                                if (value === 10) return '$10M';
                                if (value === 100) return '$100M';
                                if (value === 1000) return '$1B';
                                if (value === 10000) return '$10B';
                                return '';
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#e0f2fe'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var value = context.parsed.y;
                                if (value >= 1000) {
                                    return '$' + (value/1000).toFixed(1) + 'B';
                                } else {
                                    return '$' + value + 'M';
                                }
                            }
                        }
                    }
                }
            }
        });
    });
</script>
</body>
</html>`,

    'ProductOverviewStyleDNA': `<!DOCTYPE html><html lang="zh"><head></head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0" name="viewport">
<title>AI生成PPT产品概述</title>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script><style>
        .slide-container {
            width: 1280px;
            min-height: 720px;
            
            position: relative;
        }
        .bg-tech-pattern {
            background-image: radial-gradient(#ffffff22 1px, transparent 1px);
            background-size: 30px 30px;
        }
        .gradient-border {
            position: relative;
        }
        .bullet-point {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
        }
        .bullet-icon {
            flex-shrink: 0;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            margin-right: 1rem;
        }
    </style>
</head>
<body>
<div class="slide-container bg-gradient-to-br from-gray-900 to-blue-900 text-white relative">
<!-- Background Pattern -->
<div class="absolute inset-0 bg-tech-pattern opacity-10"></div>
<!-- Header -->
<header class="pt-12 px-16">
<h1 class="text-4xl font-bold gradient-border inline-block">AI生成PPT产品概述</h1>
<div class="w-full h-px bg-gradient-to-r from-blue-400 to-transparent mt-6 mb-10"></div>
</header>
<!-- Main Content -->
<main class="px-16 flex">
<!-- Left Column - Definition and Value -->
<div class="w-1/2 pr-10">
<!-- Definition -->
<div class="mb-8">
<h2 class="text-2xl font-semibold text-blue-300 mb-4">
<i class="fas fa-lightbulb mr-2"></i>定义
                    </h2>
<p class="text-lg leading-relaxed">
                        AI生成PPT是指利用人工智能技术辅助或自动化演示文稿（PPT）的创建过程，旨在简化创建流程、提升视觉效果、增强观众互动，从而彻底改变演示文稿的制作与呈现方式。
                    </p>
</div>
<!-- Core Value -->
<div>
<h2 class="text-2xl font-semibold text-blue-300 mb-4">
<i class="fas fa-gem mr-2"></i>核心价值
                    </h2>
<div class="bullet-point">
<div class="bullet-icon bg-blue-900 border border-blue-400 text-cyan-400">
<i class="fas fa-bolt text-xl"></i>
</div>
<div>
<h3 class="text-xl font-medium text-cyan-200">高效创作</h3>
<p>极大提高演示文稿的制作效率，将小时级工作缩短至分钟级</p>
</div>
</div>
<div class="bullet-point">
<div class="bullet-icon bg-blue-900 border border-blue-400 text-cyan-400">
<i class="fas fa-paint-brush text-xl"></i>
</div>
<div>
<h3 class="text-xl font-medium text-cyan-200">专业设计</h3>
<p>无需设计技能，也能获得专业水准的视觉效果与排版</p>
</div>
</div>
<div class="bullet-point">
<div class="bullet-icon bg-blue-900 border border-blue-400 text-cyan-400">
<i class="fas fa-brain text-xl"></i>
</div>
<div>
<h3 class="text-xl font-medium text-cyan-200">内容智能化</h3>
<p>自动生成内容大纲、提供数据可视化与多媒体整合</p>
</div>
</div>
</div>
</div>
<!-- Right Column - Market Demand and Transformation -->
<div class="w-1/2 pl-10 border-l border-blue-800">
<!-- Market Demand -->
<div class="mb-8">
<h2 class="text-2xl font-semibold text-blue-300 mb-4">
<i class="fas fa-chart-line mr-2"></i>市场需求
                    </h2>
<p class="text-lg mb-4 leading-relaxed">
                        传统PPT制作方式往往耗时费力，难以满足高效工作的需求。市场对于能够快速生成高质量、富有吸引力演示文稿的工具需求旺盛。
                    </p>
<div class="bg-blue-800 bg-opacity-40 p-4 rounded-lg border-l-4 border-cyan-400">
<h3 class="text-xl font-medium text-cyan-200 mb-2">主要应用场景</h3>
<div class="flex flex-wrap">
<div class="flex items-center mr-6 mb-2">
<i class="fas fa-briefcase text-cyan-300 mr-2"></i>
<span>商业汇报</span>
</div>
<div class="flex items-center mr-6 mb-2">
<i class="fas fa-graduation-cap text-cyan-300 mr-2"></i>
<span>教育培训</span>
</div>
<div class="flex items-center mr-6 mb-2">
<i class="fas fa-box-open text-cyan-300 mr-2"></i>
<span>产品展示</span>
</div>
</div>
</div>
</div>
<!-- AI Transformation -->
<div>
<h2 class="text-2xl font-semibold text-blue-300 mb-4">
<i class="fas fa-magic mr-2"></i>AI如何改变传统PPT制作
                    </h2>
<div class="relative pl-8 mb-3">
<div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-transparent"></div>
<p class="text-lg">
<span class="text-cyan-200 font-medium">输入简化：</span>
                            用户只需输入提示词（主题、大纲或文本内容）
                        </p>
</div>
<div class="relative pl-8 mb-3">
<div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-transparent"></div>
<p class="text-lg">
<span class="text-cyan-200 font-medium">内容生成：</span>
                            自动生成幻灯片内容、大纲结构
                        </p>
</div>
<div class="relative pl-8 mb-3">
<div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-transparent"></div>
<p class="text-lg">
<span class="text-cyan-200 font-medium">设计优化：</span>
                            推荐设计布局、优化排版、整合多媒体元素
                        </p>
</div>
<div class="relative pl-8">
<div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-transparent"></div>
<p class="text-lg">
<span class="text-cyan-200 font-medium">效率提升：</span>
                            将传统数小时的工作压缩至几分钟完成
                        </p>
</div>
</div>
</div>
</main>
<!-- Footer -->
<footer class="absolute bottom-0 w-full px-16 py-4 flex justify-between items-center text-sm text-gray-400">
</footer>
</div>

</body></html>`,

    'TemplateTable': `<!DOCTYPE html><html lang="zh"><head></head>
<meta charset="utf-8">
<meta content="width=device-width, initial-scale=1.0" name="viewport">
<title>产品功能分析-内容生成能力</title>
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script><style>
        .slide-container {
            width: 1280px;
            min-height: 720px;
            
            position: relative;
        }
        .bg-tech-pattern {
            background-image: radial-gradient(#ffffff22 1px, transparent 1px);
            background-size: 30px 30px;
        }
        .gradient-border {
            position: relative;
        }
        .feature-card {
            background: rgba(0, 51, 102, 0.4);
            border: 1px solid rgba(0, 191, 255, 0.3);
            border-radius: 8px;
            transition: all 0.3s ease;
        }
        .feature-card:hover {
            box-shadow: 0 0 15px rgba(0, 191, 255, 0.3);
            transform: translateY(-2px);
        }
        .feature-icon {
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            margin-right: 1rem;
            background: rgba(0, 51, 102, 0.8);
            border: 1px solid rgba(0, 191, 255, 0.5);
        }
        .capability-cell {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 32px;
        }
        .capability-cell i.fa-check {
            color: #4ade80;
        }
        .capability-cell i.fa-minus {
            color: #94a3b8;
        }
        .capability-cell i.fa-star {
            color: #facc15;
        }
    </style>
</head>
<body>
<div class="slide-container bg-gradient-to-br from-gray-900 to-blue-900 text-white relative">
<!-- Background Pattern -->
<div class="absolute inset-0 bg-tech-pattern opacity-10"></div>
<!-- Header -->
<header class="pt-12 px-16">
<h1 class="text-4xl font-bold gradient-border inline-block">产品功能分析-内容生成能力</h1>
<div class="w-full h-px bg-gradient-to-r from-blue-400 to-transparent mt-6 mb-8"></div>
</header>
<!-- Main Content -->
<main class="px-16">
<!-- Introduction -->
<p class="text-lg text-blue-200 mb-6">
                AI生成PPT产品在内容创建方面展现出不同的能力特点，主要体现在主题生成大纲、文档转换和AI辅助文案优化三个方面。
            </p>
<!-- Feature Cards -->
<div class="flex justify-between mb-8">
<!-- Topic to Outline -->
<div class="feature-card p-4 w-1/3 mr-4">
<div class="flex items-center mb-3">
<div class="feature-icon text-cyan-400">
<i class="fas fa-sitemap text-xl"></i>
</div>
<h3 class="text-xl font-semibold text-cyan-200">主题生成大纲</h3>
</div>
<p class="text-gray-300 mb-2">
                        根据用户输入的主题或简短描述，自动生成完整的PPT大纲、标题和内容结构。
                    </p>
</div>
<!-- Document Conversion -->
<div class="feature-card p-4 w-1/3 mr-4">
<div class="flex items-center mb-3">
<div class="feature-icon text-cyan-400">
<i class="fas fa-file-import text-xl"></i>
</div>
<h3 class="text-xl font-semibold text-cyan-200">文档转换</h3>
</div>
<p class="text-gray-300 mb-2">
                        支持从Word、PDF、TXT等格式导入内容，并智能转换为结构化的PPT演示文稿。
                    </p>
</div>
<!-- Content Optimization -->
<div class="feature-card p-4 w-1/3">
<div class="flex items-center mb-3">
<div class="feature-icon text-cyan-400">
<i class="fas fa-wand-magic-sparkles text-xl"></i>
</div>
<h3 class="text-xl font-semibold text-cyan-200">AI辅助文案优化</h3>
</div>
<p class="text-gray-300 mb-2">
                        提供内容润色、语法修正、表达优化等功能，提升演示文稿的专业度和表现力。
                    </p>
</div>
</div>
<!-- Comparison Table -->
<div class="bg-blue-900 bg-opacity-40 rounded-lg border border-blue-800 overflow-hidden">
<table class="w-full text-sm">
<thead>
<tr class="bg-blue-800 bg-opacity-50">
<th class="py-2 px-4 text-left text-cyan-200 font-semibold">产品名称</th>
<th class="py-2 px-4 text-center text-cyan-200 font-semibold">主题生成大纲</th>
<th class="py-2 px-4 text-center text-cyan-200 font-semibold">文档转换</th>
<th class="py-2 px-4 text-center text-cyan-200 font-semibold">AI辅助文案优化</th>
<th class="py-2 px-4 text-left text-cyan-200 font-semibold">特色功能</th>
</tr>
</thead>
<tbody>
<tr class="border-t border-blue-800">
<td class="py-2 px-4 font-medium">博思AIPPT (PPTGO)</td>
<td class="py-2 px-4">
<div class="capability-cell">
<i class="fas fa-star mr-1"></i>
<span>一句话生成</span>
</div>
</td>
<td class="py-2 px-4">
<div class="capability-cell">
<i class="fas fa-star mr-1"></i>
<span>多格式支持</span>
</div>
</td>
<td class="py-2 px-4">
<div class="capability-cell">
<i class="fas fa-check"></i>
</div>
</td>
<td class="py-2 px-4 text-gray-300">智能提炼文件内容，全流程自动化</td>
</tr>
<tr class="border-t border-blue-800">
<td class="py-2 px-4 font-medium">Gamma</td>
<td class="py-2 px-4">
<div class="capability-cell">
<i class="fas fa-check"></i>
</div>
</td>
<td class="py-2 px-4">
<div class="capability-cell">
<i class="fas fa-minus"></i>
</div>
</td>
<td class="py-2 px-4">
<div class="capability-cell">
<i class="fas fa-check"></i>
</div>
</td>
<td class="py-2 px-4 text-gray-300">高质量内容生成，减少手动设计工作</td>
</tr>
<tr class="border-t border-blue-800">
<td class="py-2 px-4 font-medium">Tome</td>
<td class="py-2 px-4">
<div class="capability-cell">
<i class="fas fa-star mr-1"></i>
<span>完整套件</span>
</div>
</td>
<td class="py-2 px-4">
<div class="capability-cell">
<i class="fas fa-minus"></i>
</div>
</td>
<td class="py-2 px-4">
<div class="capability-cell">
<i class="fas fa-check"></i>
</div>
</td>
<td class="py-2 px-4 text-gray-300">自动生成标题、大纲、内容、配图</td>
</tr>
<tr class="border-t border-blue-800">
<td class="py-2 px-4 font-medium">Microsoft Copilot</td>
<td class="py-2 px-4">
<div class="capability-cell">
<i class="fas fa-check"></i>
</div>
</td>
<td class="py-2 px-4">
<div class="capability-cell">
<i class="fas fa-star mr-1"></i>
<span>Office集成</span>
</div>
</td>
<td class="py-2 px-4">
<div class="capability-cell">
<i class="fas fa-check"></i>
</div>
</td>
<td class="py-2 px-4 text-gray-300">与Office套件深度集成，文档直接转PPT</td>
</tr>
</tbody>
</table>
</div>
<!-- Legend -->
<div class="flex justify-center mt-4 text-sm">
<div class="flex items-center mr-6">
<i class="fas fa-check text-green-400 mr-1"></i>
<span class="text-gray-300">支持</span>
</div>
<div class="flex items-center mr-6">
<i class="fas fa-minus text-gray-400 mr-1"></i>
<span class="text-gray-300">不支持/未明确</span>
</div>
<div class="flex items-center">
<i class="fas fa-star text-yellow-400 mr-1"></i>
<span class="text-gray-300">特色功能</span>
</div>
</div>
</main>
<!-- Footer -->
<footer class="absolute bottom-0 w-full px-16 py-4 flex justify-between items-center text-sm text-gray-400">
</footer>
</div>

</body></html>`
};

// Send TemplateAnalysis reference to Claude and get response
async function sendTemplateAnalysisReference() {
    if (!selectedTemplate) {
        showTemplateSelectionModal();
        return;
    }
    
    // Now just call the unified function
    await sendTemplateInstructionToClaud(selectedTemplate);
    
    // Update template badge
    updateTemplateBadge(selectedTemplate);
}

async function previewUploadedHtml(fileId) {
    const fileObj = uploadedFiles.find(file => file.id === fileId);
    if (!fileObj || !isHtmlFile(fileObj.file)) {
        console.error('HTML file not found or invalid');
        return;
    }
    
    try {
        // Read the HTML file content
        const reader = new FileReader();
        reader.onload = function(e) {
            const htmlContent = e.target.result;
            
            // Create a blob and open in new window
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const newWindow = window.open(url, '_blank');
            
            // Clean up the blob URL after a delay
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 5000);
        };
        
        reader.onerror = function() {
            console.error('Error reading HTML file');
            alert('Error reading HTML file');
        };
        
        reader.readAsText(fileObj.file);
    } catch (error) {
        console.error('Error previewing HTML file:', error);
        alert('Error previewing HTML file');
    }
}

async function readFileContent(file, fileObj = null) {
    return new Promise((resolve, reject) => {
        // For images, use compressed data if available
        if (fileObj && isImageFile(file) && fileObj.compressedData) {
            resolve(fileObj.compressedData);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        
        if (isImageFile(file)) {
            // Read images as base64 (fallback for uncompressed)
            reader.readAsDataURL(file);
        } else {
            // Read text files as text
            reader.readAsText(file);
        }
    });
}

async function processFilesForMessage() {
    if (uploadedFiles.length === 0) return null;
    
    const fileContents = [];
    
    for (const fileObj of uploadedFiles) {
        try {
            // Check if image is still compressing
            if (fileObj.compressing) {
                alert(`Please wait for image "${fileObj.name}" to finish compressing before sending.`);
                return null;
            }
            
            const content = await readFileContent(fileObj.file, fileObj);
            fileContents.push({
                name: fileObj.name,
                type: fileObj.type,
                isImage: isImageFile(fileObj.file),
                isHtml: isHtmlFile(fileObj.file),
                content: content,
                originalSize: fileObj.originalSize,
                compressedSize: fileObj.compressedSize
            });
        } catch (error) {
            console.error(`Error reading file ${fileObj.name}:`, error);
            alert(`Error reading file "${fileObj.name}". Please try again.`);
            return null;
        }
    }
    
    // Store for later use in HTML preview
    lastFileContents = fileContents;
    
    return fileContents;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.getElementById('messageInput');
    const fileInput = document.getElementById('fileInput');
    
    // Send message on Enter (but allow Shift+Enter for new lines)
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    
    // Focus on input when page loads
    messageInput.focus();
    
    // Initialize template badge
    updateTemplateBadge();
    
    // File input event listener
    fileInput.addEventListener('change', handleFileSelect);
    
    // Event delegation for HTML preview buttons
    document.addEventListener('click', function(event) {
        if (event.target && event.target.classList.contains('html-preview-button-inline')) {
            event.preventDefault();
            
            const buttonId = event.target.getAttribute('data-html-content');
            let htmlContent = '';
            
            console.log('Button clicked, buttonId:', buttonId);
            
            // Try to get content from our store first
            if (buttonId && window.htmlContentStore && window.htmlContentStore[buttonId]) {
                htmlContent = extractHTML(window.htmlContentStore[buttonId]);
                console.log('Found content in store');
            } else {
                // Fallback: try to find content in the message
                const messageElement = event.target.closest('.message');
                console.log('Fallback: searching in message element');
                if (messageElement) {
                    // Look for any code blocks in the message
                    const codeBlocks = messageElement.querySelectorAll('pre code');
                    for (let block of codeBlocks) {
                        const blockText = block.textContent || block.innerText;
                        if (detectHTML(blockText)) {
                            htmlContent = extractHTML(blockText);
                            console.log('Found HTML in code block');
                            break;
                        }
                    }
                    
                    // If no code blocks, check the entire message content
                    if (!htmlContent) {
                        const messageText = messageElement.textContent || messageElement.innerText;
                        if (detectHTML(messageText)) {
                            htmlContent = extractHTML(messageText);
                            console.log('Found HTML in message text');
                        }
                    }
                }
            }
            
            if (htmlContent) {
                try {
                    console.log('Creating blob and opening preview');
                    
                    // Store reference to the file contents for image injection
                    const imageReplacements = {};
                    if (lastFileContents) {
                        lastFileContents.forEach((file, index) => {
                            if (file.isImage) {
                                imageReplacements[`IMAGE_PLACEHOLDER_${index + 1}`] = file.content;
                            }
                        });
                    }
                    
                    // Create the HTML with image injection script
                    let htmlWithImageInjection = htmlContent;
                    
                    // Add a script to inject images after the page loads
                    const imageInjectionScript = `
                        <script>
                            const imageData = ${JSON.stringify(imageReplacements)};
                            
                            function injectImages() {
                                Object.entries(imageData).forEach(([placeholder, dataUrl]) => {
                                    const images = document.querySelectorAll('img[src="' + placeholder + '"]');
                                    images.forEach(img => {
                                        img.src = dataUrl;
                                    });
                                });
                            }
                            
                            // Inject images when DOM is ready
                            if (document.readyState === 'loading') {
                                document.addEventListener('DOMContentLoaded', injectImages);
                            } else {
                                injectImages();
                            }
                            
                            // Also try again after a short delay for any late-loading elements
                            setTimeout(injectImages, 100);
                        </script>
                    `;
                    
                    // Insert the script before the closing body tag, or at the end if no body tag
                    if (htmlWithImageInjection.includes('</body>')) {
                        htmlWithImageInjection = htmlWithImageInjection.replace('</body>', imageInjectionScript + '</body>');
                    } else {
                        htmlWithImageInjection += imageInjectionScript;
                    }
                    
                    const blob = new Blob([htmlWithImageInjection], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    
                    // Open in new tab
                    const newWindow = window.open(url, '_blank');
                    
                    // Clean up the blob URL after a delay
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                    }, 5000);
                    
                    // Show feedback
                    const originalText = event.target.innerHTML;
                    event.target.innerHTML = '✅ Opened';
                    event.target.disabled = true;
                    
                    setTimeout(() => {
                        event.target.innerHTML = originalText;
                        event.target.disabled = false;
                    }, 2000);
                    
                } catch (error) {
                    console.error('Error creating HTML preview:', error);
                    
                    // Show error feedback
                    const originalText = event.target.innerHTML;
                    event.target.innerHTML = '❌ Error';
                    event.target.disabled = true;
                    
                    setTimeout(() => {
                        event.target.innerHTML = originalText;
                        event.target.disabled = false;
                    }, 2000);
                }
            } else {
                console.warn('No HTML content found for preview');
                
                // Show warning feedback
                const originalText = event.target.innerHTML;
                event.target.innerHTML = '⚠️ No HTML';
                event.target.disabled = true;
                
                setTimeout(() => {
                    event.target.innerHTML = originalText;
                    event.target.disabled = false;
                }, 2000);
            }
        }
    });
});

// Handle window resize
window.addEventListener('resize', function() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
});
