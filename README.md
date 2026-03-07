# SparkyBudget
<img src="SparkyBudget.png" alt="Logo" width="60">  

**SparkyBudget** is a personal finance management app that helps users track accounts like Checking, Credit Card, and Loan, manage budgets, and analyze spending trends. Its dark-themed interface offers tools for monitoring net cash, setting recurring budgets, and viewing historical financial data. Ideal for anyone seeking to organize their finances with ease.

![image](https://github.com/user-attachments/assets/3126ccef-b69a-4862-a8d1-c4d666db80e3)



# 🛠 How to Install?  
1. Create a new directory:  
```
mkdir sparkybudget
cd sparkybudget
```  
2. Download Docker Compose and  .env-example.
```
wget https://raw.githubusercontent.com/CodeWithCJ/SparkyBudget/refs/heads/main/docker-compose.yaml  
wget https://raw.githubusercontent.com/CodeWithCJ/SparkyBudget/refs/heads/main/.env-example  
```  
3. Rename and update DB & the environment file:  
```
mv .env-example .env
nano .env
```    
4. Pull and start the Docker containers:  
```
docker compose pull && docker compose up -d
```    


# 🌍 How to Access?  
📍 Open your browser and go to:  
👉 http://localhost:5050  


# 📂 Demo Files  
📌 Pass below env variable to "Yes" to auto generate demo accounts & transactions. Backup your DB file if you are existing user.  
This will generate dummy accounts & transactions in the DB file.  
```
SPARKY_DEMO=Yes  
```

# 🔄 How to Reset the Token?  
If you need to reset your SimpleFin Token, delete the access_url.txt.  
Follow these steps:  

```
docker exec -it sparkybudget sh  
rm /SparkyBudget/access_url.txt  
docker-compose down && docker-compose up  
```


⚠️ Important:  

The token can only be used once.  You will need to generate a new token from SimpleFin and update it in .env before retrying.  


# 💬 Need Help?  
Refer detailed instructions and documentation in Wiki.  

Join our Discord Community for installation support, configuration help, and contributions:  
👉 https://discord.gg/vGjn4b6CVB   



