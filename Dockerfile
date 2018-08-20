from node

COPY package*.json ./
RUN npm i

COPY . .
RUN npm run build

EXPOSE 3030

CMD ["npm", "start"]
