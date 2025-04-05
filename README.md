# SparkyBudget
<img src="SparkyBudget.png" alt="Logo" width="60">  


![image](https://github.com/user-attachments/assets/05cd8d45-2d55-4520-abee-cc2eda49557a)


# 🛠 How to Install?  
1. Create a new directory:  
```
mkdir sparkybudget
```  
2. Download .env-example and SparkyBudget-fresh.db.
```
wget https://raw.githubusercontent.com/CodeWithCJ/SparkyBudget/refs/heads/main/.env-example
wget https://raw.githubusercontent.com/CodeWithCJ/SparkyBudget/refs/heads/main/SparkyBudget-fresh.db

```  
3. Rename and update the environment file:  
```
mv .env-example .env
nano .env
```    
4. Prepare the database:  
```
mv SparkyBudget-fresh.db SparkyBudget.db
```   
5. Pull and start the Docker containers:  
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


# 🚀 Future Plans (Upcoming Features)  
📊 LLM Integration for Finance Queries  
✅ Experimenting with local AI models to enable conversational interactions with financial data.  

📈 Expense Insights & Annual Planning  
✅ Analyzing historical expenses to build Annual Operating Plans (AOP) & Operation & Risk (O&R).  
✅ Identifying unnecessary expenses and providing alerts/warnings.  

📉 Budget Projection Using Advanced Analytics  
✅ Implementing exponential moving averages and R-based financial modeling for predictive budgeting.  

🔥 Financial Independence (FIRE) Projections  
✅ Estimating long-term financial independence and retirement timelines.  

💱 Multi-Currency Support  
✅ Handling USD & INR, with potential expansion to other currencies.  

⚠️ Things I Won’t Focus  
📂 Manual Bank Statement Imports  
❌ Since SimpleFin covers my needs, I won’t add manual bank import functionality.  

📌 Advanced Auto Categorization  
❌ My app uses simple keyword-based categorization, and I don’t plan to add complex regex-based rules like Actual.  

🔌 API Development  
❌ The app follows a simple and decoupled database structure, so an API isn’t necessary for my use case as of now to interact with SparkyBudget's database.  


