from flask import Blueprint, jsonify, request

from backend.app.core.security import create_access_token, pwd_context, verify_password
from backend.app.db.user_store import add_user, get_user_by_email


auth_bp = Blueprint("auth", __name__)


def _extract_payload():
    if request.form:
        return request.form
    if request.is_json:
        return request.get_json(silent=True) or {}
    return request.values or {}


@auth_bp.route("/login", methods=["POST"])
@auth_bp.route("/api/login", methods=["POST"])
@auth_bp.route("/api/v1/login", methods=["POST"])
def login():
    payload = _extract_payload()
    username = payload.get("username") or payload.get("email")
    password = payload.get("password")
    if not username or not password:
        return jsonify({"detail": "username and password required"}), 400

    user = get_user_by_email(username)
    if not user or not verify_password(password, user.get("hashed_password", "")):
        return jsonify({"detail": "Incorrect username or password"}), 400

    role = user.get("role") or "user"
    token = create_access_token({"sub": username, "role": role})
    return jsonify({"access_token": token, "token_type": "bearer", "role": role}), 200


@auth_bp.route("/register", methods=["POST"])
@auth_bp.route("/api/register", methods=["POST"])
@auth_bp.route("/api/v1/register", methods=["POST"])
def register():
    payload = _extract_payload()
    email = payload.get("email") or payload.get("username")
    password = payload.get("password")
    role = payload.get("role", "user")
    if not email or not password:
        return jsonify({"detail": "email and password required"}), 400

    if get_user_by_email(email):
        return jsonify({"detail": "Email already registered"}), 400

    hashed_password = pwd_context.hash(password)
    add_user(email, hashed_password, role)
    token = create_access_token({"sub": email, "role": role})
    return jsonify({"access_token": token, "token_type": "bearer", "role": role}), 200
