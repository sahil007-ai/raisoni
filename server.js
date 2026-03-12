/**
 * ============================================
 * Plan4U — server.js
 * Express server serving static files and API.
 * ============================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./db/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api', apiRoutes);

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Fallback to index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`\n  🚀 Plan4U server running at http://localhost:${PORT}\n`);
    console.log(`  📂 Database: db/plan4u.db`);
    console.log(`  📡 API:      http://localhost:${PORT}/api\n`);
});
