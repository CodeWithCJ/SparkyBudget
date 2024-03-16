FROM python:3.10.13-slim-bookworm
WORKDIR /app

COPY LICENSE.txt SparkyBudget/requirements.txt SparkyBudget/*.py ./
COPY SparkyBudget/templates ./templates
COPY SparkyBudget/static ./static
RUN pip install -r ./requirements.txt
RUN apt-get update && \
    apt-get install -y --no-install-recommends locales && \
    apt-get -y autoremove && apt-get clean -y && rm -rf /var/lib/apt/lists/* && \
    sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && locale-gen
ENV FLASK_ENV production
ENV LC_ALL en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en

EXPOSE 5000
CMD ["gunicorn", "-b", ":5000", "app:app"]