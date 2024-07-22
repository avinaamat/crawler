# Use an official Node.js runtime as a parent image
FROM node:current-alpine3.16

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Make the output directory
RUN mkdir -p /app/output

# Set the output directory as a volume
VOLUME /app/output

# Command to run the crawler
ENTRYPOINT ["node", "--no-warnings", "crawler.mjs"]