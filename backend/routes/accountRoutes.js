const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const fetch = require('node-fetch');
const multer = require('multer');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { protect, authorize } = require('../middleware/authMiddleware');
const Account = require('../models/Account');
const mime = require('mime');
const path = require('path');
const fs = require('fs');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 16 * 1024 * 1024 // 16MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'), false);
    }
  }
});

// Initialize GridFS bucket
let gridFSBucket;
mongoose.connection.once('open', () => {
  gridFSBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'files'
  });
});

// Helper function to determine if file should use GridFS
const shouldUseGridFS = (fileSize) => {
  return fileSize > 1024 * 1024; // Use GridFS for files larger than 1MB
};

// Helper function to store file in GridFS
const storeInGridFS = async (file) => {
  return new Promise((resolve, reject) => {
    const writeStream = gridFSBucket.openUploadStream(file.originalname, {
      contentType: file.mimetype
    });

    const readStream = require('stream').Readable.from(file.buffer);
    readStream.pipe(writeStream);

    writeStream.on('finish', () => {
      resolve(writeStream.id);
    });

    writeStream.on('error', reject);
  });
};

// Helper function to retrieve file from GridFS
const retrieveFromGridFS = async (fileId) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const downloadStream = gridFSBucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));

    downloadStream.on('data', chunk => chunks.push(chunk));
    downloadStream.on('error', reject);
    downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

// Helper function to fetch website logo
async function fetchWebsiteLogo(website) {
  try {
    // Add https:// prefix if no protocol specified
    const websiteUrl = website.startsWith('http') ? website : `https://${website}`;
    
    // Try to parse the URL
    let url;
    try {
      url = new URL(websiteUrl);
    } catch (error) {
      const cleanName = website.replace(/^https?:\/\//, '');
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=random&size=128`;
    }
    
    const hostname = url.hostname;

    // Expanded list of known sites with their direct logo URLs
    const knownSites = {
      'github.com': 'https://github.githubassets.com/favicons/favicon.svg',
      'mongodb.com': 'https://www.mongodb.com/assets/images/global/favicon.ico',
      'google.com': 'https://www.google.com/favicon.ico',
      'gmail.com': 'https://www.google.com/gmail/about/static/images/favicon.ico',
      'yahoo.com': 'https://s.yimg.com/cv/apiv2/default/icons/favicon_y19_32x32_custom.svg',
      'microsoft.com': 'https://www.microsoft.com/favicon.ico',
      'linkedin.com': 'https://static.licdn.com/sc/h/akt4ae504epesldzj74dzred8',
      'facebook.com': 'https://static.xx.fbcdn.net/rsrc.php/yD/r/d4ZIVX-5C-b.ico',
      'twitter.com': 'https://abs.twimg.com/favicons/twitter.ico',
      'amazon.com': 'https://www.amazon.com/favicon.ico'
    };

    if (knownSites[hostname]) {
      console.log(`Using predefined logo for ${hostname}`);
      return knownSites[hostname];
    }

    // Set a shorter timeout for faster response
    const fetchOptions = {
      timeout: 3000,
      headers: {
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    };

    // Try to fetch the favicon from icon.horse with Promise.race
    const iconHorsePromise = fetch(`https://icon.horse/icon/${hostname}`, fetchOptions)
      .then(response => {
        if (response.ok) {
          console.log(`Successfully fetched logo from icon.horse for ${hostname}`);
          return `https://icon.horse/icon/${hostname}`;
        }
        throw new Error('Icon.horse fetch failed');
      });

    // Try Google Favicon service as a parallel request
    const googleFaviconPromise = fetch(`https://www.google.com/s2/favicons?domain=${hostname}&sz=128`, fetchOptions)
      .then(response => {
        if (response.ok) {
          console.log(`Successfully fetched Google favicon for ${hostname}`);
          return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
        }
        throw new Error('Google favicon fetch failed');
      });

    // Race both promises with a timeout
    try {
      const logo = await Promise.race([
        iconHorsePromise,
        googleFaviconPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Logo fetch timeout')), 3000)
        )
      ]);
      return logo;
    } catch (error) {
      console.log(`Favicon fetch failed or timed out for ${hostname}, using text-based logo`);
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(hostname)}&background=random&size=128`;
    }
  } catch (error) {
    console.error('Error in fetchWebsiteLogo:', error);
    const cleanName = website.replace(/^https?:\/\//, '');
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=random&size=128`;
  }
}

// Helper function to clean up old file
const cleanupOldFile = async (oldFilePath) => {
  if (oldFilePath) {
    const fullPath = path.join(__dirname, '..', oldFilePath);
    try {
      if (fs.existsSync(fullPath)) {
        // Check if any other account is using this file
        const usingAccounts = await Account.find({ attachedFile: oldFilePath });
        if (usingAccounts.length <= 1) { // If only the current account (or no account) is using it
          fs.unlinkSync(fullPath);
          console.log(`Cleaned up unused file: ${oldFilePath}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old file:', error);
    }
  }
};

// File viewing route
router.get('/files/:id', protect, async (req, res) => {
  try {
    const account = await Account.findOne({
      user: req.user._id,
      'attachedFile.gridFSId': new mongoose.Types.ObjectId(req.params.id)
    });

    if (!account) {
      return res.status(403).json({
        message: 'Access denied',
        details: 'You do not have permission to access this file'
      });
    }

    const { attachedFile } = account;

    if (attachedFile.gridFSId) {
      // Stream GridFS file
      const downloadStream = gridFSBucket.openDownloadStream(
        new mongoose.Types.ObjectId(attachedFile.gridFSId)
      );

      res.set('Content-Type', attachedFile.contentType);
      res.set('Content-Disposition', `inline; filename="${attachedFile.filename}"`);
      
      downloadStream.pipe(res);
    } else if (attachedFile.data) {
      // Send Base64 file
      const buffer = Buffer.from(attachedFile.data, 'base64');
      res.set('Content-Type', attachedFile.contentType);
      res.set('Content-Disposition', `inline; filename="${attachedFile.filename}"`);
      res.send(buffer);
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    console.error('File viewing error:', error);
    res.status(500).json({ 
      message: 'Error viewing file',
      details: error.message
    });
  }
});

// Add these utility functions at the top after the imports
const generateStrongPassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest of the password
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

const getNextSerialNumber = async () => {
  const lastAccount = await Account.findOne().sort({ serialNumber: -1 });
  return lastAccount ? lastAccount.serialNumber + 1 : 1000; // Start from 1000
};

// Add password generation endpoint
router.get('/generate-password', protect, async (req, res) => {
  try {
    const password = generateStrongPassword(16); // Generate 16 character password
    res.json({ password });
  } catch (error) {
    console.error('Password generation error:', error);
    res.status(500).json({ message: 'Error generating password' });
  }
});

// @route   POST /api/accounts
// @desc    Create new account
// @access  Private
router.post('/', protect, upload.single('attachedFile'), async (req, res) => {
  try {
    const serialNumber = await getNextSerialNumber();
    const { website, name, username, email, password, note } = req.body;

    let fileData = null;
    if (req.file) {
      if (shouldUseGridFS(req.file.size)) {
        // Store large files in GridFS
        const gridFSId = await storeInGridFS(req.file);
        fileData = {
          filename: req.file.originalname,
          contentType: req.file.mimetype,
          size: req.file.size,
          gridFSId: gridFSId,
          uploadDate: new Date()
        };
      } else {
        // Store small files as Base64
        fileData = {
          filename: req.file.originalname,
          contentType: req.file.mimetype,
          size: req.file.size,
          data: req.file.buffer.toString('base64'),
          uploadDate: new Date()
        };
      }
    }

    // Create new account
    const account = new Account({
      serialNumber,
      website,
      name,
      username,
      email,
      password,
      note,
      attachedFile: fileData,
      user: req.user._id
    });

    // Save account
    await account.save();

    res.status(201).json({
      message: 'Account created successfully',
      account: {
        ...account.toObject(),
        attachedFile: fileData ? {
          filename: fileData.filename,
          contentType: fileData.contentType,
          size: fileData.size,
          uploadDate: fileData.uploadDate
        } : null
      }
    });
  } catch (error) {
    console.error('Account creation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/accounts
// @desc    Get all accounts for logged in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    console.log('Fetching accounts for user:', req.user.id); // Add logging

    const accounts = await Account.find({ user: req.user.id })
      .sort({ serialNumber: 1 }) // Sort by serial number
      .select('-__v'); // Exclude version key

    console.log('Found accounts:', accounts.length); // Add logging

    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ 
      message: 'Error fetching accounts',
      details: error.message 
    });
  }
});

// @route   GET /api/accounts/:id
// @desc    Get account by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Make sure user owns account
    if (account.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    res.json(account);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/accounts/:id
// @desc    Update account
// @access  Private
router.put('/:id', protect, upload.single('attachedFile'), async (req, res) => {
  try {
    const { website, name, username, email, password, note } = req.body;
    const accountId = req.params.id;

    // Find the account
    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Check ownership
    if (account.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this account' });
    }

    let fileData = account.attachedFile;
    if (req.file) {
      // Delete old file if it exists
      if (account.attachedFile) {
        if (account.attachedFile.gridFSId) {
          await gridFSBucket.delete(account.attachedFile.gridFSId);
        }
      }

      if (shouldUseGridFS(req.file.size)) {
        // Store large files in GridFS
        const gridFSId = await storeInGridFS(req.file);
        fileData = {
          filename: req.file.originalname,
          contentType: req.file.mimetype,
          size: req.file.size,
          gridFSId: gridFSId,
          uploadDate: new Date()
        };
      } else {
        // Store small files as Base64
        fileData = {
          filename: req.file.originalname,
          contentType: req.file.mimetype,
          size: req.file.size,
          data: req.file.buffer.toString('base64'),
          uploadDate: new Date()
        };
      }
    }

    // Update account
    const updatedAccount = await Account.findByIdAndUpdate(
      accountId,
      {
        website,
        name,
        username,
        email,
        password,
        note,
        attachedFile: fileData
      },
      { new: true }
    );

    res.json({
      message: 'Account updated successfully',
      account: {
        ...updatedAccount.toObject(),
        attachedFile: fileData ? {
          filename: fileData.filename,
          contentType: fileData.contentType,
          size: fileData.size,
          uploadDate: fileData.uploadDate
        } : null
      }
    });
  } catch (error) {
    console.error('Account update error:', error);
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/accounts/:id
// @desc    Delete account
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Make sure user owns account
    if (account.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Delete attached file if it exists
    if (account.attachedFile && account.attachedFile.gridFSId) {
      try {
        await gridFSBucket.delete(account.attachedFile.gridFSId);
      } catch (error) {
        console.error('Error deleting file from GridFS:', error);
      }
    }

    await Account.findByIdAndDelete(req.params.id);

    res.json({ message: 'Account removed' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @route   GET /api/accounts/cleanup-uploads
// @desc    Clean up unused files in uploads directory
// @access  Private/Admin
router.get('/cleanup-uploads', protect, authorize('admin'), async (req, res) => {
  try {
    // Get all accounts with their file paths
    const accounts = await Account.find({}, 'attachedFile');
    const validFilePaths = new Set(accounts.map(acc => acc.attachedFile).filter(Boolean));

    // Read all files in the uploads directory
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const files = fs.readdirSync(uploadsDir);

    // Track deleted files and errors
    const deletedFiles = [];
    const errors = [];

    // Check each file
    for (const file of files) {
      const filePath = path.join('uploads', file);
      // If file is not in database, delete it
      if (!validFilePaths.has(filePath)) {
        try {
          fs.unlinkSync(path.join(__dirname, '..', 'uploads', file));
          deletedFiles.push(file);
        } catch (err) {
          errors.push({ file, error: err.message });
        }
      }
    }

    res.json({
      success: true,
      message: 'Cleanup completed',
      deletedFiles,
      errors,
      remainingFiles: files.length - deletedFiles.length
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Error during cleanup', error: error.message });
  }
});

module.exports = router; 