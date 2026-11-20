# Đảo Đèn Lồng — bản chạy được dạng Docker:
#   docker build -t dao-den-long .
#   docker run --rm -p 8080:8080 -v ddl-data:/app/data dao-den-long      # rồi mở http://localhost:8080
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY src ./src
COPY web ./web
ENV PORT=8080
EXPOSE 8080
VOLUME /app/data
CMD ["node", "server.js"]
