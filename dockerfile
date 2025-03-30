FROM python:3.13.2-slim-bookworm

# Set the working directory inside the container
WORKDIR /SparkyBudget

# Copy requirements.txt into the container
COPY requirements.txt ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r ./requirements.txt

# Install system dependencies and configure locales, plus tzdata
RUN apt-get update && \
    apt-get install -y --no-install-recommends locales tzdata && \
    apt-get -y autoremove && apt-get clean -y && rm -rf /var/lib/apt/lists/* && \
    sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && locale-gen

# Set timezone from environment variable, defaulting to America/New_York if not set
# Use ARG to allow passing at build time
ARG TZ=America/New_York  
# Use ENV to make it available at runtime
ENV TZ=${TZ}            

# Set the timezone (non-interactive)
RUN echo "${TZ}" > /etc/timezone && \
    dpkg-reconfigure -f noninteractive tzdata

# Set environment variables
ENV FLASK_ENV=production
ENV LC_ALL=en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en

# Copy the entire SparkyBudget folder into the container
COPY SparkyBudget/ ./

# Expose the Flask app port
EXPOSE 5000

# Command to run the application
CMD ["gunicorn", "-b", ":5000", "--timeout", "120", "SparkyBudget:app"]