from flask import Flask, request, jsonify, Response
import requests
import json
import os

app = Flask(__name__)

# API Configuration - 仅从环境变量读取，不包含默认密钥
API_CONFIG = {
    "api_key": os.environ.get("API_KEY"),
    "base_url": os.environ.get("BASE_URL", "https://www.dmxapi.cn/v1"),
    "model": os.environ.get("MODEL", "claude-sonnet-4-20250514")
}

def handler(request):
    """Vercel Serverless Function Handler"""
    
    # 处理CORS
    if request.method == 'OPTIONS':
        return '', 200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    
    if request.method != 'POST':
        return jsonify({'error': 'Method not allowed'}), 405
    
    # 检查API密钥是否配置
    if not API_CONFIG["api_key"]:
        return jsonify({'error': 'API key not configured. Please set API_KEY environment variable.'}), 500, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    
    try:
        data = request.get_json()
        messages = data.get('messages', [])
        
        # Prepare the request to Claude API
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {API_CONFIG["api_key"]}'
        }
        
        payload = {
            'model': API_CONFIG['model'],
            'messages': messages,
            'stream': True,
            'max_tokens': 10000
        }
        
        def generate():
            try:
                # Make streaming request to Claude API
                response = requests.post(
                    f'{API_CONFIG["base_url"]}/chat/completions',
                    headers=headers,
                    json=payload,
                    stream=True,
                    timeout=30
                )
                
                if response.status_code != 200:
                    yield f"data: {json.dumps({'error': f'API request failed with status {response.status_code}'})}\n\n"
                    return
                
                for line in response.iter_lines():
                    if line:
                        line = line.decode('utf-8')
                        if line.startswith('data: '):
                            data_content = line[6:]  # Remove 'data: ' prefix
                            if data_content.strip() == '[DONE]':
                                yield f"data: {json.dumps({'done': True})}\n\n"
                                break
                            try:
                                chunk_data = json.loads(data_content)
                                yield f"data: {json.dumps(chunk_data)}\n\n"
                            except json.JSONDecodeError:
                                continue
                                
            except requests.exceptions.Timeout:
                yield f"data: {json.dumps({'error': 'Request timed out'})}\n\n"
            except requests.exceptions.RequestException as e:
                yield f"data: {json.dumps({'error': f'Request failed: {str(e)}'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': f'Server error: {str(e)}'})}\n\n"
        
        return Response(generate(), mimetype='text/plain', headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
        })
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
