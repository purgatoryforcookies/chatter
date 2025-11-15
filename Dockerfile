FROM node:22-alpine AS backend

WORKDIR /app

COPY server server
COPY types.ts .

WORKDIR /app/server
RUN npm ci
RUN npm run build

FROM node:22-alpine AS frontend
ARG VITE_AUTH_DOMAIN
ARG VITE_AUTH_CLIENT_ID

WORKDIR /app

COPY client client
COPY types.ts .

WORKDIR /app/client
RUN npm ci
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production

WORKDIR /app

COPY --from=backend /app/server/package*.json .
RUN npm ci
COPY --from=backend /app/server/dist /app/dist
COPY --from=frontend /app/client/dist /app/dist/server/client

USER node

CMD [ "node", "dist/server/main.js" ]
# CMD [ "sleep", "infinity" ]






