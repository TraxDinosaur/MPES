from flask import Flask, render_template, request, jsonify, Response, send_from_directory
from urllib.parse import urlparse, parse_qs
from flask_cors import CORS
import requests
import logging
import hashlib
import base64
import hmac
import time
import os

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "")
CORS(app)

ALLOWED_REFERRERS = os.environ.get("ALLOWED_REFERRERS", "").split(",") if os.environ.get("ALLOWED_REFERRERS") else []
SECURITY_KEY = os.environ.get("SECURITY_KEY", "")

def verify_referrer(referrer):
    if not ALLOWED_REFERRERS:
        return True
    
    if not referrer:
        return False
    
    for allowed in ALLOWED_REFERRERS:
        if allowed.strip() and allowed.strip() in referrer:
            return True
    return False

def generate_signed_url(video_url):
    timestamp = str(int(time.time()))
    message = f"{video_url}:{timestamp}"
    signature = hmac.new(
        SECURITY_KEY.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    encoded_url = base64.urlsafe_b64encode(video_url.encode()).decode()
    return f"/proxy/{encoded_url}?t={timestamp}&s={signature}"

def verify_signed_url(encoded_url, timestamp, signature):
    try:
        video_url = base64.urlsafe_b64decode(encoded_url.encode()).decode()
        message = f"{video_url}:{timestamp}"
        expected_signature = hmac.new(
            SECURITY_KEY.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        current_time = int(time.time())
        request_time = int(timestamp)
        
        if hmac.compare_digest(signature, expected_signature) and (current_time - request_time) < 3600:
            return video_url
    except Exception as e:
        logging.error(f"URL verification failed: {e}")
    
    return None

@app.route('/')
def index():
    return render_template('demo.html')

@app.route('/player.js')
def player_js():
    referrer = request.headers.get('Referer', '')
    
    if ALLOWED_REFERRERS and not verify_referrer(referrer):
        logging.warning(f"Blocked request from unauthorized referrer: {referrer}")
        return "Unauthorized", 403
    
    response = send_from_directory('static', 'player.js')
    response.headers['Content-Type'] = 'application/javascript'
    response.headers['Cache-Control'] = 'public, max-age=3600'
    return response

@app.route('/player.css')
def player_css():
    response = send_from_directory('static', 'player.css')
    response.headers['Content-Type'] = 'text/css'
    response.headers['Cache-Control'] = 'public, max-age=3600'
    return response

@app.route('/player-template')
def player_template():
    response = render_template('player.html')
    return Response(response, mimetype='text/html')

@app.route('/api/signed-url', methods=['POST'])
def create_signed_url():
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'error': 'Missing video URL'}), 400
    
    video_url = data['url']
    
    try:
        parsed = urlparse(video_url)
        if not parsed.scheme or not parsed.netloc:
            return jsonify({'error': 'Invalid URL'}), 400
    except Exception:
        return jsonify({'error': 'Invalid URL'}), 400
    
    signed_url = generate_signed_url(video_url)
    return jsonify({'signed_url': signed_url})

@app.route('/proxy/<path:encoded_url>')
def proxy_video(encoded_url):
    timestamp = request.args.get('t', '')
    signature = request.args.get('s', '')
    
    video_url = verify_signed_url(encoded_url, timestamp, signature)
    if not video_url:
        return "Invalid or expired URL", 403
    
    try:
        range_header = request.headers.get('Range')
        headers = {}
        
        if range_header:
            headers['Range'] = range_header
        
        if request.headers.get('User-Agent'):
            headers['User-Agent'] = request.headers.get('User-Agent')
        
        response = requests.get(video_url, headers=headers, stream=True)
        
        def generate():
            for chunk in response.iter_content(chunk_size=8192):
                yield chunk
        
        flask_response = Response(
            generate(),
            status=response.status_code,
            headers={
                'Content-Type': response.headers.get('Content-Type', 'video/mp4'),
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=3600'
            }
        )
        
        for header in ['Content-Range', 'Content-Length']:
            if header in response.headers:
                flask_response.headers[header] = response.headers[header]
        
        return flask_response
        
    except Exception as e:
        logging.error(f"Proxy error: {e}")
        return "Video unavailable", 502

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
