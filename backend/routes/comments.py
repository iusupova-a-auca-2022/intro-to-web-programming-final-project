from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.models import Comment

comments_bp = Blueprint("comments", __name__)

@comments_bp.route("/post/<int:post_id>", methods=["GET"])
def get_comments(post_id):
    comments = Comment.query.filter_by(post_id=post_id, parent_id=None).order_by(Comment.created_at.asc()).all()

    return jsonify([c.to_dict() for c in comments]), 200


@comments_bp.route("/", methods=["POST"])
@jwt_required()
def create_comment():
    uid = int(get_jwt_identity())
    data = request.get_json()

    if not data or not all(k in data for k in ("body", "post_id")):
        return jsonify({"error": "Missing fields"}), 400

    comment = Comment(
        body=data["body"],
        post_id=data["post_id"],
        user_id=uid,
        parent_id=data.get("parent_id")
    )

    db.session.add(comment)
    db.session.commit()

    return jsonify(comment.to_dict()), 201


@comments_bp.route("/<int:comment_id>", methods=["DELETE"])
@jwt_required()
def delete_comment(comment_id):
    uid = int(get_jwt_identity())
    comment = db.get_or_404(Comment, comment_id)

    if comment.user_id != uid:
        return jsonify({"error": "Forbidden"}), 403

    db.session.delete(comment)
    db.session.commit()

    return jsonify({"message": "Deleted"}), 200
