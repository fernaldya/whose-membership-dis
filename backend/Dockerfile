FROM ghcr.io/astral-sh/uv:0.11.14-python3.13-trixie

WORKDIR /app/wmd

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY app/ ./app/

RUN mkdir -p uploads && \
    groupadd -r wmd && \
    useradd -r -g wmd -u 1001 -m wmd && \
    chown -R wmd:wmd /app/wmd

USER wmd

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
