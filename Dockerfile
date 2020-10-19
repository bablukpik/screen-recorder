FROM php:7.2-apache
RUN apt-get update && apt-get upgrade -y
# Install PHP extensions
RUN docker-php-ext-install mysqli #it enables ext automatically after installing
#RUN pecl install [extension]
#RUN docker-php-ext-enable [extension]
ADD php.ini /usr/local/etc/php
COPY . /var/www/html/
EXPOSE 80
