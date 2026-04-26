from flask import Blueprint, jsonify, request

from models import directors, movies, next_director_id, save_store, snapshot_directors


director_bp = Blueprint("directors", __name__)


@director_bp.route("/api/directors", methods=["GET"])
def get_directors():
    return jsonify(snapshot_directors())


@director_bp.route("/api/directors/<int:director_id>", methods=["GET"])
def get_director(director_id):
    director = next((item for item in directors if item["id"] == director_id), None)
    if director is None:
        return jsonify({"error": f"导演 id={director_id} 未找到"}), 404
    return jsonify(director)


@director_bp.route("/api/directors/<int:director_id>/movies", methods=["GET"])
def get_director_movies(director_id):
    return jsonify([movie for movie in movies if movie.get("directorId") == director_id])


@director_bp.route("/api/directors", methods=["POST"])
def add_director():
    data = request.get_json(silent=True) or {}
    if not data.get("name"):
        return jsonify({"error": "name 字段必填"}), 400

    new_director = {
        **data,
        "id": next_director_id(),
        "name": data.get("name", ""),
        "nationality": data.get("nationality", ""),
        "birthYear": int(data.get("birthYear") or 0),
        "bio": data.get("bio", ""),
        "portraitUrl": data.get("portraitUrl", ""),
        "activeYears": data.get("activeYears", "待补充"),
        "signatureStyle": data.get("signatureStyle", "作者表达"),
        "awards": data.get("awards", []),
        "knownFor": data.get("knownFor", []),
    }
    directors.append(new_director)
    save_store()
    return jsonify(new_director), 201


@director_bp.route("/api/directors/<int:director_id>", methods=["DELETE"])
def delete_director(director_id):
    director = next((item for item in directors if item["id"] == director_id), None)
    if director is None:
        return jsonify({"error": f"导演 id={director_id} 未找到"}), 404

    directors[:] = [item for item in directors if item["id"] != director_id]
    save_store()
    return jsonify({"success": True, "deleted": director})
