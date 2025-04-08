# SparkyBudget
<img src="SparkyBudget.png" alt="Logo" width="60">  

**SparkyBudge** is a personal finance management app that helps users track accounts like Checking, Credit Card, and Loan, manage budgets, and analyze spending trends. Its dark-themed interface offers tools for monitoring net cash, setting recurring budgets, and viewing historical financial data. Ideal for anyone seeking to organize their finances with ease.

![image](https://github.com/user-attachments/assets/05cd8d45-2d55-4520-abee-cc2eda49557a)


# 🛠 How to Install?  
1. Create a new directory:  
```
mkdir sparkybudget
cd sparkybudget
```  
2. Download .env-example and SparkyBudget-fresh.db.
```
wget https://raw.githubusercontent.com/CodeWithCJ/SparkyBudget/refs/heads/main/docker-compose.yml  
wget https://raw.githubusercontent.com/CodeWithCJ/SparkyBudget/refs/heads/main/.env-example  
wget https://raw.githubusercontent.com/CodeWithCJ/SparkyBudget/refs/heads/main/SparkyBudget-fresh.db  
```  
3. Rename and update DB & the environment file:  
```
mv SparkyBudget-fresh.db SparkyBudget.db
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
📌 The SparkyBudget-demo.db file contains sample transactions from SimpleFin for testing.  


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
Refer detailed instrusctions and documentation in Wiki.  

Join our Discord Community for installation support, configuration help, and contributions:  
👉 https://discord.gg/XRubfPQa  



