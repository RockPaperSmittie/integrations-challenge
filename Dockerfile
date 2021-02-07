FROM node:12.13-alpine

WORKDIR /usr/checkout

COPY package.json ./
COPY yarn.lock ./

RUN yarn install

COPY . .

RUN yarn install

EXPOSE 4444

CMD [ "yarn", "start:payment-methods" ]