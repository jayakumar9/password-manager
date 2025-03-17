import { generatePDFPreview } from './utils';

export const handleFileChange = async (e, setFormData, setFilePreview, showNotification) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showNotification('File size must be less than 5MB', 'error');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      attachedFile: file
    }));

    // Create preview based on file type
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview({
          contentType: 'image',
          url: reader.result,
          name: file.name,
          size: file.size,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      try {
        const pdfPreviewUrl = await generatePDFPreview(file);
        setFilePreview({
          contentType: 'pdf',
          url: pdfPreviewUrl,
          name: file.name,
          size: file.size,
          mimeType: file.type
        });
      } catch (error) {
        console.error('Error generating PDF preview:', error);
        showNotification('Error generating PDF preview', 'error');
      }
    } else {
      // For other file types, show icon based on extension
      const fileExtension = file.name.split('.').pop().toLowerCase();
      let iconType = 'document';
      
      if (['doc', 'docx'].includes(fileExtension)) {
        iconType = 'word';
      } else if (['txt', 'rtf'].includes(fileExtension)) {
        iconType = 'text';
      }
      
      setFilePreview({
        contentType: iconType,
        name: file.name,
        size: file.size,
        mimeType: file.type
      });
    }
  } else {
    setFilePreview(null);
  }
};

export const handleViewFile = async (attachedFile, accountId) => {
  if (!attachedFile || !accountId) {
    throw new Error('No file attached to this account');
  }

  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Authentication token not found');
  }

  console.log('Viewing file:', {
    filename: attachedFile.filename,
    contentType: attachedFile.contentType,
    size: attachedFile.size,
    uploadDate: attachedFile.uploadDate
  });

  // Construct file URL using GridFS ID or Base64 data
  const fileUrl = attachedFile.gridFSId 
    ? `/api/accounts/files/${attachedFile.gridFSId}`
    : `data:${attachedFile.contentType};base64,${attachedFile.data}`;

  // For Base64 data, handle directly
  if (attachedFile.data) {
    openFileViewer(fileUrl, attachedFile);
    return;
  }

  // For GridFS files, fetch from server
  try {
    const response = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        throw new Error(data.message || data.details || 'Failed to load file');
      }
      throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    openFileViewer(url, attachedFile);
  } catch (error) {
    console.error('File handling error:', error);
    throw error;
  }
};

const openFileViewer = (url, attachedFile) => {
  const isPDF = attachedFile.contentType === 'application/pdf';
  const isImage = attachedFile.contentType.startsWith('image/');
  const isText = attachedFile.contentType.startsWith('text/') || 
                 attachedFile.contentType === 'application/msword' || 
                 attachedFile.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  if (isImage) {
    openImageViewer(url, attachedFile);
  } else if (isPDF) {
    openPDFViewer(url, attachedFile);
  } else if (isText) {
    openTextViewer(url, attachedFile);
  } else {
    // For other files, trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = attachedFile.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

const openPDFViewer = (url, attachedFile) => {
  const newWindow = window.open('', '_blank');
  if (!newWindow) {
    throw new Error('Popup blocked. Please allow popups to view PDFs.');
  }

  newWindow.document.write(`
    <html>
      <head>
        <title>PDF Viewer - ${attachedFile.filename}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: #1a1a1a;
            color: white;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .loading {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            text-align: center;
          }
          iframe {
            width: 100%;
            height: 90vh;
            border: none;
            background: white;
          }
          .info {
            margin: 10px 0;
            color: #888;
          }
          .refresh-notice {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            display: none;
          }
        </style>
      </head>
      <body>
        <div class="loading">Loading PDF...</div>
        <div class="refresh-notice">PDF will refresh in <span id="countdown">10</span> seconds...</div>
        <iframe src="${url}#toolbar=0" style="display: none;"></iframe>
        <div class="info">
          Filename: ${attachedFile.filename}<br>
          Size: ${(attachedFile.size / 1024).toFixed(2)} KB<br>
          Type: ${attachedFile.contentType}
        </div>
        <script>
          const iframe = document.querySelector('iframe');
          const loading = document.querySelector('.loading');
          const refreshNotice = document.querySelector('.refresh-notice');
          const countdown = document.getElementById('countdown');
          
          iframe.onload = function() {
            loading.style.display = 'none';
            iframe.style.display = 'block';
            
            // Show refresh notice and start countdown
            refreshNotice.style.display = 'block';
            let seconds = 10;
            const timer = setInterval(() => {
              seconds--;
              countdown.textContent = seconds;
              if (seconds <= 0) {
                clearInterval(timer);
                location.reload();
              }
            }, 1000);
          };

          window.onunload = function() {
            URL.revokeObjectURL("${url}");
          };
        </script>
      </body>
    </html>
  `);
  newWindow.document.close();
};

const openImageViewer = (url, attachedFile) => {
  const newWindow = window.open('', '_blank');
  if (!newWindow) {
    throw new Error('Popup blocked. Please allow popups to view images.');
  }
  newWindow.document.write(getImageViewerContent(url, attachedFile));
  newWindow.document.close();
};

const getImageViewerContent = (url, attachedFile) => `
  <html>
    <head>
      <title>Image Viewer - ${attachedFile.filename}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          margin: 0;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
          background: #1a1a1a;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .container {
          max-width: 95vw;
          max-height: 95vh;
          position: relative;
        }
        img {
          max-width: 100%;
          max-height: 85vh;
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          display: none;
        }
        .filename {
          color: white;
          text-align: center;
          margin: 20px 0;
          font-size: 16px;
        }
        .loading {
          color: white;
          text-align: center;
          margin: 20px;
        }
        .error {
          color: #ff4444;
          text-align: center;
          margin: 20px;
        }
        .close-button {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          z-index: 1000;
        }
        .close-button:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .file-info {
          color: #888;
          font-size: 14px;
          text-align: center;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <button class="close-button" onclick="window.close()">Close</button>
      <div class="container">
        <div class="loading">Loading image...</div>
        <img 
          src="${url}"
          alt="${attachedFile.filename}"
          onload="this.style.display='block'; this.previousElementSibling.style.display='none';"
          onerror="this.style.display='none'; this.previousElementSibling.className='error'; this.previousElementSibling.textContent='Error loading image';"
        />
        <div class="filename">${attachedFile.filename}</div>
        <div class="file-info">
          Size: ${(attachedFile.size / 1024).toFixed(2)} KB
          <br>
          Type: ${attachedFile.contentType}
          <br>
          Uploaded: ${new Date(attachedFile.uploadDate).toLocaleString()}
        </div>
      </div>
      <script>
        window.onunload = function() {
          URL.revokeObjectURL("${url}");
        };
      </script>
    </body>
  </html>
`;

const openTextViewer = (url, attachedFile) => {
  const newWindow = window.open('', '_blank');
  if (!newWindow) {
    throw new Error('Popup blocked. Please allow popups to view files.');
  }
  newWindow.document.write(`
    <html>
      <head>
        <title>File Viewer - ${attachedFile.filename}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            margin: 0;
            padding: 20px;
            background: #1a1a1a;
            color: #ffffff;
            font-family: system-ui, -apple-system, sans-serif;
          }
          .content {
            background: #2a2a2a;
            padding: 20px;
            border-radius: 8px;
            white-space: pre-wrap;
            word-wrap: break-word;
            max-width: 100%;
            overflow-x: auto;
            font-size: 14px;
            line-height: 1.5;
            display: none;
          }
          .loading {
            color: white;
            text-align: center;
            margin: 20px;
          }
          .error {
            color: #ff4444;
            text-align: center;
            margin: 20px;
          }
          .filename {
            color: white;
            margin-bottom: 20px;
            font-size: 16px;
          }
          .close-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
          }
          .close-button:hover {
            background: rgba(255, 255, 255, 0.3);
          }
          .file-info {
            color: #888;
            font-size: 14px;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <button class="close-button" onclick="window.close()">Close</button>
        <div class="filename">${attachedFile.filename}</div>
        <div class="file-info">
          Size: ${(attachedFile.size / 1024).toFixed(2)} KB<br>
          Type: ${attachedFile.contentType}<br>
          Uploaded: ${new Date(attachedFile.uploadDate).toLocaleString()}
        </div>
        <div class="loading">Loading content...</div>
        <div class="content"></div>
        <script>
          fetch("${url}")
            .then(response => {
              if (!response.ok) throw new Error('Failed to load file content');
              return response.text();
            })
            .then(text => {
              document.querySelector('.content').textContent = text;
              document.querySelector('.content').style.display = 'block';
              document.querySelector('.loading').style.display = 'none';
            })
            .catch(error => {
              document.querySelector('.loading').className = 'error';
              document.querySelector('.loading').textContent = 'Error loading file: ' + error.message;
            })
            .finally(() => {
              setTimeout(() => URL.revokeObjectURL("${url}"), 1000);
            });
        </script>
      </body>
    </html>
  `);
  newWindow.document.close();
}; 