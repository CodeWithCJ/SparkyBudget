FROM python:3.13.2-slim-bookworm

# Set the working directory inside the container
WORKDIR /SparkyBudget

# Copy requirements.txt into the container
COPY requirements.txt ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r ./requirements.txt

# Copy the entire SparkyBudget folder into the container
COPY SparkyBudget/ ./

# Install system dependencies and configure locales
RUN apt-get update && \
    apt-get install -y --no-install-recommends locales && \
    apt-get -y autoremove && apt-get clean -y && rm -rf /var/lib/apt/lists/* && \
    sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && locale-gen

# Set environment variables
ENV FLASK_ENV=production
ENV LC_ALL=en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en

# Expose the Flask app port
EXPOSE 5000

# Command to run the application
CMD ["gunicorn", "-b", ":5000", "--timeout", "120", "SparkyBudget:app"]