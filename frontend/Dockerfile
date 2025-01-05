# linux/amd64 플랫폼 명시
FROM --platform=linux/amd64 node:20-slim

WORKDIR /app

COPY package*.json ./

# 의존성 설치
RUN npm install && \
    npm install -D @vitejs/plugin-react vite

COPY . .

# Vite의 호스트 설정 추가
ENV VITE_API_URL=http://backend:8000

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"] 