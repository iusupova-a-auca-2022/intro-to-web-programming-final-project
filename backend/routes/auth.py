from flask import Blueprint, request, jsonify, Response, make_response
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from extensions import db, bcrypt
from models.models import User
import random

auth_bp = Blueprint("auth", __name__)

AVATAR_COLORS = ["#e63946","#2a9d8f","#e9c46a","#f4a261","#264653","#6c63ff","#48cae4","#06d6a0"]

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data or not all(k in data for k in ("username", "email", "password")):
        return jsonify({"error": "Missing fields"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 409

    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "Username already taken"}), 409

    hashed = bcrypt.generate_password_hash(data["password"]).decode("utf-8")

    user = User(
        username=data["username"],
        email=data["email"],
        password_hash=hashed,
        avatar_color=random.choice(AVATAR_COLORS)
    )

    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id))

    return make_response(jsonify({"token": token, "user": user.to_dict()}), 201)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data or not all(k in data for k in ("email", "password")):
        return jsonify({"error": "Missing fields"}), 400

    user = User.query.filter_by(email=data["email"]).first()

    if not user or not bcrypt.check_password_hash(user.password_hash, data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user.id))

    return jsonify({"token": token, "user": user.to_dict()}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    uid = int(get_jwt_identity())
    user = db.get_or_404(User, uid)

    return jsonify(user.to_dict()), 200
