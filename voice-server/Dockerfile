FROM node:22-alpine
WORKDIR /app
COPY voice-server /app/voice-server
ENV PORT=9000
EXPOSE 9000
USER node
CMD ["node", "voice-server/server.mjs"]
