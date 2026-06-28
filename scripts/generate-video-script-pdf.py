from __future__ import annotations

from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
DOCS_DIR = ROOT / "docs"
PDF_PATH = OUTPUT_DIR / "CinemaFlow-讲解视频讲稿.pdf"
MD_PATH = DOCS_DIR / "CinemaFlow-讲解视频讲稿.md"


def register_fonts() -> tuple[str, str]:
    candidates = [
        Path("C:/Windows/Fonts/NotoSansSC-VF.ttf"),
        Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
        Path("C:/Windows/Fonts/simsun.ttc"),
    ]
    bold_candidates = [
        Path("C:/Windows/Fonts/msyhbd.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
        Path("C:/Windows/Fonts/NotoSansSC-VF.ttf"),
        Path("C:/Windows/Fonts/simhei.ttf"),
    ]

    regular = next((path for path in candidates if path.exists()), None)
    bold = next((path for path in bold_candidates if path.exists()), regular)
    if regular is None:
        raise RuntimeError("No Chinese font was found under C:/Windows/Fonts.")

    pdfmetrics.registerFont(TTFont("CF-Regular", str(regular)))
    pdfmetrics.registerFont(TTFont("CF-Bold", str(bold)))
    return "CF-Regular", "CF-Bold"


FONT_REGULAR, FONT_BOLD = register_fonts()


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="CFTitle",
        fontName=FONT_BOLD,
        fontSize=28,
        leading=36,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#111827"),
        spaceAfter=10,
        wordWrap="CJK",
    )
)
styles.add(
    ParagraphStyle(
        name="CFSubTitle",
        fontName=FONT_REGULAR,
        fontSize=12.5,
        leading=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#475569"),
        spaceAfter=18,
        wordWrap="CJK",
    )
)
styles.add(
    ParagraphStyle(
        name="CFHeading1",
        fontName=FONT_BOLD,
        fontSize=19,
        leading=26,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=9,
        wordWrap="CJK",
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        name="CFHeading2",
        fontName=FONT_BOLD,
        fontSize=14.5,
        leading=21,
        textColor=colors.HexColor("#1f2937"),
        spaceBefore=10,
        spaceAfter=6,
        wordWrap="CJK",
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        name="CFBody",
        fontName=FONT_REGULAR,
        fontSize=10.2,
        leading=17,
        textColor=colors.HexColor("#263244"),
        alignment=TA_LEFT,
        spaceAfter=6,
        wordWrap="CJK",
    )
)
styles.add(
    ParagraphStyle(
        name="CFBodySmall",
        fontName=FONT_REGULAR,
        fontSize=9,
        leading=14,
        textColor=colors.HexColor("#334155"),
        spaceAfter=5,
        wordWrap="CJK",
    )
)
styles.add(
    ParagraphStyle(
        name="CFQuote",
        fontName=FONT_REGULAR,
        fontSize=10.5,
        leading=18,
        textColor=colors.HexColor("#0f172a"),
        leftIndent=10,
        rightIndent=8,
        spaceBefore=4,
        spaceAfter=8,
        borderColor=colors.HexColor("#cbd5e1"),
        borderWidth=0.6,
        borderPadding=7,
        backColor=colors.HexColor("#f8fafc"),
        wordWrap="CJK",
    )
)
styles.add(
    ParagraphStyle(
        name="CFMeta",
        fontName=FONT_BOLD,
        fontSize=9.2,
        leading=13,
        textColor=colors.HexColor("#0f766e"),
        spaceAfter=4,
        wordWrap="CJK",
    )
)


def p(text: str, style: str = "CFBody") -> Paragraph:
    return Paragraph(escape(text).replace("\n", "<br/>"), styles[style])


def numbered(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item, "CFBodySmall"), leftIndent=14) for item in items],
        bulletType="1",
        leftIndent=16,
        bulletFontName=FONT_REGULAR,
        bulletFontSize=8,
    )


def make_table(rows: list[list[str]], widths: list[float]) -> Table:
    table = Table(
        [[p(cell, "CFBodySmall") for cell in row] for row in rows],
        colWidths=widths,
        hAlign="LEFT",
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), FONT_REGULAR),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#ffffff")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ]
        )
    )
    return table


PAGES = [
    {
        "name": "仪表盘",
        "route": "/dashboard",
        "screenshot": "dashboard.png",
        "position": "系统入口和片库总览页。",
        "operations": [
            "从根网址进入系统，等待自动跳转到仪表盘。",
            "指向顶部统计卡片，说明总影片数、已观影、收藏数和平均评分。",
            "向下展示最近浏览、最近添加和推荐入口，说明它们如何帮助用户恢复上下文。",
        ],
        "script": "现在我们看到的是 CinemaFlow 的仪表盘。它承担系统首页和总览中心的角色，用户一进入系统，就能看到片库总量、已观影数量、收藏数量和平均评分。仪表盘的价值在于快速回答三个问题：系统里有多少电影，用户已经看过和收藏了多少，以及当前片库整体质量如何。页面下方还会展示最近浏览和最近添加的电影，让用户可以快速回到刚刚查看过的内容，也可以发现最近维护过的资料。",
        "details": [
            "统计数据来自电影服务和最近浏览服务的响应式状态流，不需要手动刷新。",
            "该页面适合放在讲解开头，用来交代系统不是单点功能，而是完整片库管理平台。",
            "录制时不要停留太久，重点讲清楚它是总览页和入口页。",
        ],
    },
    {
        "name": "电影库",
        "route": "/movies",
        "screenshot": "movies.png",
        "position": "核心资料管理页，承载电影查找、筛选、排序和状态维护。",
        "operations": [
            "进入电影库，展示列表里的片名、导演、类型、评分、年份和状态。",
            "演示搜索框、类型筛选、排序、已看筛选和收藏筛选。",
            "点击收藏或已看按钮，说明这些状态会影响收藏中心和偏好画像。",
        ],
        "script": "接下来是电影库页面，这是整个系统最核心的资料管理入口。这里展示全部电影资料，每部电影都有标题、导演、类型、评分、上映年份、海报和状态信息。上方提供搜索、类型筛选、排序、已看筛选和收藏筛选。对于电影数量不断增加的个人片库来说，电影库解决的是快速定位和批量浏览的问题。用户可以按名称找电影，也可以按导演、类型和状态缩小范围。",
        "details": [
            "电影库支持列表和卡片化浏览，适合不同录屏节奏。",
            "删除、收藏、已看标记都属于用户对电影资料的操作。",
            "电影库是后续详情页、收藏中心、推荐页和对比页的数据入口。",
        ],
    },
    {
        "name": "电影搜索状态",
        "route": "/movies?query=Inception",
        "screenshot": "movies-search-inception.png",
        "position": "展示关键词搜索和查询状态同步。",
        "operations": [
            "在电影库搜索框输入 Inception 或盗梦空间。",
            "观察结果列表被过滤，只保留匹配电影。",
            "说明搜索状态可以和 URL 查询参数联动，便于复现同一结果。",
        ],
        "script": "这里演示电影库的搜索状态。我输入 Inception 后，页面立即筛选出匹配的电影。这个功能看起来简单，但它体现了前端状态管理的设计：搜索条件、筛选结果和分页状态会组合成列表页面的 ViewModel。这样用户既可以快速找到目标，也可以在汇报或测试中复现同一查询条件。",
        "details": [
            "搜索会匹配电影标题、导演和演员等字段。",
            "搜索结果为空时页面会展示空状态和重置入口。",
            "建议录制时用一个英文片名和一个中文片名各演示一次即可。",
        ],
    },
    {
        "name": "类型分类浏览",
        "route": "/movies/genre/科幻",
        "screenshot": "movies-genre-sci-fi.png",
        "position": "通过参数化路由进入指定类型片库。",
        "operations": [
            "从电影卡片的类型标签进入分类页面，或从类型筛选中选择科幻。",
            "说明该页面和电影库共用组件，只是路由参数不同。",
            "展示分类结果和分页状态。",
        ],
        "script": "现在看到的是类型分类浏览。系统使用 `/movies/genre/:genre` 这样的参数化路由进入指定类型。这里和普通电影库复用同一个页面组件，只是通过路由参数自动带入类型条件。这样做的好处是减少重复代码，也能让用户把某一类电影作为独立入口分享和查看。",
        "details": [
            "分类浏览体现 Angular Router 和页面状态的结合。",
            "它避免为每个类型单独写页面，结构更可维护。",
            "讲解时可以强调这是前端工程设计上的复用点。",
        ],
    },
    {
        "name": "电影详情 - 基本信息",
        "route": "/movies/:id/info",
        "screenshot": "movie-detail-info.png",
        "position": "单部电影的完整资料展示和用户操作页。",
        "operations": [
            "从电影库点击一部电影进入详情。",
            "展示背景图、海报、评分、导演、类型、时长、简介和主演。",
            "点击收藏和已看按钮，说明它们会影响收藏、日志和画像。",
        ],
        "script": "电影详情页展示单部电影的完整资料，包括主视觉背景、海报、片名、评分、上映年份、导演、类型、时长、语言、简介和主演信息。这里也是用户行为发生的上下文，例如收藏、标记已看、删除、查看相似推荐、跳到上一部或下一部电影。详情页把静态资料和用户行为连接在一起，是电影实体最完整的展示页面。",
        "details": [
            "详情页父组件负责加载电影上下文。",
            "相似推荐通常基于类型、导演和评分等字段。",
            "最近浏览服务会记录用户进入过的详情页。",
        ],
    },
    {
        "name": "电影详情 - 演员表",
        "route": "/movies/:id/cast",
        "screenshot": "movie-detail-cast.png",
        "position": "电影详情的子路由页面，用于展示演员信息。",
        "operations": [
            "在电影详情页切换到演员表标签。",
            "说明父级详情页不变，子路由内容切换。",
            "展示演员姓名和角色信息。",
        ],
        "script": "现在切换到电影详情里的演员表页面。这个页面是详情页下的子路由，父级页面负责保持电影上下文，子页面只负责展示演员表。这样设计便于扩展，未来如果增加剧照、奖项、幕后、影评等内容，也可以继续作为子路由挂在详情页下面，而不会破坏原有页面结构。",
        "details": [
            "子路由设计让详情页保持清晰边界。",
            "演员信息未来可以扩展成独立人物实体。",
            "讲解时可以把它作为 Angular 路由设计的例子。",
        ],
    },
    {
        "name": "添加电影",
        "route": "/add",
        "screenshot": "add.png",
        "position": "电影资料录入页，受路由守卫保护。",
        "operations": [
            "先点击右上角进入编辑模式，再进入添加电影页面。",
            "展示表单字段：片名、导演、类型、评分、时长、语言、简介、演员、媒体 URL。",
            "说明该页面用于补充和维护片库资料。",
        ],
        "script": "添加电影页面用于录入新的电影资料。表单覆盖片名、导演、上映日期、评分、类型、语言、时长、简介、演员、海报 URL、背景图 URL 和预告片 URL。这个页面受到路由守卫保护，用户需要进入编辑模式才能访问。这样可以把普通浏览和资料维护区分开，避免误操作。",
        "details": [
            "表单提交后会调用电影服务新增或更新电影。",
            "媒体 URL 是系统资料质量的重要部分，因此在表单中单独维护。",
            "录制时可以不真正提交，重点展示字段完整度和权限控制。",
        ],
    },
    {
        "name": "导演库",
        "route": "/directors",
        "screenshot": "directors.png",
        "position": "导演实体列表页，从作者维度组织电影资料。",
        "operations": [
            "进入导演库，展示导演头像、国籍、代表作、风格和活跃年代。",
            "演示搜索导演、代表作品或风格关键词。",
            "点击导演卡片进入导演详情。",
        ],
        "script": "导演库从作者维度组织电影资料。这里展示导演头像、姓名、国籍、代表作品、活跃年代和创作风格。电影资料如果只按片名管理，很容易忽略作者关系；导演库让用户可以从导演出发理解片库结构，也能快速查看某位导演的作品集合。",
        "details": [
            "导演库通过 DirectorService 获取导演数据。",
            "导演实体和电影实体通过 directorId 建立关系。",
            "搜索支持姓名、代表作和风格关键词。",
        ],
    },
    {
        "name": "导演详情",
        "route": "/directors/:id",
        "screenshot": "director-detail.png",
        "position": "导演档案和作品聚合页。",
        "operations": [
            "从导演库进入某位导演详情。",
            "展示导演简介、获奖、风格、代表作品和电影列表。",
            "点击作品回到电影详情，说明跨实体导航。",
        ],
        "script": "导演详情页展示导演档案，包括国籍、出生年份、活跃年代、风格描述、获奖信息和代表作品。页面下方聚合该导演在片库中的电影。这个页面的重点是建立作者和作品的双向关系：用户既可以从电影进入导演，也可以从导演回到电影。",
        "details": [
            "导演详情适合展示作品聚合和跨实体导航。",
            "如果未来接入数据库，导演表和电影表是一对多关系。",
            "讲解时可以选择诺兰、李安或宫崎骏作为例子。",
        ],
    },
    {
        "name": "探索影库",
        "route": "/explore",
        "screenshot": "explore.png",
        "position": "沉浸式浏览页，适合无明确目标时扫片。",
        "operations": [
            "进入探索影库，展示大图电影卡片。",
            "选中不同电影，观察右侧或详情区域变化。",
            "说明该页适合发现和快速浏览。",
        ],
        "script": "探索影库提供更沉浸式的浏览方式。它不像电影库那样强调表格和筛选，而是通过大图、评分和简介帮助用户快速感受影片气质。这个页面适合用户没有明确目标时随意浏览，也适合在演示中展示系统的视觉资料质量。",
        "details": [
            "探索页使用主视觉图强化电影氛围。",
            "它和电影库共享同一份电影数据。",
            "录制时可快速展示一到两部电影，不必逐张讲完。",
        ],
    },
    {
        "name": "收藏中心",
        "route": "/favorites",
        "screenshot": "favorites.png",
        "position": "用户收藏电影的集中展示页。",
        "operations": [
            "进入收藏中心，展示收藏电影列表。",
            "点击取消收藏或进入详情。",
            "说明收藏会影响智能选片和偏好画像。",
        ],
        "script": "收藏中心展示用户标记为收藏的电影。收藏不是孤立状态，它代表用户认为这些电影更重要、更值得回看。系统会把收藏作为偏好分析和智能推荐的信号。通过这个页面，用户可以快速回到个人片库中最有价值的一组电影。",
        "details": [
            "收藏状态保存在电影服务中，并可被多个页面复用。",
            "收藏中心适合展示用户个人化痕迹。",
            "讲解时可以强调收藏和推荐、画像之间的联系。",
        ],
    },
    {
        "name": "时间线",
        "route": "/timeline",
        "screenshot": "timeline.png",
        "position": "按年代组织电影的分析页。",
        "operations": [
            "进入时间线，展示不同年份或年代的电影。",
            "说明它用于观察片库时间跨度。",
            "点击时间线中的电影进入详情。",
        ],
        "script": "时间线页面按照上映时间组织电影。它可以帮助用户观察片库覆盖的年代范围，发现哪些年代电影较多，哪些年代资料较少。相比普通列表，时间线更强调电影历史和片库结构。",
        "details": [
            "时间线适合讲数据从列表转化为结构化视图。",
            "它可以辅助判断片库是否偏向某个年代。",
            "未来可以扩展年度观影统计和年代评分曲线。",
        ],
    },
    {
        "name": "推荐页",
        "route": "/recommendations",
        "screenshot": "recommendations.png",
        "position": "基于类型、导演和评分的推荐展示页。",
        "operations": [
            "进入推荐页，展示推荐分组。",
            "点击推荐电影进入详情。",
            "说明推荐页适合看完一部电影后继续发现相似电影。",
        ],
        "script": "推荐页负责把片库从静态资料变成主动发现工具。系统会根据类型、导演、评分等维度组织推荐内容。用户看完一部电影后，可以在这里找到相似风格或相同类型的电影，从而形成连续浏览和连续观看的路径。",
        "details": [
            "推荐页和智能选片不同：推荐页更偏展示，智能选片更偏条件决策。",
            "推荐结果可以作为详情页相似推荐的补充。",
            "录制时重点讲它帮助用户发现下一部电影。",
        ],
    },
    {
        "name": "随机选片",
        "route": "/random",
        "screenshot": "random.png",
        "position": "轻量决策页，帮助用户快速抽取电影。",
        "operations": [
            "进入随机选片，点击随机按钮。",
            "展示抽中的电影、评分、导演、时长和历史记录。",
            "说明它解决临时不知道看什么的问题。",
        ],
        "script": "随机选片页面解决的是轻量决策问题。当用户不想设置复杂条件，只想快速决定今晚看什么时，可以点击随机按钮。系统会抽取一部电影，并展示导演、时长、年份和评分。页面还会保留抽选历史，方便用户回看候选结果。",
        "details": [
            "随机选片适合录制时做一次真实点击。",
            "它与智能选片互补，一个轻量随机，一个精确筛选。",
            "可以顺手演示收藏按钮。",
        ],
    },
    {
        "name": "电影对比",
        "route": "/compare",
        "screenshot": "compare.png",
        "position": "两部电影并列比较页。",
        "operations": [
            "进入电影对比，选择两部电影。",
            "展示评分、时长、类型、导演、语言等差异。",
            "说明它适合在候选电影之间做决策。",
        ],
        "script": "电影对比页面允许用户选择两部电影并列查看。系统会从评分、时长、类型、导演、语言等维度进行对比。当用户在两部电影之间犹豫时，这个页面可以把关键指标放在同一视图里，帮助用户更快做决定。",
        "details": [
            "对比页体现数据结构化展示能力。",
            "它适合和随机选片、智能选片一起讲，形成决策工具组合。",
            "未来可以扩展更复杂的相似度评分。",
        ],
    },
    {
        "name": "观影日历",
        "route": "/calendar",
        "screenshot": "calendar.png",
        "position": "按日期展示真实观影行为。",
        "operations": [
            "进入观影日历，展示月度观影记录。",
            "说明这里展示的是观看日期，不是电影上映日期。",
            "点击某天或某条记录，关联到观影日志。",
        ],
        "script": "观影日历基于用户的观影日志生成。它展示的是用户实际在哪一天观看了哪部电影，而不是电影上映日期。这个页面把观影行为转换成时间分布，帮助用户回顾自己的观看节奏和月度观影情况。",
        "details": [
            "日历数据来自 WatchLogService。",
            "它和观影日志、情绪图谱、偏好画像形成闭环。",
            "讲解时一定强调它是行为数据，不是资料日期。",
        ],
    },
    {
        "name": "影评墙",
        "route": "/reviews",
        "screenshot": "reviews.png",
        "position": "评论创作和主观评价沉淀页。",
        "operations": [
            "进入影评墙，展示已有评论。",
            "说明可以为电影写作者、标题、评分和正文。",
            "展示点赞或评论列表排序。",
        ],
        "script": "影评墙用于保存用户对电影的主观评价。电影资料解决的是事实信息，影评解决的是用户观点。用户可以写标题、评分和评论内容，也可以浏览已有评论。影评数据会丰富电影评价维度，并能参与偏好分析。",
        "details": [
            "影评墙是内容表达模块。",
            "它让系统从资料库升级为个人观影档案。",
            "录制时可以展示输入区，但不一定提交新评论。",
        ],
    },
    {
        "name": "待看片单",
        "route": "/watch-plans",
        "screenshot": "watch-plans.png",
        "position": "未来观看计划管理页。",
        "operations": [
            "进入待看片单，展示计划电影。",
            "说明每条计划包含优先级、状态、计划日期、观看场景和备注。",
            "演示状态切换或从推荐加入片单。",
        ],
        "script": "待看片单管理的是未来想看的电影。它比收藏更进一步，因为收藏只表示喜欢或关注，而待看片单表示已经进入观看计划。每条计划可以有优先级、状态、计划日期、观看场景和备注。这个页面把想看电影变成可执行安排。",
        "details": [
            "待看片单是从发现到观看的中间环节。",
            "它可以被智能选片的只看片单条件复用。",
            "录制时可以说明它和观影日志之间的前后关系。",
        ],
    },
    {
        "name": "观影日志",
        "route": "/watch-logs",
        "screenshot": "watch-logs.png",
        "position": "已完成观影行为记录页。",
        "operations": [
            "进入观影日志，展示日志列表和表单。",
            "说明字段包括观看日期、地点、陪伴对象、评分、情绪标签和备注。",
            "讲清楚日志会驱动日历、情绪图谱和偏好画像。",
        ],
        "script": "观影日志记录已经发生的观影行为。这里可以填写观看日期、地点、陪伴对象、会话评分、情绪标签和备注。它是系统中非常关键的数据来源，因为观影日历、情绪图谱和偏好画像都依赖这些日志。也就是说，日志让系统知道用户不仅收藏了什么，还真正看了什么、什么时候看、观看时是什么感受。",
        "details": [
            "观影日志是行为闭环的核心。",
            "情绪标签会进入情绪图谱。",
            "会话评分可以与电影原始评分共同分析。",
        ],
    },
    {
        "name": "智能选片",
        "route": "/smart-picks",
        "screenshot": "smart-picks.png",
        "position": "条件化推荐和预设管理页。",
        "operations": [
            "进入智能选片，展示最大时长、最低评分、类型、语言等条件。",
            "勾选是否允许已看、是否偏好收藏、是否只看待看片单。",
            "保存一个预设或应用已有预设，展示推荐结果。",
        ],
        "script": "智能选片是系统中的高级决策功能。用户可以设置最大时长、最低评分、包含类型、排除类型、偏好语言、是否允许已看、是否优先收藏，以及是否只从待看片单里选择。系统会根据这些条件生成推荐结果，还可以保存预设，比如周末长片、下班后轻松看。这个页面把用户主观需求转换成可复用的选片规则。",
        "details": [
            "智能选片适合重点演示，能体现系统不是简单 CRUD。",
            "预设由 SmartPicksService 管理。",
            "推荐结果可以加入待看片单，形成后续观看计划。",
        ],
    },
    {
        "name": "导演图谱",
        "route": "/director-atlas",
        "screenshot": "director-atlas.png",
        "position": "按导演聚合片库指标的分析页。",
        "operations": [
            "进入导演图谱，展示导演维度统计。",
            "讲作品数、平均评分、收藏数、已看数和总时长。",
            "点击导演或作品跳转到对应详情。",
        ],
        "script": "导演图谱把电影列表转化为导演维度的统计视图。它会展示每位导演的作品数量、平均评分、收藏数量、已看数量和总时长。用户可以通过这个页面判断片库中哪些导演占比高，哪些导演更符合个人口味，也可以从导演直接跳到作品或导演详情。",
        "details": [
            "导演图谱体现聚合分析能力。",
            "它依赖电影和导演之间的关联字段。",
            "讲解时可强调这是资料库向分析系统升级的表现。",
        ],
    },
    {
        "name": "情绪图谱",
        "route": "/mood-atlas",
        "screenshot": "mood-atlas.png",
        "position": "基于观影日志情绪标签的分析页。",
        "operations": [
            "进入情绪图谱，展示情绪标签统计。",
            "说明情绪来自观影日志，不是电影固定属性。",
            "选择不同标签查看对应电影。",
        ],
        "script": "情绪图谱基于观影日志里的情绪标签生成。它不是在分析电影官方类型，而是在分析用户观看时的感受，例如治愈、热血、沉重、浪漫等。这个页面帮助用户理解自己的观影需求：有时我们不是想看某个类型，而是想要某种情绪体验。",
        "details": [
            "情绪图谱必须和观影日志一起讲。",
            "它展示的是用户主观体验数据。",
            "未来可以扩展成情绪推荐。",
        ],
    },
    {
        "name": "连看规划",
        "route": "/marathon",
        "screenshot": "marathon.png",
        "position": "按时间预算组合连续观影片单。",
        "operations": [
            "进入连看规划，展示总时长预算和候选组合。",
            "调整类型或时间限制。",
            "说明适合周末、假期和主题观影夜。",
        ],
        "script": "连看规划用于组合连续观影片单。用户可以根据总时长预算和类型偏好，让系统生成适合一晚、一个下午或一个周末的电影组合。这个功能解决的是多部电影如何搭配的问题，适合主题观影、假期观影和电影马拉松场景。",
        "details": [
            "连看规划关注组合而不是单部推荐。",
            "它会使用电影时长和类型信息。",
            "讲解时可以把它称为观影安排工具。",
        ],
    },
    {
        "name": "偏好画像",
        "route": "/taste-dna",
        "screenshot": "taste-dna.png",
        "position": "综合用户行为形成个人偏好分析。",
        "operations": [
            "进入偏好画像，展示类型偏好、导演偏好、语言分布和年代偏好。",
            "说明画像综合已看、收藏、评分、影评和日志。",
            "展示下一批值得补完的电影。",
        ],
        "script": "偏好画像是系统从资料管理走向个人分析的关键页面。它会综合用户已看、收藏、个人评分、影评和观影日志，形成类型偏好、导演偏好、语言分布和年代偏好。这里不仅能看到用户喜欢什么，还能看到片库中的盲点，比如哪些高价值电影值得补完。",
        "details": [
            "偏好画像是多个服务状态聚合后的结果。",
            "它适合放在视频后半段，体现系统深度。",
            "讲解时强调它不是手工填写，而是由行为数据沉淀而来。",
        ],
    },
    {
        "name": "氛围策展",
        "route": "/scene-board",
        "screenshot": "scene-board.png",
        "position": "按视觉气质、主题和场景重新编排片库。",
        "operations": [
            "进入氛围策展，切换不同氛围频道。",
            "展示画面锚点和主题电影卡片。",
            "切换密度模式，说明策展不是传统类型分类。",
        ],
        "script": "氛围策展不是按照科幻、剧情、动画这样的传统类型组织电影，而是按照视觉气质、主题和观看场景重新编排片库。比如适合某个夜晚、某种心情或某种画面氛围的电影集合。这个页面体现了系统的策展能力，也让电影资料有了更强的表达性。",
        "details": [
            "氛围策展适合展示视觉效果。",
            "它强调主题组织和场景化使用。",
            "录制时可以切换两到三个频道即可。",
        ],
    },
    {
        "name": "片库审计",
        "route": "/archive-health",
        "screenshot": "archive-health.png",
        "position": "资料完整度和媒体 URL 质量检查页。",
        "operations": [
            "进入片库审计，展示完整度指标。",
            "说明系统会检查海报、背景图、简介、演员、语言、片长等字段。",
            "强调它服务于资料长期维护。",
        ],
        "script": "片库审计用于检查电影资料是否完整可靠。系统会关注海报 URL、背景图 URL、简介、演员表、语言、片长等字段，帮助资料维护者发现缺失项和低质量资源。对于长期维护的个人电影资料馆来说，审计页面非常重要，因为它能把隐藏的数据质量问题变成可见的维护任务。",
        "details": [
            "片库审计体现资料维护意识。",
            "它和真实 URL 修复、媒体兜底逻辑关系密切。",
            "讲解时可以说它面向资料维护者和系统管理员。",
        ],
    },
    {
        "name": "关于页面",
        "route": "/about",
        "screenshot": "about.png",
        "position": "系统说明、技术栈、服务状态和数据管理入口。",
        "operations": [
            "进入关于页面，展示系统概况和技术栈。",
            "讲前后端分离架构、服务层、状态流和数据管理。",
            "展示最近消息、运行日志和数据导入导出入口。",
        ],
        "script": "最后是关于页面。这个页面不仅是说明页，还集中展示系统技术栈、模块总览、服务状态、最近消息和运行日志。CinemaFlow 采用 Angular 前端和 Flask REST API 后端的前后端分离架构。前端负责路由、组件、状态流和交互，后端负责电影和导演 API、跨域配置和数据持久化入口。关于页适合作为视频收尾，用来总结系统功能和架构设计。",
        "details": [
            "关于页可用于讲技术栈：Angular、Flask、RxJS、LocalStorage、REST API。",
            "数据管理区域通常也在这里展示。",
            "录制结尾建议在这里总结系统价值。",
        ],
    },
    {
        "name": "命令面板",
        "route": "Ctrl/Cmd + K",
        "screenshot": "command-palette.png",
        "position": "全局快速跳转和搜索入口。",
        "operations": [
            "点击顶部快速跳转，或按 Ctrl/Cmd + K。",
            "输入电影、导演或页面关键词。",
            "选择结果跳转到对应页面。",
        ],
        "script": "命令面板是全局效率工具。用户可以通过顶部快速跳转按钮，或者快捷键 Ctrl/Cmd + K 打开它，然后搜索页面、电影或导演。对于页面很多的系统来说，命令面板可以显著降低导航成本，让用户不必在侧边栏中反复查找入口。",
        "details": [
            "命令面板使用防抖搜索，避免每次输入都立即触发计算。",
            "它同时覆盖页面、电影和导演。",
            "录制时建议搜索一个页面名和一部电影名。",
        ],
    },
    {
        "name": "最近浏览区域",
        "route": "仪表盘 / 详情侧栏",
        "screenshot": "recent-history.png",
        "position": "跨页面恢复浏览上下文的辅助区域。",
        "operations": [
            "进入几部电影详情后返回仪表盘或详情页侧栏。",
            "展示最近浏览列表。",
            "点击最近浏览项回到对应电影。",
        ],
        "script": "最近浏览区域记录用户近期打开过的电影详情。它的价值在于帮助用户恢复浏览上下文，尤其是在搜索、推荐、对比和详情之间来回切换时，用户可以快速回到刚才看过的电影。这个功能虽然不是主页面，但对多页面系统的使用体验很重要。",
        "details": [
            "最近浏览由 RecentHistoryService 管理。",
            "详情页访问会写入浏览记录。",
            "它体现了系统对用户路径的记忆能力。",
        ],
    },
    {
        "name": "数据管理区域",
        "route": "关于页内",
        "screenshot": "data-management.png",
        "position": "导入导出、备份和恢复入口。",
        "operations": [
            "在关于页找到数据管理区域。",
            "展示可导出的数据类型：电影、影评、日志、计划、预设等。",
            "说明它用于备份、迁移和演示恢复。",
        ],
        "script": "数据管理区域提供导入和导出能力。系统可以导出片库、最近浏览、影评、待看片单、观影日志和智能选片预设等数据，也可以在需要时导入恢复。这个功能让 CinemaFlow 不只是一次性演示项目，而是具备资料迁移和备份意识的个人资料管理系统。",
        "details": [
            "数据管理通常放在关于页内。",
            "它服务于备份、迁移和课堂演示恢复。",
            "讲解时可以说明它和 LocalStorage 持久化配合使用。",
        ],
    },
]


ARCHITECTURE_SCRIPT = [
    "从架构上看，CinemaFlow 采用前后端分离设计。前端是 Angular 17 单页应用，负责页面路由、组件渲染、状态管理和交互体验；后端是 Flask REST API，负责电影和导演数据接口、健康检查、跨域配置和持久化入口。",
    "相比传统 Flask 单体 B/S 架构，前后端分离让页面交互更加灵活。Angular Router 可以管理仪表盘、电影库、详情子路由、导演库和多个分析页面；服务层使用 HttpClient、RxJS 和本地降级机制，保证后端可用时同步 API，后端不可用时仍能完成前端演示。",
    "系统的数据设计围绕电影、导演、类型、演员、用户状态、影评、待看片单、观影日志、媒体资源和审计日志展开。电影和导演是主数据，收藏、已看、个人评分和笔记属于用户电影状态，观影计划和观影日志则构成从想看到已看的完整闭环。",
]


DEPLOYMENT_SCRIPT = [
    "部署方面，CinemaFlow 已经发布到腾讯云 CloudBase 环境 constantine-d3gjhwmtz0336c36a。前端构建产物部署在 CloudBase 静态网站托管中，对外访问地址是 https://constantine-d3gjhwmtz0336c36a-1448158108.tcloudbaseapp.com。后端 Flask API 以 HTTP 云函数形式运行，函数名为 cinemaflow-api，对外 API 根地址是 https://constantine-d3gjhwmtz0336c36a.service.tcloudbase.com/api。",
    "前端没有把线上接口地址写死在页面组件里，而是通过 assets/runtime-config.js 这样的运行时配置指向真实 API。这样本地开发、测试环境和腾讯云线上环境可以使用不同接口地址，但 Angular 页面、服务层和组件逻辑保持一致。",
    "后端部署后通过 /api 路由转发到 CloudBase HTTP 云函数，并保留 /api/health 健康检查接口。当前线上环境已经验证首页、健康检查接口、电影接口和导演接口可以正常访问，说明前端静态资源、后端函数和云端路由已经连通。",
    "这种部署方式适合课程项目和轻量级展示：前端负责页面访问和用户交互，后端负责 API 服务和数据入口，分享时只需要发送前端网址。后续如果接入云数据库，可以继续由后端读取数据库连接配置，对外 API 地址保持稳定，前端不需要因为数据库变化而改动页面。",
]

OPENING_SCRIPT = (
    "大家好，我今天讲解的是 CinemaFlow 电影库管理系统。这个项目可以理解为对周末实验课内容的一次总结和升级，"
    "也是正式期末作业之前的一次完整预演。周末实验课主要帮助我们跑通 Web 系统的基本链路，包括页面展示、后端接口、"
    "数据组织和部署思路；而 CinemaFlow 在这个基础上，把单一示例扩展成了一个更完整的电影资料管理系统。"
    "它真正想解决的，不只是能不能展示电影资料，而是能不能把电影资料、个人观影记录和推荐分析连成一条长期可维护的链路。"
    "换句话说，它既是一个课程项目，也是一个面向真实使用方式的个人电影资料系统。对我来说，这个项目的重点并不是把页面堆多，"
    "而是把功能、数据和部署真正串起来，让它看起来像一个能长期使用的小型产品。接下来我会用大约十五分钟，"
    "从项目背景、核心功能、架构设计、线上部署和总结体会几个方面进行介绍。"
)

COURSE_CONTEXT_SCRIPT = [
    "首先说明项目定位。CinemaFlow 不是临时拼接的演示页面，而是把周末实验课里学到的知识点重新整理成一个完整业务系统。实验课解决的是如何把一个 Web 项目跑起来，这个项目进一步回答的是：如果要把它变成期末作业级别的系统，应该怎样组织功能、接口、数据和部署。周末实验课里我们更多是在拼出一条最小可运行链路，而这里则要把它整理成一个真正能汇报、能部署、能扩展的系统。",
    "从课程关系上看，它承担两个作用。第一，它是周末实验课的总结，把 Flask 后端、前端页面、接口调用、数据维护这些内容串成一条完整链路。第二，它是期末作业的预演，提前验证了前后端分离、云端部署、系统汇报和演示讲解这些环节是否能顺利跑通。也就是说，这个项目不只是做出来，还要考虑讲得清、看得懂、以后还能继续加功能。",
    "更重要的是，它把课内练习和期末作业之间的距离提前补上，让我们在正式提交之前就经历一次系统完整度的检查。这样一来，路由是否清楚、模块是否分明、接口是否稳定、部署是否可用，都能提前暴露并修正。",
    "如果把它当成一次产品预演来看，它还有一个很实际的意义：你能用它检查自己是不是已经具备了从需求、开发、联调到上线的完整思路。对课程项目来说，这一点往往比单纯做出几个页面更重要。",
]

TEN_MINUTE_FEATURE_SCRIPT = [
    "功能上，系统围绕电影资料馆这个主题展开。首页仪表盘用于快速了解片库规模、已观看数量、收藏数量和平均评分，让用户进入系统后先看到整体情况。它的作用不只是展示数字，还在于把整个系统的健康状态和入口路径放在最前面，方便用户迅速理解这是一个怎样的电影管理平台。换句话说，仪表盘既是首页，也是导航中心。",
    "电影库是最核心的管理入口。用户可以浏览电影列表，按名称、导演、类型、观看状态和收藏状态进行筛选，也可以进入电影详情查看海报、背景图、评分、导演、类型、演员和简介。添加电影页面负责补充资料，并通过编辑模式控制维护入口，避免普通浏览时误操作。这样做的好处是，浏览、维护和细节查看被清晰地分开，整个资料链路更像一个真正的个人资料系统。这里体现的是一种很实用的设计：先让用户看，再让用户改，最后让用户在详情里确认。",
    "导演模块把电影资料从作品维度扩展到作者维度。导演列表和导演详情可以展示导演档案、创作风格和代表作品，帮助用户理解电影和导演之间的关系，而不是只看到孤立的电影条目。对于电影资料馆来说，导演不是一个附属字段，而是帮助用户建立作品理解路径的重要入口。很多时候，一个人喜欢的不是某一部电影，而是某一位导演的风格，这个模块就是在把这种偏好显性化。",
    "观影管理模块负责记录用户行为，包括收藏、待看片单、观影日志、观影日历和影评墙。这里的重点是把'想看什么'、'看过什么'、'怎么看的'记录下来，让系统从静态资料展示变成个人观影记录工具。收藏更像是兴趣标记，待看片单更像是计划，观影日志记录真实发生，影评墙则沉淀主观判断，这几个模块合在一起才形成用户行为闭环。也就是说，这个系统不是只会告诉你电影是什么，还会记住你和电影之间发生过什么。",
    "推荐和分析模块体现系统的升级部分，包括随机选片、智能选片、电影对比、时间线、导演图谱、情绪图谱、连看规划、偏好画像和片库审计。它们的共同目标是让电影数据产生价值：既能帮助用户决定下一部看什么，也能反过来检查片库资料是否完整。随机选片解决临时决定，智能选片解决条件筛选，对比页面解决犹豫选择，时间线和图谱则把数据变成更直观的观察结果。这里最有意思的是，系统从“展示内容”变成了“辅助决策”。",
    "除此之外，系统还有一些辅助但很实用的页面，比如命令面板、最近浏览和数据管理。命令面板适合快速跳转，最近浏览能恢复上下文，数据管理则方便备份和恢复。这些模块看起来不算最核心，但它们让整个系统更像一个完整工具，而不是单纯的展示站点。",
    "从整体上看，这些功能不是孤立堆砌的，而是从资料管理延伸到行为记录，再延伸到推荐分析。也正因为这样，CinemaFlow 不是一个只会展示海报的页面集合，而是一个能够持续积累数据、逐步理解用户偏好的电影资料系统。它的每个模块都在为同一件事服务：把电影从静态信息变成可运营、可维护、可分析的个人资产。",
]

TEN_MINUTE_ARCHITECTURE_SCRIPT = [
    "架构上，CinemaFlow 采用前后端分离。前端使用 Angular，负责路由、页面组件、服务层、状态组合和用户交互；后端使用 Flask REST API，负责电影、导演和健康检查接口。这样前端可以专注体验，后端可以专注数据和业务接口。把页面层和接口层拆开之后，系统的职责边界会更清楚，后面扩展功能也更自然。",
    "相比传统 Flask 单体 B/S 架构，前后端分离的好处是边界更清楚。页面路由、表单交互和状态流放在 Angular 中，API 和持久化入口放在 Flask 中。前端这边可以通过路由管理仪表盘、详情子路由和编辑入口，通过服务层统一封装 HttpClient 调用，再用 RxJS 组合多个数据源形成页面视图，这样页面不会直接和接口细节纠缠在一起。对用户来说，看到的是更顺滑的体验；对开发者来说，维护起来也更轻松。",
    "前端服务层的设计也很关键。像电影、导演、观影日志、智能选片这些功能都可以拆成独立服务，再在页面层组合成最终视图。这样做不是为了显得复杂，而是为了让每个页面都只负责展示和交互，真正的数据请求、状态合并和错误处理交给服务层处理。对于一个页面很多的系统来说，这种拆法非常重要。",
    "后端这边使用 Flask Blueprint 组织不同模块，电影、导演和健康检查接口相互独立，便于单独调试和维护。`/api` 作为统一入口，既方便前端调用，也方便部署时把 HTTP 云函数和静态网站托管拼接起来。这样做的结果是，前端和后端可以独立演进，接口问题、页面问题和部署问题也更容易定位。后端保持简单清晰，也更适合课程项目和后续小规模扩展。",
    "数据设计围绕电影、导演、演员、类型、用户状态、影评、待看片单、观影日志和媒体资源展开。电影和导演是主数据，收藏、已看、评分、日志和计划是用户行为数据，审计功能则用于检查海报、背景图、简介和演员表等资料是否完整。换句话说，系统既有静态资料结构，也有动态行为结构，两者合在一起才构成完整的电影资料馆。",
    "如果后续继续扩展数据库或登录体系，这种架构也比较稳妥，因为前端只关心接口返回，后端只关心数据和权限。这样，系统就不会因为某一个模块变化而牵一发动全身。也正因为它边界清楚，所以这个项目很适合作为期末作业的底座。",
]

TEN_MINUTE_DEPLOYMENT_SCRIPT = [
    "部署方面，项目已经发布到腾讯云 CloudBase。前端部署在静态网站托管中，访问地址是 https://constantine-d3gjhwmtz0336c36a-1448158108.tcloudbaseapp.com。后端 Flask API 以 HTTP 云函数方式运行，API 地址是 https://constantine-d3gjhwmtz0336c36a.service.tcloudbase.com/api。这样前端和后端虽然在同一个云环境里，但职责仍然分开，一个负责界面，一个负责接口。",
    "前端通过运行时配置指向线上 API，后端通过 /api 路由提供服务，并保留 /api/health 健康检查接口。这样部署后可以直接通过公网网址分享项目，也能验证前端、后端和云端路由是否真正连通。对汇报来说，这个设计的好处是演示时只需要打开一个前端链接，所有页面就能顺着走下去，不需要在现场切来切去地解释环境。",
    "从维护角度看，前端和后端也可以分开更新：如果只是改页面样式或文案，重发静态站点就行；如果只是改后端接口或逻辑，重新发布云函数即可。这样以后无论是继续接入数据库，还是增加新的页面模块，迭代都会比较顺。这个分离方式也很适合多人协作，因为前端和后端几乎可以并行推进。",
    "如果以后要在同一个腾讯云环境里再放一个项目，也可以通过不同路径或不同子域名来区分，避免和当前 CinemaFlow 的分享地址冲突。对课程项目来说，这种部署方式有一个很大的好处，就是很适合做阶段性演示和快速迭代。",
]

CLOSING_SCRIPT = (
    "总结一下，CinemaFlow 的意义不只是完成一个电影库页面，而是把周末实验课中的技术点升级成一个可演示、可部署、有业务闭环的系统。它覆盖了资料管理、观影记录、推荐分析、数据审计、前后端分离和腾讯云部署等环节，也提前演练了期末作业需要面对的系统设计、功能组织、部署上线和汇报表达。"
    "对我来说，这个项目最有价值的地方在于，它不是把课上学过的东西原样搬出来，而是把零散的练习重新组织成一次完整交付。这样在真正面对期末作业时，至少已经经历过一次从需求、页面、接口到部署的完整流程。"
    "也正因为这样，它不仅是一次展示，更是一套可以继续生长的基础。后续如果继续完善，可以接入真实数据库、加入登录权限、增加更多数据校验和后台管理能力，让它从课程项目进一步接近真实应用。以上就是 CinemaFlow 电影库管理系统的讲解。"
)


def build_pdf() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=16 * mm,
        title="CinemaFlow 讲解视频讲稿",
        author="CinemaFlow",
    )

    story = []

    story.append(Spacer(1, 35 * mm))
    story.append(p("CinemaFlow 电影库管理系统", "CFTitle"))
    story.append(p("快语速扩展讲解稿", "CFTitle"))
    story.append(p("适用于课程汇报、期末作业预演、系统演示和录屏旁白", "CFSubTitle"))
    story.append(Spacer(1, 8 * mm))
    story.append(
        make_table(
            [
                ["项目", "内容"],
                ["系统类型", "私人电影资料馆与观影管理系统"],
                ["推荐时长", "15 分钟左右（快语速）"],
                ["线上入口", "https://constantine-d3gjhwmtz0336c36a-1448158108.tcloudbaseapp.com"],
                ["后端 API", "https://constantine-d3gjhwmtz0336c36a.service.tcloudbase.com/api"],
                ["文档用途", "周末实验课总结、期末作业预演和系统汇报"],
            ],
            [3.4 * cm, 11.5 * cm],
        )
    )
    story.append(PageBreak())

    story.append(p("一、录制前准备", "CFHeading1"))
    story.append(
        numbered(
            [
                "使用浏览器打开根网址，不要直接从地址栏输入子路由；如果要进入子页面，优先从系统内部导航进入。",
                "浏览器缩放建议设为 90% 或 100%，窗口保持 1440px 以上宽度，避免侧栏和卡片布局被压缩。",
                "录制前先点击顶部“进入编辑”，这样添加电影页面可以正常打开。",
                "讲解顺序建议固定为：项目定位、核心功能、架构与部署、结尾总结。",
            ]
        )
    )

    story.append(p("二、连续讲解总稿", "CFHeading1"))
    story.append(p("下面这段可以直接照着读，整体控制在十五分钟左右。", "CFBody"))
    story.append(p(OPENING_SCRIPT, "CFQuote"))
    story.append(p("项目定位与课程关系", "CFHeading2"))
    for text in COURSE_CONTEXT_SCRIPT:
        story.append(p(text, "CFQuote"))
    story.append(p("核心功能串讲", "CFHeading2"))
    for text in TEN_MINUTE_FEATURE_SCRIPT:
        story.append(p(text, "CFQuote"))
    story.append(p("架构与腾讯云部署", "CFHeading2"))
    for text in TEN_MINUTE_ARCHITECTURE_SCRIPT:
        story.append(p(text, "CFQuote"))
    for text in TEN_MINUTE_DEPLOYMENT_SCRIPT:
        story.append(p(text, "CFQuote"))
    story.append(PageBreak())

    story.append(p("三、结尾总结稿", "CFHeading1"))
    story.append(p(CLOSING_SCRIPT, "CFQuote"))

    def draw_page(canvas, document):
        canvas.saveState()
        canvas.setFont(FONT_REGULAR, 8)
        canvas.setFillColor(colors.HexColor("#64748b"))
        canvas.drawString(18 * mm, 10 * mm, "CinemaFlow 电影库管理系统讲解视频讲稿")
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"第 {document.page} 页")
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)


def build_markdown() -> None:
    opening = OPENING_SCRIPT
    lines = [
        "# CinemaFlow 电影库管理系统快语速扩展讲解稿",
        "",
        "## 录制前准备",
        "",
        "- 打开根网址：https://constantine-d3gjhwmtz0336c36a-1448158108.tcloudbaseapp.com",
        "- 浏览器缩放建议 90% 或 100%。",
        "- 录制前点击“进入编辑”，方便演示添加电影页面。",
        "- 讲解顺序建议固定为：项目定位、核心功能、架构与部署、结尾总结。",
        "",
        "## 连续讲解总稿",
        "",
        opening,
        "",
        "### 项目定位与课程关系",
        "",
    ]

    for text in COURSE_CONTEXT_SCRIPT:
        lines.extend([text, ""])

    lines.extend(["### 核心功能串讲", ""])
    for text in TEN_MINUTE_FEATURE_SCRIPT:
        lines.extend([text, ""])

    lines.extend(["### 架构与腾讯云部署", ""])
    for text in TEN_MINUTE_ARCHITECTURE_SCRIPT:
        lines.extend([text, ""])
    for text in TEN_MINUTE_DEPLOYMENT_SCRIPT:
        lines.extend([text, ""])

    lines.extend(["## 结尾总结稿", "", CLOSING_SCRIPT])
    MD_PATH.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    build_markdown()
    build_pdf()
    print(PDF_PATH)
    print(MD_PATH)
