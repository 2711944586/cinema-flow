from flask import Blueprint, jsonify, request

from models import movies, next_movie_id, save_store, snapshot_movies


movie_bp = Blueprint("movies", __name__)


@movie_bp.route("/api/movies", methods=["GET"])
def get_movies():
    title = request.args.get("title", "").strip().lower()
    genre = request.args.get("genre", "").strip()
    result = snapshot_movies()

    if title:
        result = [
            movie for movie in result
            if title in movie.get("title", "").lower()
            or title in movie.get("director", "").lower()
        ]

    if genre:
        result = [
            movie for movie in result
            if movie.get("genre") == genre or genre in movie.get("genres", [])
        ]

    return jsonify(result)


@movie_bp.route("/api/movies/<int:movie_id>", methods=["GET"])
def get_movie(movie_id):
    movie = next((item for item in movies if item["id"] == movie_id), None)
    if movie is None:
        return jsonify({"error": f"电影 id={movie_id} 未找到"}), 404
    return jsonify(movie)


@movie_bp.route("/api/movies", methods=["POST"])
def add_movie():
    data = request.get_json(silent=True) or {}
    if not data.get("title"):
        return jsonify({"error": "title 字段必填"}), 400

    genre = data.get("genre") or (data.get("genres") or ["剧情"])[0]
    release_year = int(data.get("releaseYear") or 0)
    new_movie = {
        **data,
        "id": next_movie_id(),
        "title": data.get("title", ""),
        "director": data.get("director", "未知导演"),
        "directorId": int(data.get("directorId") or 0),
        "genre": genre,
        "genres": data.get("genres") or [genre],
        "rating": float(data.get("rating") or 0),
        "releaseYear": release_year,
        "releaseDate": data.get("releaseDate") or f"{release_year or 2026}-01-01",
        "status": data.get("status", "showing"),
    }
    movies.append(new_movie)
    save_store()
    return jsonify(new_movie), 201


@movie_bp.route("/api/movies/<int:movie_id>", methods=["PUT"])
def update_movie(movie_id):
    movie = next((item for item in movies if item["id"] == movie_id), None)
    if movie is None:
        return jsonify({"error": f"电影 id={movie_id} 未找到"}), 404

    data = request.get_json(silent=True) or {}
    for key, value in data.items():
        if key != "id":
            movie[key] = value

    save_store()
    return jsonify(movie)


@movie_bp.route("/api/movies/<int:movie_id>", methods=["DELETE"])
def delete_movie(movie_id):
    movie = next((item for item in movies if item["id"] == movie_id), None)
    if movie is None:
        return jsonify({"error": f"电影 id={movie_id} 未找到"}), 404

    movies[:] = [item for item in movies if item["id"] != movie_id]
    save_store()
    return jsonify({"success": True, "deleted": movie})
