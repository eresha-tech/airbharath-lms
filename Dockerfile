# Build with the repository's pinned pnpm first. No dependency installation or
# migrations occur in this runtime image. This is the locally verified base.
FROM node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee
ARG STANDALONE_APP_PATH=.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --chown=node:node .next/standalone/ ./
COPY --chown=node:node .next/static/ ${STANDALONE_APP_PATH}/.next/static/
COPY --chown=node:node public/ ${STANDALONE_APP_PATH}/public/
COPY --chown=node:node .next/workers/worker.cjs ${STANDALONE_APP_PATH}/worker.cjs
USER node
WORKDIR /app/${STANDALONE_APP_PATH}
EXPOSE 3000
CMD ["node", "server.js"]
