# Dev-oriented Dockerfile: installs deps and runs `next dev` with the
# source mounted as a volume (see docker-compose.yml). For a production
# VPS deploy later, swap this for a multi-stage build with `next build`
# and `next start`.

FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
