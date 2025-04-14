FROM python:3.13.2-slim-bookworm
WORKDIR /SparkyBudget

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    locales \
    tzdata \
    dos2unix && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
    locale-gen

# Set timezone
ARG TZ=America/New_York
ENV TZ=${TZ}
RUN echo "${TZ}" > /etc/timezone && dpkg-reconfigure -f noninteractive tzdata

# Set environment variables
ENV FLASK_ENV=production
ENV LC_ALL=en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY SparkyBudget/ .
COPY entrypoint.sh .

# Fix line endings and set permissions
RUN dos2unix entrypoint.sh && \
    chmod +x entrypoint.sh

# Create database file and set permissions
RUN touch SparkyBudget.db && \
    chmod 666 SparkyBudget.db && \
    python -c "from py_utils.init_db import init_database; init_database()"

EXPOSE 5000

# Use shell form of ENTRYPOINT to ensure proper script execution
ENTRYPOINT ["/bin/bash", "./entrypoint.sh"]