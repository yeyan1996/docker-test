# build stage
FROM node:latest as build-stage
WORKDIR /app
COPY package*.json ./
RUN echo 'npm install...'
RUN npm install
COPY . .
RUN echo 'npm build...'
RUN npm run build

# production stage
FROM nginx:latest as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
