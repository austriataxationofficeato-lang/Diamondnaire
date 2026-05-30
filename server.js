const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
//const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data store
let db = {
  users: {},
  transactions: [],
  game_history: [],
  leaderboard: {}
};

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      db = JSON.parse(data);
    }
  } catch (e) {
    console.log('Starting fresh data store');
  }
}

// Save data to file
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

loadData();

app.use(express.json());
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express on Vercel!' });
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public'.split)));



// Game symbols
