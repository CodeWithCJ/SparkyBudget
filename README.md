# SparkyBudget
SparkyBudget
![image](https://github.com/user-attachments/assets/05cd8d45-2d55-4520-abee-cc2eda49557a)


Features  
🔄 Transaction Management  
✅ Auto-Sync with SimpleFin – Automatically fetch bank & credit card transactions.  
✅ Manual & Auto Sync – Choose between automatic updates or manual refresh.  
✅ Split Transactions – Divide transactions into multiple categories.  
✅ Auto-Categorization Rules – Set rules to automatically categorize transactions.  
✅ Custom Categories – Create & manage custom spending categories.  

💰 Budgeting & Planning  
✅ Set Future Budgets – Plan ahead with monthly budget setting.  
✅ Customizable Budget Templates – Personalize budgets for every month.  
✅ Customize Budgets – Adjust and personalize budgets as needed.  

📊 Analysis & Insights  
✅ Daily Balance Tracking – View & analyze your daily balance trends.  
✅ Account Management – View account balance & detailed account information.  
✅ Spending Insights – Analyze spending across months, categories, subcategories, with custom date ranges.  
✅ Paycheck Analysis – Track paycheck trends over time.  

📑 Customization & User Control  
✅ Flexible Sorting – Customize sorting on the account view.  
✅ Mobile-Friendly UI – Optimized for smooth usage on all devices.  

📂 Export & Reports  
✅ Export Options – Download data in PDF, Excel, or CSV format.  



🛠 How to Run?  
1. Create a new directory:  
``mkdir sparkybudget``  
2. Download .env-example and SparkyBudget-example.db.  
3. Rename and update the environment file:  
``mv .env-example .env``  
4. Prepare the database:  
``mv SparkyBudget-fresh.db SparkyBudget.db``  
5. Pull and start the Docker containers:  
``docker compose pull && docker compose up -d``  


🌍 How to Access?  
📍 Open your browser and go to:  
👉 http://localhost:5050  


📂 Demo Files  
📌 The SparkyBudget-demo.db file contains sample transactions from SimpleFin for testing.  


🔄 How to Reset the Token?  
If you need to reset your SimpleFin Token, follow these steps:  

1. Open a shell inside the container:  
``docker exec -it sparkybudget sh``  
2. Delete the existing access URL file:  
``rm /SparkyBudget/access_url.txt``  
3. Update .env file and restart container  
``docker-compose down && docker-compose up``  


⚠️ Important:  

The token can only be used once.  You will need to generate a new token from SimpleFin and update it in .env before retrying.  


💬 Need Help?  
Join our Discord Community for installation support, configuration help, and contributions:  
👉 https://discord.gg/XRubfPQa  


