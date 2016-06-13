FROM node

# Bundle app source
COPY . /camus
WORKDIR /camus

# Install app dependencies
RUN npm install --production
RUN npm install babel-polyfill
RUN npm install babel-register

EXPOSE  3001
CMD ["npm", "start"]