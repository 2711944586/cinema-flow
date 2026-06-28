import os

from flask import Flask
from flask_cors import CORS

from models import load_store
from routes.directors import director_bp
from routes.movies import movie_bp


def create_app():
    app = Flask(__name__)
    cors_origins = os.environ.get("CORS_ORIGINS", "*")
    CORS(app, resources={r"/api/*": {"origins": cors_origins.split(",") if cors_origins != "*" else "*"}})
    load_store()

    app.register_blueprint(movie_bp)
    app.register_blueprint(director_bp)

    @app.route("/", methods=["GET"])
    @app.route("/health", methods=["GET"])
    @app.route("/api/health", methods=["GET"])
    def health():
        return {"status": "ok", "service": "CinemaFlow API"}

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", "9000")),
        debug=os.environ.get("FLASK_DEBUG", "0") == "1",
    )
