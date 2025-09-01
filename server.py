from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
import requests
import json
import os

app = Flask(__name__)
CORS(app)

# API Configuration
API_CONFIG = {
    "api_key": "sk-wAR2VA6TYUt20h9xUA326L3F1CWcZxZQa6nBZaaNekPd8Nzz",
    "base_url": "https://www.dmxapi.cn/v1",
    "model": "claude-sonnet-4-20250514"
}

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
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
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# For Vercel deployment
app.config['DEBUG'] = False

if __name__ == '__main__':
    app.run(debug=True, host='localhost', port=5000)
