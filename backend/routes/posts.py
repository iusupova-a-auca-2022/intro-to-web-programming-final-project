from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from extensions import db
from models.models import Post, Vote

posts_bp = Blueprint("posts", __name__)

@posts_bp.route("/", methods=["GET"])
def get_posts():
    try:
        verify_jwt_in_request(optional=True)
        uid = int(get_jwt_identity()) if get_jwt_identity() else None
    except Exception:
        uid = None

    category = request.args.get("category")
    page = int(request.args.get("page", 1))
    per_page = 10

    query = Post.query

    if category and category != "all":
        query = query.filter_by(category=category)

    posts = query.order_by(Post.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "posts": [p.to_dict(uid) for p in posts.items],
        "total": posts.total,
        "pages": posts.pages,
        "current_page": page
    }), 200


@posts_bp.route("/<int:post_id>", methods=["GET"])
def get_post(post_id):
    try:
        verify_jwt_in_request(optional=True)
        uid = int(get_jwt_identity()) if get_jwt_identity() else None
    except Exception:
        uid = None
    post = db.get_or_404(Post, post_id)

    return jsonify(post.to_dict(uid)), 200


@posts_bp.route("/", methods=["POST"])
@jwt_required()
def create_post():
    uid = int(get_jwt_identity())
    data = request.get_json()

    if not data or not all(k in data for k in ("title", "body")):
        return jsonify({"error": "Missing fields"}), 400

    post = Post(
        title=data["title"],
        body=data["body"],
        category=data.get("category", "general"),
        user_id=uid
    )

    db.session.add(post)
    db.session.commit()

    return jsonify(post.to_dict(uid)), 201


@posts_bp.route("/<int:post_id>", methods=["DELETE"])
@jwt_required()
def delete_post(post_id):
    uid = int(get_jwt_identity())
    post = db.get_or_404(Post, post_id)

    if post.user_id != uid:
        return jsonify({"error": "Forbidden"}), 403

    db.session.delete(post)
    db.session.commit()

    return jsonify({"message": "Deleted"}), 200


@posts_bp.route("/<int:post_id>/vote", methods=["POST"])
@jwt_required()
def vote_post(post_id):
    uid = int(get_jwt_identity())
    data = request.get_json()
    value = data.get("value")

    if value not in (1, -1):
        return jsonify({"error": "Value must be 1 or -1"}), 400

    post = db.get_or_404(Post, post_id)
    existing = Vote.query.filter_by(user_id=uid, post_id=post_id).first()

    if existing:
        if existing.value == value:
            db.session.delete(existing)
        else:
            existing.value = value
    else:
        vote = Vote(user_id=uid, post_id=post_id, value=value)
        db.session.add(vote)

    db.session.commit()

    return jsonify({"vote_count": post.vote_count()}), 200
