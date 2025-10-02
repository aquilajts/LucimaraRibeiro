FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

WORKDIR /app

# dependências do SO (ajuste se precisar)
RUN apt-get update && apt-get install -y build-essential --no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# usar gunicorn para produção (supondo que seu app seja 'lele:app')
CMD ["gunicorn", "-b", "0.0.0.0:8080", "lele:app", "--workers", "2", "--threads", "4"]
