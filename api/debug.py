from http.server import BaseHTTPRequestHandler
import json
import requests
import os

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 设置CORS头
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        
        try:
            # 调试信息
            debug_info = {
                'API_KEY_exists': bool(os.environ.get("API_KEY")),
                'API_KEY_length': len(os.environ.get("API_KEY", "")),
                'BASE_URL': os.environ.get("BASE_URL", "not_set"),
                'MODEL': os.environ.get("MODEL", "not_set"),
                'env_vars': list(os.environ.keys())
            }
            
            # 读取请求体
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            messages = data.get('messages', [])
            
            # API配置 - 从环境变量读取
            api_key = os.environ.get("API_KEY")
            base_url = os.environ.get("BASE_URL", "https://www.dmxapi.cn/v1")
            model = os.environ.get("MODEL", "claude-sonnet-4-20250514")
            
            if not api_key:
                error_result = {
                    'success': False,
                    'error': 'API key not configured',
                    'debug': debug_info
                }
                self.wfile.write(json.dumps(error_result).encode())
                return
            
            # 调用Claude API
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            }
            
            payload = {
                'model': model,
                'messages': messages,
                'stream': False,  # 非流式，一次性获取完整响应
                'max_tokens': 10000
            }
            
            response = requests.post(
                f'{base_url}/chat/completions',
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                # 返回完整响应，前端会模拟流式效果
                api_response = response.json()
                
                # 提取助手消息内容
                if 'choices' in api_response and len(api_response['choices']) > 0:
                    content = api_response['choices'][0]['message']['content']
                    
                    # 返回结构化响应，便于前端处理
                    result = {
                        'success': True,
                        'content': content,
                        'usage': api_response.get('usage', {}),
                        'debug': debug_info
                    }
                else:
                    result = {
                        'success': False,
                        'error': 'No response content',
                        'api_response': api_response,
                        'debug': debug_info
                    }
                
                self.wfile.write(json.dumps(result).encode())
            else:
                error_result = {
                    'success': False,
                    'error': f'API request failed with status {response.status_code}',
                    'details': response.text,
                    'debug': debug_info
                }
                self.wfile.write(json.dumps(error_result).encode())
                
        except requests.exceptions.Timeout:
            error_result = {
                'success': False,
                'error': 'Request timed out',
                'debug': debug_info
            }
            self.wfile.write(json.dumps(error_result).encode())
        except Exception as e:
            error_result = {
                'success': False,
                'error': f'Server error: {str(e)}',
                'debug': debug_info
            }
            self.wfile.write(json.dumps(error_result).encode())
    
    def do_OPTIONS(self):
        # 处理CORS预检请求
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
