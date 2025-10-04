# LR/Dockerfile
FROM python:3.11-slim

# Variáveis de ambiente
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Instala apenas dependências essenciais
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

# Copia e instala dependências primeiro (para usar cache de camadas)
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copia o restante do projeto
COPY . .

# Exponha a porta
EXPOSE 8080

# Inicia o app com Gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app", "--workers=2", "--threads=4"]
