FROM python:3.10.13-alpine3.19
WORKDIR /app

COPY LICENSE.txt SparkyBudget/requirements.txt SparkyBudget/*.py ./
COPY SparkyBudget/templates ./templates
COPY SparkyBudget/static ./static
RUN pip install -r ./requirements.txt
ENV FLASK_ENV production

EXPOSE 5000
CMD ["gunicorn", "-b", ":5000", "app:app"]