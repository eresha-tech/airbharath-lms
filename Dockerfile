# Fresh standalone application/worker artifacts only; no old /app tree is reused.
FROM docker.io/library/node:22-trixie-slim@sha256:9ae0ccefe9959b44ae8325ba2099ec77d670e8edfce3770d364d425fc1df7d87
# Install the documented Trixie security fix; do not change distribution or application dependencies.
RUN apt-get update \
 && apt-get install -y --no-install-recommends --only-upgrade libzstd1=1.5.7+dfsg-1+deb13u1 \
 && rm -rf /var/lib/apt/lists/*
# No Node package-manager, login or mount tools are needed by the final runtime.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-* /usr/share/locale \
 && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg \
          /usr/bin/mount /usr/bin/umount /usr/bin/su /usr/bin/unshare /usr/bin/nsenter \
          /usr/bin/chsh /usr/bin/chfn /usr/bin/newgrp /usr/bin/passwd /usr/bin/gpasswd \
 && find / -xdev -type f -perm /6000 -exec chmod a-s {} + \
 && test -x /usr/local/bin/node
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    LANG=C.UTF-8 LC_ALL=C.UTF-8 LANGUAGE=C.UTF-8
ARG STANDALONE_APP_PATH=.
ARG SECURITY_PATCH_SHA256
LABEL org.opencontainers.image.revision="cf49ddc5d7a10f34b8a646a5e14903784c8c6abc" airbharath.source.patch.sha256="${SECURITY_PATCH_SHA256}"
WORKDIR /app
COPY --chown=node:node .next/standalone/ ./
COPY --chown=node:node .next/static/ ${STANDALONE_APP_PATH}/.next/static/
COPY --chown=node:node public/ ${STANDALONE_APP_PATH}/public/
COPY --chown=node:node .next/workers/worker.cjs ${STANDALONE_APP_PATH}/worker.cjs
USER node
WORKDIR /app/${STANDALONE_APP_PATH}
EXPOSE 3000
CMD ["node", "server.js"]
