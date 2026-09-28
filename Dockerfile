FROM node:22-alpine

# The app shells out to git for every API call.
RUN apk add --no-cache git

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js ./
COPY public ./public

# Run as the unprivileged "node" user; it needs to own /app because
# POST /api/add appends to test.txt in the working directory.
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production \
    PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ >/dev/null || exit 1

CMD ["node", "server.js"]
