from flask import Flask, send_from_directory
import os

app = Flask(__name__)

def handler(request):
    """Serve the main index.html file"""
    
    # 获取文件路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)
    
    # 返回index.html内容
    try:
        with open(os.path.join(parent_dir, 'index.html'), 'r', encoding='utf-8') as f:
            content = f.read()
        
        return content, 200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        }
    except FileNotFoundError:
        return "File not found", 404
