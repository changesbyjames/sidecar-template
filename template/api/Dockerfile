FROM node:17 as builder

WORKDIR /usr/builder

COPY ["package.json", "package-lock.json*", "tsconfig.json", "npm-shrinkwrap.json*", "./"]
RUN npm install
COPY . .

RUN npm run build

FROM node:17 as production
WORKDIR /usr/app
COPY ["package.json", "package-lock.json*", "tsconfig.json", "npm-shrinkwrap.json*", "./"]
RUN npm install --production && mv node_modules ../

COPY --from=builder /usr/builder/dist .
COPY --from=builder /usr/builder/src/jobs jobs
ENV PORT 3000
EXPOSE 3000

CMD ["node", "index.js"]
