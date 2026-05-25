FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --include=dev

RUN npx prisma generate

COPY . .

RUN npm run build

RUN ls -la dist

EXPOSE 3000

CMD ["node", "dist/src/main.js"]