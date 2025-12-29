from flask import Flask
from flask_cors import CORS
from .config import Config
from .extensions import jwt
from .routes.health import health_bp
from .routes.auth import auth_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Allow your React app to call the API
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    jwt.init_app(app)

    app.register_blueprint(health_bp, url_prefix="/api/v1")
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")

    return app
