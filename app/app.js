const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello from Jenkins → ECR → ECS pipeline! 🚀');
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

app.listen(PORT, () => {
  console.log(`✅ App running on port ${PORT}`);
});
