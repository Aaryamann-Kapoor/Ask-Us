import os
import io
import json
import traceback
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# ── Gemini API Key ────────────────────────────────────────────────────────────
GEMINI_API_KEY = "AIzaSyC1G0-erA4Usq5fepkgWCy1a28jUdef_iM"
genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="Ask-Us API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory store ──────────────────────────────────────────────────────────
store: dict = {"df": None, "source": "sample", "uploaded_df": None, "uploaded_name": None}

# ── Sample YouTube dataset ───────────────────────────────────────────────────
SAMPLE_DATA = {
    "timestamp": [
        "2024-01-05","2024-01-12","2024-02-03","2024-02-18","2024-03-07",
        "2024-03-21","2024-04-02","2024-04-15","2024-05-09","2024-05-22",
        "2024-06-01","2024-06-14","2024-07-03","2024-07-19","2024-08-05",
        "2024-08-20","2024-09-04","2024-09-17","2024-10-01","2024-10-15",
        "2024-11-02","2024-11-18","2024-12-03","2024-12-20","2024-01-08",
        "2024-02-11","2024-03-15","2024-04-22","2024-05-30","2024-06-18",
        "2024-07-25","2024-08-12","2024-09-28","2024-10-10","2024-11-25",
        "2024-12-15","2024-01-20","2024-02-28","2024-03-30","2024-04-08",
    ],
    "video_id": [f"vid_{i:04d}" for i in range(40)],
    "category": [
        "Tech Reviews","Gaming","Education","Vlogs","Tech Reviews",
        "Gaming","Music","Education","Tech Reviews","Vlogs",
        "Gaming","Music","Education","Tech Reviews","Vlogs",
        "Gaming","Tech Reviews","Music","Education","Gaming",
        "Vlogs","Tech Reviews","Music","Gaming","Education",
        "Vlogs","Tech Reviews","Gaming","Music","Education",
        "Tech Reviews","Vlogs","Gaming","Music","Education",
        "Tech Reviews","Gaming","Vlogs","Music","Education",
    ],
    "language": [
        "English","Hindi","English","Hindi","English",
        "Telugu","English","Hindi","English","Telugu",
        "Hindi","English","Telugu","English","Hindi",
        "English","Hindi","Telugu","English","Hindi",
        "English","Telugu","Hindi","English","Telugu",
        "Hindi","English","Telugu","Hindi","English",
        "Telugu","English","Hindi","English","Telugu",
        "Hindi","English","Telugu","English","Hindi",
    ],
    "region": [
        "India","India","USA","India","India",
        "India","USA","India","USA","India",
        "India","USA","India","USA","India",
        "USA","India","India","USA","India",
        "India","USA","India","USA","India",
        "India","USA","India","USA","USA",
        "India","India","USA","USA","India",
        "India","USA","India","USA","India",
    ],
    "duration_sec": [
        612,1845,920,480,543,2100,210,1350,780,390,
        1620,240,1080,654,510,1920,720,330,1440,1710,
        420,690,270,1530,990,450,660,1800,225,1260,
        750,480,1680,300,1110,840,1980,555,195,1380,
    ],
    "views": [
        1200000,850000,430000,220000,980000,1500000,95000,560000,1100000,310000,
        720000,88000,490000,1300000,270000,1650000,940000,74000,610000,1420000,
        380000,1050000,67000,1280000,520000,290000,1150000,1750000,82000,670000,
        870000,340000,1580000,91000,730000,960000,1900000,410000,79000,1480000,
    ],
    "likes": [
        85000,62000,28000,14000,71000,108000,7200,39000,79000,21000,
        51000,6500,35000,94000,18000,119000,68000,5400,44000,103000,
        26000,76000,5100,92000,37000,20000,83000,126000,6100,48000,
        62000,24000,114000,6800,52000,69000,137000,29000,5800,107000,
    ],
    "comments": [
        12400,9800,4200,2100,10500,16200,980,5800,11600,3100,
        7600,950,5200,13800,2700,17500,10100,820,6500,15300,
        3900,11200,760,13600,5500,3000,12300,18700,910,7100,
        9200,3600,16800,1010,7700,10200,20300,4300,860,15800,
    ],
    "shares": [
        5200,3800,1600,800,4300,6700,380,2200,4700,1200,
        3100,370,2000,5600,1050,7200,4100,310,2500,6200,
        1500,4500,290,5500,2100,1150,5000,7600,350,2900,
        3700,1400,6800,390,3100,4100,8200,1700,330,6400,
    ],
    "sentiment_score": [
        0.82,0.75,0.91,0.68,0.88,0.79,0.63,0.85,0.84,0.72,
        0.77,0.69,0.87,0.86,0.71,0.81,0.89,0.64,0.83,0.78,
        0.73,0.85,0.66,0.80,0.88,0.70,0.87,0.82,0.65,0.84,
        0.76,0.74,0.79,0.67,0.86,0.83,0.81,0.72,0.68,0.85,
    ],
    "ads_enabled": [
        True,True,False,True,True,True,False,True,True,False,
        True,False,True,True,True,True,True,False,True,True,
        False,True,False,True,True,True,True,True,False,True,
        True,False,True,False,True,True,True,True,False,True,
    ],
}

def get_sample_df() -> pd.DataFrame:
    df = pd.DataFrame(SAMPLE_DATA)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["month"] = df["timestamp"].dt.to_period("M").astype(str)
    return df

def get_default_df() -> pd.DataFrame:
    if store["uploaded_df"] is not None:
        return store["uploaded_df"].copy()
    return get_sample_df()

store["df"] = get_default_df()

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """
You are Ask-Us, a world-class data analyst AI for YouTube content creation data.
Given a pandas DataFrame schema and a natural-language query, produce a UNIQUE dashboard
that directly answers the specific query asked.

STRICT RULES:
1. Return ONLY a valid JSON object. No markdown fences, no prose outside JSON.
2. NEVER hallucinate numbers - use ONLY real column names from the schema provided.
3. Every query must produce DIFFERENT charts tailored to what was asked.
4. Always return 2-4 charts that specifically answer the query.
5. If query is impossible return {"error": "clear reason"}

CHART SELECTION RULES (follow strictly based on query):
- Query mentions "trend", "over time", "monthly", "growth" -> use "line" chart
- Query mentions "compare", "vs", "difference", "which is best" -> use "bar" chart
- Query mentions "share", "proportion", "percentage", "distribution" -> use "pie" or "doughnut"
- Query mentions "relationship", "correlation", "scatter" -> use "scatter"
- Query mentions specific filter like "India only", "Gaming only" -> FILTER the data first
- Query mentions specific metric like "likes", "comments", "sentiment" -> use THAT metric
- Query mentions "top N" -> show only top N items
- Mix chart types for richer dashboards (e.g. bar + line + pie)

QUERY-SPECIFIC EXAMPLES:
- "monthly views trend" -> line chart of views over months
- "compare likes by category" -> bar chart of avg likes per category
- "sentiment by region" -> bar chart of avg sentiment per region + pie of region distribution
- "ads enabled videos" -> filter ads_enabled==True, then show metrics
- "top 5 by views" -> bar chart of top 5 videos by views
- "engagement rate" -> calculate likes/views ratio per category

Return EXACTLY this JSON:
{
  "charts": [
    {
      "type": "bar" | "line" | "pie" | "doughnut" | "scatter",
      "title": "Specific title matching the query",
      "labels": ["A","B","C"],
      "datasets": [
        { "label": "Series name", "data": [1,2,3], "color": "#FF0000" }
      ],
      "x_label": "X Axis Label",
      "y_label": "Y Axis Label"
    }
  ],
  "insights": ["🔥 specific insight about query result 1", "📈 insight 2", "💡 insight 3"]
}

Colors: #FF0000 #FF4500 #FFA500 #FFD700 #00C6FF #7B2FFF #00E676 #FF6B6B #4ECDC4
Insights: exactly 3 strings, each starting with an emoji, directly related to query results.
IMPORTANT: Each query MUST produce charts with different titles, different data, different chart types.
"""

def build_prompt(df: pd.DataFrame, query: str, follow_up: bool) -> str:
    schema = df.dtypes.to_string()
    sample = df.head(8).to_string(index=False)
    stats  = df.describe(include="all").iloc[:4].to_string()
    cats   = {col: df[col].unique().tolist()[:10] for col in df.select_dtypes('object').columns}
    pfx    = "FOLLOW-UP (refine/filter the previous dashboard): " if follow_up else "NEW QUERY: "
    return (
        f"Available columns: {list(df.columns)}\n\n"
        f"Schema:\n{schema}\n\n"
        f"Unique values in categorical columns: {cats}\n\n"
        f"Sample rows:\n{sample}\n\n"
        f"Stats:\n{stats}\n\n"
        f"{pfx}{query}\n\n"
        f"IMPORTANT: Produce charts that SPECIFICALLY answer this query. "
        f"Use the exact metrics and filters mentioned in the query."
    )

def _smart_fallback(df: pd.DataFrame, query: str) -> dict:
    """Query-aware fallback that works with ANY CSV structure."""
    q        = query.lower()
    cols     = df.columns.tolist()
    num_cols = df.select_dtypes(include='number').columns.tolist()
    cat_cols = df.select_dtypes(include='object').columns.tolist()
    charts   = []

    # ── Safely pick metric (must exist in dataframe) ──────────────────────────
    metric = None
    for m in ["views", "likes", "comments", "shares", "sentiment_score", "duration_sec"]:
        if m in cols:
            metric = m
            break
    # if none of the preferred ones exist, just take first numeric
    if metric is None and num_cols:
        metric = num_cols[0]

    # override with query-mentioned metric if it exists in df
    for m in num_cols:
        if m.replace("_", " ") in q or m in q:
            metric = m
            break

    # ── Safely pick group column ──────────────────────────────────────────────
    group = None
    for g in ["category", "region", "language", "ads_enabled"]:
        if g in cols:
            group = g
            break
    # override with query-mentioned group if it exists in df
    for g in cat_cols:
        if g.replace("_", " ") in q or g in q:
            group = g
            break
    if group is None and cat_cols:
        group = cat_cols[0]

    # ── Apply filters from query ──────────────────────────────────────────────
    dff = df.copy()
    if "region" in cols:
        for region in ["india", "usa"]:
            if region in q:
                dff = dff[dff["region"].str.lower() == region]
    if "category" in cols:
        for cat in ["tech reviews", "gaming", "education", "vlogs", "music"]:
            if cat in q:
                dff = dff[dff["category"].str.lower() == cat]
    if "ads_enabled" in cols and "ads" in q:
        if "enabled" in q or "true" in q:
            dff = dff[dff["ads_enabled"] == True]
        elif "disabled" in q or "false" in q:
            dff = dff[dff["ads_enabled"] == False]

    # safety: if filter removed everything, use full df
    if len(dff) == 0:
        dff = df.copy()

    # ── Build charts only if metric and group are valid ───────────────────────
    if metric and group and metric in dff.columns and group in dff.columns:

        # Chart 1: main grouped bar
        grp = dff.groupby(group)[metric].sum().sort_values(ascending=False)
        charts.append({
            "type": "bar",
            "title": f"{metric.replace('_',' ').title()} by {group.title()}",
            "labels": [str(x) for x in grp.index.tolist()],
            "datasets": [{"label": metric.replace("_"," ").title(),
                          "data": [round(float(x), 2) for x in grp.values],
                          "color": "#FF0000"}],
            "x_label": group.title(), "y_label": metric.replace("_"," ").title(),
        })

        # Chart 2: line over time if time col exists
        for tc in ["month", "timestamp", "date"]:
            if tc in dff.columns:
                try:
                    dff["_m"] = pd.to_datetime(dff[tc], errors="coerce").dt.to_period("M").astype(str)
                    mon = dff.groupby("_m")[metric].sum().sort_index()
                    if len(mon) > 1:
                        charts.append({
                            "type": "line",
                            "title": f"Monthly {metric.replace('_',' ').title()} Trend",
                            "labels": mon.index.tolist(),
                            "datasets": [{"label": metric.replace("_"," ").title(),
                                          "data": [round(float(x), 2) for x in mon.values],
                                          "color": "#FF4500"}],
                            "x_label": "Month", "y_label": metric.replace("_"," ").title(),
                        })
                except:
                    pass
                break

        # Chart 3: pie / doughnut
        grp2 = dff.groupby(group)[metric].sum()
        charts.append({
            "type": "pie",
            "title": f"{metric.replace('_',' ').title()} Share by {group.title()}",
            "labels": [str(x) for x in grp2.index.tolist()],
            "datasets": [{"label": "Share",
                          "data": [round(float(x), 2) for x in grp2.values],
                          "color": "#FFA500"}],
            "x_label": "", "y_label": "",
        })

        # Chart 4: second numeric metric if available
        second = [c for c in num_cols if c != metric and c in dff.columns]
        if second:
            grp3 = dff.groupby(group)[second[0]].sum().sort_values(ascending=False)
            charts.append({
                "type": "bar",
                "title": f"{second[0].replace('_',' ').title()} by {group.title()}",
                "labels": [str(x) for x in grp3.index.tolist()],
                "datasets": [{"label": second[0].replace("_"," ").title(),
                              "data": [round(float(x), 2) for x in grp3.values],
                              "color": "#00C6FF"}],
                "x_label": group.title(), "y_label": second[0].replace("_"," ").title(),
            })

    elif metric and metric in dff.columns:
        # no group col — just show metric stats
        charts.append({
            "type": "bar",
            "title": f"Total {metric.replace('_',' ').title()}",
            "labels": [metric.replace("_"," ").title()],
            "datasets": [{"label": "Total",
                          "data": [round(float(dff[metric].sum()), 2)],
                          "color": "#FF0000"}],
            "x_label": "", "y_label": metric.replace("_"," ").title(),
        })

    else:
        # absolute fallback — row count only
        charts.append({
            "type": "bar",
            "title": "Dataset Row Count",
            "labels": ["Total Rows"],
            "datasets": [{"label": "Rows", "data": [len(dff)], "color": "#FF0000"}],
            "x_label": "", "y_label": "Count",
        })

    # ── Insights ──────────────────────────────────────────────────────────────
    m_label = metric.replace("_"," ").title() if metric else "Rows"
    total   = round(float(dff[metric].sum()), 2) if metric and metric in dff.columns else len(dff)
    avg_m   = round(float(dff[metric].mean()), 2) if metric and metric in dff.columns else 0
    top     = str(dff[group].value_counts().index[0]) if group and group in dff.columns and len(dff) > 0 else "N/A"

    return {
        "charts": charts[:4],
        "insights": [
            f"📊 Total {m_label}: {total:,} across {len(dff):,} rows",
            f"🏆 Top {group.replace('_',' ').title() if group else 'Entry'}: {top}",
            f"📈 Average {m_label} per row: {avg_m:,}",
        ],
    }


def execute_query(df: pd.DataFrame, query: str, follow_up: bool) -> dict:
    model_names = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro",
        "gemini-pro",
    ]
    for model_name in model_names:
        try:
            model    = genai.GenerativeModel(model_name, system_instruction=SYSTEM_PROMPT)
            prompt   = build_prompt(df, query, follow_up)
            response = model.generate_content(prompt)
            raw      = response.text.strip()

            if "```" in raw:
                parts = raw.split("```")
                raw = parts[1] if len(parts) > 1 else raw
                if raw.startswith("json"):
                    raw = raw[4:]
            raw = raw.strip()

            result = json.loads(raw)
            print(f"✅ Gemini success: {model_name}")
            return result
        except Exception as e:
            print(f"❌ Model {model_name} failed: {e}")
            continue

    print("⚠️ All Gemini models failed — using smart query-aware fallback")
    return _smart_fallback(df, query)

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Ask-Us API is live"}

@app.get("/health")
def health():
    src = store["uploaded_name"] if store["uploaded_name"] else "sample"
    return {
        "ok": True,
        "rows": len(store["df"]) if store["df"] is not None else 0,
        "source": src,
        "gemini_configured": True,
        "using_uploaded": store["uploaded_df"] is not None,
    }

@app.get("/list-models")
def list_models():
    """Debug endpoint to see available Gemini models."""
    try:
        models = [m.name for m in genai.list_models()
                  if "generateContent" in m.supported_generation_methods]
        return {"available_models": models}
    except Exception as e:
        return {"error": str(e)}

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only .csv files are accepted.")
    raw_bytes = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(raw_bytes))
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
            df["month"] = df["timestamp"].dt.to_period("M").astype(str)
        store["df"]            = df
        store["uploaded_df"]   = df.copy()
        store["uploaded_name"] = file.filename
        store["source"]        = f"upload:{file.filename}"
        return {
            "message": f"✅ '{file.filename}' is now the default — {len(df):,} rows x {len(df.columns)} cols",
            "columns": df.columns.tolist(),
            "rows": len(df),
        }
    except Exception as exc:
        raise HTTPException(400, f"CSV parse error: {exc}")

class QueryRequest(BaseModel):
    query:     str
    follow_up: bool = False

@app.post("/query")
def query_data(req: QueryRequest):
    if store["df"] is None:
        raise HTTPException(400, "No dataset loaded.")
    if not req.query.strip():
        raise HTTPException(400, "Query is empty.")
    try:
        result = execute_query(store["df"], req.query, req.follow_up)
        if "error" in result:
            raise HTTPException(422, result["error"])
        return result
    except HTTPException:
        raise
    except json.JSONDecodeError as exc:
        raise HTTPException(500, f"Gemini returned malformed JSON: {exc}")
    except Exception as exc:
        raise HTTPException(500, f"Unexpected error: {exc}\n{traceback.format_exc()}")

@app.post("/reset")
def reset():
    store["df"] = get_default_df()
    store["source"] = store["uploaded_name"] if store["uploaded_name"] else "sample"
    label = store["uploaded_name"] if store["uploaded_name"] else "built-in sample data"
    return {"message": f"Reset to {label}"}