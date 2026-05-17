FROM ghcr.io/astral-sh/uv:python3.14-slim

WORKDIR /app/wmd

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY app/ ./app/

RUN mkdir -p uploads

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
