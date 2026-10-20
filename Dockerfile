FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production
# The container is behind the deployment's immediate ingress proxy.
ENV TRUST_PROXY=1
WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/server ./server

RUN mkdir -p /app/.data && chown node:node /app/.data

USER node
EXPOSE 3000

CMD ["npm", "start"]
