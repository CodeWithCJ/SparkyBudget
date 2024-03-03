# SparkyBudget
SparkyBudget


Create self signed certicate and upload under static\ssl before running this App. Without SSL cert, login authentication is not working currently.
Run using "python app.py" command. It uses 5000 port. 

User name: Sparky
Password: Sparky

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


Discord Link: https://discord.gg/6c2D6kju
If you need any help with installation, configuration or contribute, please join the discord.

Disclaimer: I am not responsible for any broken code or loss of your data or any other issue. I am doing this as my fun project so treat it accordingly. Though I am happy to help setup this project for you, always have your backup. 


