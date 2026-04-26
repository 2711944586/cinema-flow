from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path


DATA_FILE = Path(__file__).with_name("cinemaflow-data.json")

movies = [
    {
        "id": 1,
        "title": "星际穿越 (Interstellar)",
        "director": "克里斯托弗·诺兰",
        "directorId": 1,
        "genre": "科幻",
        "genres": ["科幻", "冒险", "剧情"],
        "rating": 9.4,
        "releaseYear": 2014,
        "releaseDate": "2014-11-07",
        "status": "archived",
        "isWatched": True,
        "posterUrl": "https://image.tmdb.org/t/p/w500/c35Vwd9rmMQfaEJuUrJRF3LZWJX.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/w1280/2ssWTSVklAEc98frZUQhgtGHx7s.jpg",
        "duration": 169,
        "description": "在不久的将来，地球面临灭绝危机。一队探险家利用虫洞寻找人类的新家园。",
        "language": "英语",
        "cast": ["马修·麦康纳", "安妮·海瑟薇", "杰西卡·查斯坦"],
        "isFavorite": True,
    },
    {
        "id": 2,
        "title": "盗梦空间 (Inception)",
        "director": "克里斯托弗·诺兰",
        "directorId": 1,
        "genre": "科幻",
        "genres": ["科幻", "动作", "悬疑"],
        "rating": 9.3,
        "releaseYear": 2010,
        "releaseDate": "2010-07-16",
        "status": "archived",
        "isWatched": True,
        "posterUrl": "https://image.tmdb.org/t/p/w500/89W962aAnPS3N3BdKgy2BvUhnCh.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
        "duration": 148,
        "description": "柯布擅长从潜意识中窃取机密，这一次他要完成一次反向植入。",
        "language": "英语",
        "cast": ["莱昂纳多·迪卡普里奥", "汤姆·哈迪", "渡边谦"],
        "isFavorite": True,
    },
    {
        "id": 3,
        "title": "千与千寻 (Spirited Away)",
        "director": "宫崎骏",
        "directorId": 3,
        "genre": "动画",
        "genres": ["动画", "奇幻", "冒险"],
        "rating": 9.4,
        "releaseYear": 2001,
        "releaseDate": "2001-07-20",
        "status": "archived",
        "isWatched": True,
        "posterUrl": "https://image.tmdb.org/t/p/w500/9oZmkkNlI4Ktx6NTkdpeU525qSc.jpg",
        "backdropUrl": "https://image.tmdb.org/t/p/w1280/ukfI9QkU1aIhOhKXYWE9n3z1mFR.jpg",
        "duration": 125,
        "description": "千寻误入神明世界，在寻找父母与自我名字的过程中完成成长。",
        "language": "日语",
        "cast": ["柊瑠美", "入野自由", "夏木真理"],
        "isFavorite": True,
    },
]

directors = [
    {
        "id": 1,
        "name": "克里斯托弗·诺兰",
        "nationality": "英国/美国",
        "birthYear": 1970,
        "bio": "以非线性叙事、时间结构和大银幕视听著称。",
        "portraitUrl": "https://picsum.photos/seed/director-nolan/640/800",
        "activeYears": "1998 - 2026",
        "signatureStyle": "高概念叙事与沉浸式视听",
        "awards": ["奥斯卡最佳导演", "英国电影学院奖"],
        "knownFor": ["星际穿越", "盗梦空间", "奥本海默"],
    },
    {
        "id": 2,
        "name": "李安",
        "nationality": "中国台湾/美国",
        "birthYear": 1954,
        "bio": "横跨东西方文化的大师级导演，擅长处理身份、情感与类型表达。",
        "portraitUrl": "https://picsum.photos/seed/director-lee/640/800",
        "activeYears": "1991 - 2026",
        "signatureStyle": "文化冲突、人物关系与细腻情感",
        "awards": ["奥斯卡最佳导演", "金狮奖", "金熊奖"],
        "knownFor": ["卧虎藏龙", "少年派的奇幻漂流", "断背山"],
    },
    {
        "id": 3,
        "name": "宫崎骏",
        "nationality": "日本",
        "birthYear": 1941,
        "bio": "吉卜力工作室创始人，动画电影巨匠。",
        "portraitUrl": "https://picsum.photos/seed/director-miyazaki/640/800",
        "activeYears": "1979 - 2026",
        "signatureStyle": "手工质感、奇幻世界与成长母题",
        "awards": ["奥斯卡最佳动画长片", "金熊奖"],
        "knownFor": ["千与千寻", "龙猫", "天空之城"],
    },
    {
        "id": 4,
        "name": "王家卫",
        "nationality": "中国香港",
        "birthYear": 1958,
        "bio": "以独特视觉美学、音乐使用和时间记忆著称。",
        "portraitUrl": "https://picsum.photos/seed/director-wong/640/800",
        "activeYears": "1988 - 2026",
        "signatureStyle": "都市孤独、时间记忆与情绪调度",
        "awards": ["戛纳最佳导演", "香港电影金像奖"],
        "knownFor": ["花样年华", "重庆森林", "一代宗师"],
    },
]


def load_store() -> None:
    global movies, directors
    if not DATA_FILE.exists():
        save_store()
        return

    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    movies = data.get("movies", movies)
    directors = data.get("directors", directors)


def save_store() -> None:
    DATA_FILE.write_text(
        json.dumps({"movies": movies, "directors": directors}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def snapshot_movies() -> list[dict]:
    return deepcopy(movies)


def snapshot_directors() -> list[dict]:
    return deepcopy(directors)


def next_movie_id() -> int:
    return max((movie["id"] for movie in movies), default=0) + 1


def next_director_id() -> int:
    return max((director["id"] for director in directors), default=0) + 1
