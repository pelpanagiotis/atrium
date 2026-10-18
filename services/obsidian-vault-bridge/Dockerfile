FROM node:22-alpine

WORKDIR /app
COPY package.json server.mjs ./

ENV HOST=0.0.0.0
ENV PORT=27124
EXPOSE 27124

USER node
CMD ["node", "server.mjs"]
