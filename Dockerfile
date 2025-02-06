FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock yarn.lock index.html ./
COPY public ./public
COPY server ./server
COPY src ./src
RUN bun install --frozen-lockfile
RUN bun run build

FROM alpine:latest 
RUN apk --no-cache add ca-certificates nodejs
WORKDIR /usr/src/app
COPY --from=builder /app/dist ./
EXPOSE 12306
VOLUME /usr/src/app/data
CMD ["/usr/bin/node", "index.mjs"]
