from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = data.get("email", "")
    password = data.get("password", "")

    # TODO: Replace with DB lookup + hashed password check
    if email and password:
        token = create_access_token(identity=email)
        return jsonify(access_token=token)

    return jsonify(message="Email and password required"), 400
