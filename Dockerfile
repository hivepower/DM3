from node:carbon-alpine

COPY package*.json ./
RUN npm i

COPY . .
RUN npm run build

EXPOSE 3030

CMD ["npm", "start"]
