FROM node

# Bundle app source
COPY . /camus
WORKDIR /camus

# Install app dependencies
RUN npm install
RUN npm i pm2 -g
RUN pm2 updatePM2

EXPOSE  3001
CMD ["npm", "start"]
