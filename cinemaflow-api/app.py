import os

from flask import Flask
from flask_cors import CORS

from models import load_store
from routes.directors import director_bp
from routes.movies import movie_bp


def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    load_store()

    app.register_blueprint(movie_bp)
    app.register_blueprint(director_bp)

    @app.route("/api/health", methods=["GET"])
    def health():
        return {"status": "ok", "service": "CinemaFlow API"}

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", "5000")))
