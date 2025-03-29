# 📌 SparkyBudget - Personal Finance Tracker
A lightweight and self-hosted budget management app built using Python Flask ,SQLite & SimpleFin API
![image](https://github.com/user-attachments/assets/cbdd60e7-7451-4977-ae2e-ce57c076ac63)


![image](https://github.com/user-attachments/assets/291dd911-466c-4bc1-8524-d10c6fba9425)


![image](https://github.com/user-attachments/assets/647119f4-7902-46ec-9be2-3821616ad255)


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

Create a new directory: mkdir sparkybudget

Download .env-example , SparkyBudget-example.db and docker-compose.yml files

Rename and update the environment file: mv .env-example .env

Prepare the database: mv SparkyBudget-fresh.db SparkyBudget.db

Pull and start the Docker containers: docker compose pull && docker compose up -d

🌍 How to Access?
📍 Open your browser and go to:
👉 http://localhost:5050

📂 Demo Files
📌 The SparkyBudget-demo.db file contains sample transactions from SimpleFin for testing.

🔄 How to Reset the Token?
If you need to reset your SimpleFin Token, follow these steps:

Open a shell inside the container: docker exec -it sparkybudget sh

Delete the existing access URL file: rm /SparkyBudget/access_url.txt

Update .env file and restart container docker-compose down && docker-compose up

⚠️ Important:

The token can only be used once. You will need to generate a new token from SimpleFin and update it in .env before retrying.

💬 Need Help?

Disclaimer: I am not responsible for any broken code or loss of your data or any other issue. I am doing this as my fun project so treat it accordingly. Though I am happy to help setup this project for you, always have your backup. 


