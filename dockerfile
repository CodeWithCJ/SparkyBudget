FROM python:3.13.2-slim-bookworm
WORKDIR /SparkyBudget
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r ./requirements.txt
RUN apt-get update && \
    apt-get install -y --no-install-recommends locales tzdata && \
    apt-get -y autoremove && apt-get clean -y && rm -rf /var/lib/apt/lists/* && \
    sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && locale-gen
ARG TZ=America/New_York
ENV TZ=${TZ}
RUN echo "${TZ}" > /etc/timezone && dpkg-reconfigure -f noninteractive tzdata
ENV FLASK_ENV=production
ENV LC_ALL=en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
COPY SparkyBudget/ ./
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
EXPOSE 5000
ENTRYPOINT ["./entrypoint.sh"]