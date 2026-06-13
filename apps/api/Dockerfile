FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN npm ci --omit=dev

COPY apps/api apps/api
COPY packages packages
COPY tsconfig.base.json tsconfig.json ./

ENV NODE_ENV=production
ENV STORYVERSE_API_PORT=4310
EXPOSE 4310

CMD ["sh", "-c", "npm run db:migrate && npm run start:container -w @storyverse/api"]
