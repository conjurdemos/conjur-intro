# Use the light version of the image that contains just the latest binary
FROM hashicorp/terraform:light

# The app folder will contain all our files
WORKDIR /app

# Put all your configration files in the same folder as the Dockerfile
COPY . /app

# Initalize terraform with local settings and data
RUN ["terraform", "init"]

# Plan and execute the configurations
CMD [ "apply"]
