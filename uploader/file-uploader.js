const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const https = require('https');
const app = express();
const port = process.env.PORT || 5044;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created uploads directory at ${uploadsDir}`);
}

// Create SSL directory if it doesn't exist
const sslDir = path.join(__dirname, 'ssl');
if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir, { recursive: true });
    console.log(`Created ssl directory at ${sslDir}`);
    
    // Add a note about generating SSL certificates
    console.log('Please add your SSL certificates to the ssl directory:');
    console.log('- key.pem: Your private key');
    console.log('- cert.pem: Your certificate');
    console.log('\nYou can generate self-signed certificates with this command:');
    console.log('openssl req -x509 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes');
    
    process.exit(1); // Exit as we need certificates to proceed
}

// Load SSL certificates
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem'))
};

// Enable CORS for all routes
app.use(cors());

// Configure multer storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function(req, file, cb) {
        // Use original filename but ensure it's unique with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const basename = path.basename(file.originalname, extension);
        cb(null, `${basename}-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB file size limit
    }
});

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple homepage
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>File Upload Server</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    h1 {
                        color: #333;
                    }
                    form {
                        margin: 20px 0;
                        padding: 20px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                    }
                </style>
            </head>
            <body>
                <h1>File Upload Server</h1>
                <p>Upload files to the server using the form below or via POST request to /upload</p>
                
                <form action="/upload" method="post" enctype="multipart/form-data">
                    <input type="file" name="file" required />
                    <button type="submit">Upload</button>
                </form>
            </body>
        </html>
    `);
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Return information about the uploaded file
        res.status(200).json({
            message: 'File uploaded successfully',
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            path: req.file.path
        });
    } catch (error) {
        console.error('Error handling upload:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ 
                error: 'File too large',
                message: 'The uploaded file exceeds the 50MB size limit'
            });
        }
        return res.status(400).json({ error: err.message });
    }
    // For other errors
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Create and start the HTTPS server
const httpsServer = https.createServer(sslOptions, app);

httpsServer.listen(port, () => {
    console.log(`HTTPS File upload server running at https://localhost:${port}`);
    console.log(`Upload files to: https://localhost:${port}/upload`);
    console.log(`Files will be saved to: ${uploadsDir}`);
});
