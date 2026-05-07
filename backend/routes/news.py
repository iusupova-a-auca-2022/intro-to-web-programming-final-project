from flask import Blueprint, request, jsonify
from extensions import db
from models.models import NewsArticle
from config import Config
import urllib.request
import json
from datetime import datetime
import threading
import time

news_bp = Blueprint("news", __name__)

CATEGORIES = ["technology", "business", "science", "health", "general", "entertainment", "sports"]

def fetch_and_store_news():
    if not Config.NEWS_API_KEY:
        return 0

    stored = 0

    for category in CATEGORIES:
        try:
            url = f"https://newsdata.io/api/1/news?apikey={Config.NEWS_API_KEY}&language=en&category={category}"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())

            if data.get("status") != "success":
                print(f"[News fetch] API error for {category}: {data.get('message','unknown')}")
                continue

            for a in data.get("results", []):
                if not a.get("link") or not a.get("title"):
                    continue

                existing = NewsArticle.query.filter_by(url=a["link"]).first()

                if existing:
                    continue

                published = None

                if a.get("pubDate"):
                    try:
                        published = datetime.fromisoformat(a["pubDate"].replace("Z", "+00:00"))
                    except Exception:
                        pass

                article = NewsArticle(
                    title=a.get("title", ""),
                    description=a.get("description") or a.get("content") or "",
                    url=a["link"],
                    source=a.get("source_id", "Unknown"),
                    url_to_image=a.get("image_url"),
                    category=category,
                    published_at=published
                )

                db.session.add(article)
                stored += 1

            db.session.commit()
            print(f"[News fetch] {category}: OK")

        except Exception as e:
            db.session.rollback()
            print(f"[News fetch error] {category}: {e}")
    return stored


def start_news_scheduler(app):
    def run():
        while True:
            with app.app_context():
                try:
                    count = fetch_and_store_news()
                    print(f"[Scheduler] Fetched {count} new articles")
                except Exception as e:
                    print(f"[Scheduler error] {e}")
            time.sleep(3600)

    t = threading.Thread(target=run, daemon=True)
    t.start()


@news_bp.route("/", methods=["GET"])
def get_news():
    category  = request.args.get("category", "")
    source    = request.args.get("source", "")
    q         = request.args.get("q", "").strip()
    date_from = request.args.get("date_from", "")
    date_to   = request.args.get("date_to", "")
    page      = int(request.args.get("page", 1))
    per_page  = int(request.args.get("per_page", 12))

    count = NewsArticle.query.count()

    if count > 0:
        query = NewsArticle.query

        if category and category != "all":
            query = query.filter(NewsArticle.category == category)

        if source:
            query = query.filter(NewsArticle.source.ilike(f"%{source}%"))

        if q:
            query = query.filter(
                (NewsArticle.title.ilike(f"%{q}%")) |
                (NewsArticle.description.ilike(f"%{q}%"))
            )

        if date_from:
            try:
                query = query.filter(NewsArticle.published_at >= datetime.fromisoformat(date_from))
            except Exception:
                pass

        if date_to:
            try:
                query = query.filter(NewsArticle.published_at <= datetime.fromisoformat(date_to))
            except Exception:
                pass

        query = query.order_by(NewsArticle.published_at.desc())
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        articles = [{
            "title":       a.title,
            "description": a.description,
            "url":         a.url,
            "source":      a.source,
            "publishedAt": a.published_at.isoformat() if a.published_at else "",
            "urlToImage":  a.url_to_image,
            "category":    a.category,
        } for a in paginated.items]

        all_sources = [s[0] for s in db.session.query(NewsArticle.source).distinct().order_by(NewsArticle.source).all()]

        return jsonify({
            "articles": articles,
            "total":    paginated.total,
            "pages":    paginated.pages,
            "current_page": page,
            "sources":  all_sources,
            "source":   "db"
        }), 200

    # Fallback to mock
    return jsonify({
        "articles": [],
        "total":    0,
        "pages":    1,
        "current_page": 1,
        "sources":  [],
        "source":   "empty",
        "error": "No news available at this moment."
    }), 200


@news_bp.route("/fetch", methods=["POST"])
def manual_fetch():
    if not Config.NEWS_API_KEY:
        return jsonify({"error": "No API key configured"}), 400
    try:
        count = fetch_and_store_news()
        return jsonify({"message": f"Fetched {count} new articles"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@news_bp.route("/sources", methods=["GET"])
def get_sources():
    sources = [s[0] for s in db.session.query(NewsArticle.source).distinct().order_by(NewsArticle.source).all()]

    return jsonify({"sources": sources}), 200