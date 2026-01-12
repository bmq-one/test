FROM node:20-alpine as builder

WORKDIR /app

# Installiere Abhängigkeiten
COPY package.json ./
RUN npm install

# Kopiere den Code und baue
COPY . .
RUN npm run build

# Production Stage
FROM nginx:alpine

# Kopiere die gebaute App
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx-Konfiguration für SPA
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://backend:8000; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
