from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db, bcrypt, jwt
from routes.news import fetch_and_store_news, start_news_scheduler, news_bp
from routes.auth import auth_bp
from routes.posts import posts_bp
from routes.comments import comments_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    CORS(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(posts_bp, url_prefix="/api/posts")
    app.register_blueprint(news_bp, url_prefix="/api/news")
    app.register_blueprint(comments_bp, url_prefix="/api/comments")

    with app.app_context():
        db.create_all()

        if Config.NEWS_API_KEY:
            try:
                count = fetch_and_store_news()
                print(f"[Startup] Fetched {count} articles")
            except Exception as e:
                print(f"[Startup fetch error] {e}")
            start_news_scheduler(app)

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
