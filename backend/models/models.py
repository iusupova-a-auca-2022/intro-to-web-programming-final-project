from extensions import db
from datetime import datetime

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    avatar_color = db.Column(db.String(7), default="#6c63ff")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    posts = db.relationship("Post", backref="author", lazy=True, cascade="all, delete-orphan")
    comments = db.relationship("Comment", backref="author", lazy=True, cascade="all, delete-orphan")
    votes = db.relationship("Vote", backref="user", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "avatar_color": self.avatar_color,
            "created_at": self.created_at.isoformat()
        }


class Post(db.Model):
    __tablename__ = "posts"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    body = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), default="general")
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    comments = db.relationship("Comment", backref="post", lazy=True, cascade="all, delete-orphan")
    votes = db.relationship("Vote", backref="post", lazy=True, cascade="all, delete-orphan")

    def vote_count(self):
        ups = Vote.query.filter_by(post_id=self.id, value=1).count()
        downs = Vote.query.filter_by(post_id=self.id, value=-1).count()

        return ups - downs

    def to_dict(self, current_user_id=None):
        user_vote = None

        if current_user_id:
            v = Vote.query.filter_by(post_id=self.id, user_id=current_user_id).first()
            user_vote = v.value if v else None
        return {
            "id": self.id,
            "title": self.title,
            "body": self.body,
            "category": self.category,
            "author": self.author.username,
            "author_color": self.author.avatar_color,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "comment_count": len(self.comments),
            "vote_count": self.vote_count(),
            "user_vote": user_vote
        }


class Comment(db.Model):
    __tablename__ = "comments"
    id = db.Column(db.Integer, primary_key=True)
    body = db.Column(db.Text, nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey("comments.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    replies = db.relationship("Comment", backref=db.backref("parent", remote_side=[id]), lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "body": self.body,
            "post_id": self.post_id,
            "user_id": self.user_id,
            "author": self.author.username,
            "author_color": self.author.avatar_color,
            "parent_id": self.parent_id,
            "created_at": self.created_at.isoformat(),
            "replies": [r.to_dict() for r in self.replies]
        }


class Vote(db.Model):
    __tablename__ = "votes"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id"), nullable=False)

    value = db.Column(db.Integer, nullable=False)
    __table_args__ = (db.UniqueConstraint("user_id", "post_id"),)


class NewsArticle(db.Model):
    __tablename__ = "news_articles"
    id           = db.Column(db.Integer, primary_key=True)
    title        = db.Column(db.String(500), nullable=False)
    description  = db.Column(db.Text)
    url          = db.Column(db.String(1000), unique=True, nullable=False)
    source       = db.Column(db.String(100))
    url_to_image = db.Column(db.String(1000))
    category     = db.Column(db.String(50))
    published_at = db.Column(db.DateTime)
    fetched_at   = db.Column(db.DateTime, default=datetime.utcnow)
