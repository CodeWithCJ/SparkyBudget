# SparkyBudget
SparkyBudget

## How To Run

First clone this repo, then follow the below steps:

### Install dependencies

The minimum version of Python for this project is ???? (I use Python 3.10)

It is recommended you set up a virtual environment to keep dependencies from conflicting between projects. I recommend PDM. Since I don't wanna enforce PDM, the below steps can be used to use PDM:

#### PDM setup

1. [install pdm](https://pdm-project.org/latest/) if not installed already
2. `pdm install` will install your dependencies
3. `pdm venv activate` will show you how to activate the venv

#### vanilla Python

1. Create a virtual environment using either via virtualenv or venv
    * virtualenv example: `virtualenv name-of-venv`
    * venv example: `python -m venv /path/to/new/virtual/environment`
2. Activate the virtual environment:
    * virtualenv: OS specific, see: https://virtualenv.pypa.io/en/latest/user_guide.html#quick-start
    * venv: OS Specific, see: https://docs.python.org/3/library/venv.html#how-venvs-work
3. install dependencies: `pip install -r requirements.txt`

### Set up local files

1. copy .env-example to .env
   * TODO: this assumes you're using VSCode to run this as it'll auto-load the .env should we install python-dotenv for non-vscode users?
2. copy SparkyBudget-example.db to SparyBudget.db
3. copy token-example.txt to token.txt

### Development in VSCode

Make sure to tell VSCode to use your venv: https://code.visualstudio.com/docs/python/environments#_select-and-activate-an-environment

### Local HTTPS

To use local HTTPS, create self signed certicate and upload under `SparkyBudget\certs`. Then in your .env set `USE_INTERNAL_HTTPS` and `USE_SECURE_SESSION_COOKIE` both equal to `1`

You can now use `(HTTPS) Python: SparkyBudget app` from VSCode to launch the web application

TODO: will need to enable dotenv to do this: Run using "python app.py" command. It uses 5000 port.

### Authentication:

Default User name: Sparky
Default Password: Sparky

These can be changed in your .env file via `SPARKY_USER` and `SPARKY_PASS`

## Docker

an example dockerfile and docker-compose.yaml are included at the root of the project. The docker version runs using gunicorn in a production build

You can build the image via the following command: `sudo docker build -t sparkybudget .`

And you can run it via docker-compose like so: `sudo docker compose up`

You may need to change the the mounting paths for the database, output directory, and token.txt/access_url.txt. By default I expect them at the root, so you may wish to copy them out of the SparkyBudget directory up to the same level as the docker-compose.yaml

## Information on how it works and SimpleFin

Currently I have configured it to use the demo token from https://www.simplefin.org/. The transactions are dated with 1970-01-01. But as I defautled the App to show current month, default month selection is not working as there is no transaction or budget assinged for it. So you will need to manually select "01" 
month from the filter. 


To use with your bank/simplefin token
1. Signup using https://www.simplefin.org/    - This is $1.5 per month currently.  I am not charging this. SimpleFin is a bank sync and I am using using their Api to downloading the transactions.
2. Connect your banks
3. Generate Token
4. Update the token.txt file with your token and delete acces_url.txt file

You can "refresh" using the menu bar icon. This will claim your token, generate accessl URL and store it under access_url.txt and use it to download your bank transactions.
Note the folllowing
1. Toaken is one time use. If you run into problem, most probably you will need to generate new token again
2. Once access_url.txt is generated, it will try to re-create again. It will be used for downloading transactions every time you hit refresh icon. I had a code that downloads every 6 hour. But disabled as it was conflicting with inital setup for the first time.

## Contributors Welcomed!

Discord Link: https://discord.gg/6c2D6kju
If you need any help with installation, configuration or contribute, please join the discord.

Disclaimer: I am not responsible for any broken code or loss of your data or any other issue. I am doing this as my fun project so treat it accordingly. Though I am happy to help setup this project for you, always have your backup. 


