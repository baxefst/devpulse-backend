FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN chmod +x node_modules/.bin/tsc && node_modules/.bin/tsc

EXPOSE 3000

CMD ["node", "dist/index.js"]