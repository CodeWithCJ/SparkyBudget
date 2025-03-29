# SparkyBudget
SparkyBudget
![image](https://github.com/user-attachments/assets/05cd8d45-2d55-4520-abee-cc2eda49557a)



![image](https://github.com/user-attachments/assets/291dd911-466c-4bc1-8524-d10c6fba9425)


![image](https://github.com/user-attachments/assets/647119f4-7902-46ec-9be2-3821616ad255)



**How to run?**

	mkdir sparkybudget

	Download .env-example and SparkyBudget-example.db 
 
	
 	mv .env-example .env
	mv SparkyBudget-example.db SparkyBudget.db
	docker compose pull && docker compose up -d
 

**How to access?**

	http://localhost:5050

**Demo files:**
	``DB file contains demo transactions from SimpleFin. ``

**How to Reset Token?**
	``Deleting access_url from container will try to re-use new token. Makesure to update new token under .env before trying this. ``

	docker-compose down
	docker-compose up
	docker exec -it sparkybudget sh
	rm /SparkyBudget/access_url.txt

``Token can be used only once. If access_url.txt is not created, you will need to regenerate new token from SimpleFin``


Discord Link: https://discord.gg/BeYVswBC
If you need any help with installation, configuration or contribute, please join the discord.

Disclaimer: I am not responsible for any broken code or loss of your data or any other issue. I am doing this as my fun project so treat it accordingly. Though I am happy to help setup this project for you, always have your backup. 


