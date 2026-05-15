FROM php:8.5-apache-bookworm

ENV COMPOSER_ALLOW_SUPERUSER=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    gnupg \
    libfreetype6-dev \
    libicu-dev \
    libjpeg62-turbo-dev \
    libmagickwand-dev \
    libpng-dev \
    libxml2-dev \
    libzip-dev \
    unzip \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && corepack enable \
  && corepack prepare yarn@1.22.22 --activate \
  && docker-php-ext-configure gd --with-freetype --with-jpeg \
  && docker-php-ext-install -j"$(nproc)" bcmath gd intl pcntl pdo_mysql soap zip \
  && pecl install imagick redis xdebug \
  && docker-php-ext-enable imagick redis xdebug \
  && printf "ServerName localhost\n" > /etc/apache2/conf-available/servername.conf \
  && a2enconf servername \
  && a2enmod rewrite \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://getcomposer.org/installer \
  | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /var/www/html
