import React from 'react';
import { DocumentIcon } from '@heroicons/react/24/outline';

const FilePreview = ({ 
  filePreview, 
  formData, 
  handleFileChange, 
  handleViewFile, 
  setFilePreview, 
  setFormData, 
  formatFileSize, 
  uploadProgress, 
  uploadSpeed, 
  uploadStartTime 
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Attached File
      </label>
      {formData._id && formData.attachedFile && !filePreview && (
        <div className="mb-2 flex items-center space-x-2 text-sm text-gray-300">
          <span>Current file: </span>
          <span className="text-blue-400">
            {typeof formData.attachedFile === 'string' 
              ? formData.attachedFile.split('/').pop() 
              : formData.attachedFile.filename}
          </span>
          {typeof formData.attachedFile === 'object' && (
            <button
              type="button"
              onClick={() => handleViewFile(formData.attachedFile, formData._id)}
              className="text-blue-500 hover:text-blue-400 ml-2"
            >
              <DocumentIcon className="h-5 w-5 inline" />
              <span className="ml-1">View</span>
            </button>
          )}
        </div>
      )}
      
      <div className="mt-2 flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-600 transition-all duration-300">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {filePreview ? (
              <div className="w-full px-4 text-center">
                {filePreview.contentType === 'image' ? (
                  <div className="mb-3">
                    <img
                      src={filePreview.url}
                      alt="Preview"
                      className="max-h-32 mx-auto rounded-lg object-contain"
                    />
                  </div>
                ) : filePreview.contentType === 'pdf' && filePreview.url ? (
                  <div className="mb-3">
                    <img
                      src={filePreview.url}
                      alt="PDF Preview"
                      className="max-h-32 mx-auto rounded-lg object-contain"
                    />
                  </div>
                ) : (
                  <div className="mb-3">
                    {filePreview.contentType === 'word' ? (
                      <svg className="h-16 w-16 mx-auto text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.5 2H4.5C3.12 2 2 3.12 2 4.5v15C2 20.88 3.12 22 4.5 22h15c1.38 0 2.5-1.12 2.5-2.5v-15C22 3.12 20.88 2 19.5 2zM4.5 3.5h15c.55 0 1 .45 1 1v11.5H3.5V4.5c0-.55.45-1 1-1zm15 17h-15c-.55 0-1-.45-1-1v-3h17v3c0 .55-.45 1-1 1z"/>
                        <path d="M6 6h12v1H6zM6 8.5h12v1H6zM6 11h12v1H6z"/>
                      </svg>
                    ) : filePreview.contentType === 'text' ? (
                      <svg className="h-16 w-16 mx-auto text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                        <path d="M8 12h8v1H8zM8 15h8v1H8zM8 18h5v1H8z"/>
                      </svg>
                    ) : (
                      <DocumentIcon className="h-16 w-16 mx-auto text-gray-400" />
                    )}
                  </div>
                )}
                <div className="text-gray-300 text-sm mb-1 truncate">
                  {filePreview.name}
                </div>
                <div className="text-gray-400 text-xs">
                  {formatFileSize(filePreview.size)}
                </div>
                <div className="text-gray-400 text-xs">
                  {filePreview.mimeType}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFilePreview(null);
                    setFormData(prev => ({ ...prev, attachedFile: null }));
                  }}
                  className="mt-2 text-red-400 hover:text-red-300 text-sm"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <>
                <svg className="w-8 h-8 mb-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                </svg>
                <p className="mb-2 text-sm text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400">
                  Images, PDFs, DOC, TXT (MAX. 5MB)
                </p>
              </>
            )}
          </div>
          <input
            type="file"
            name="attachedFile"
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
        </label>
      </div>

      {formData._id && (
        <p className="mt-2 text-sm text-gray-400">
          Upload a new file to replace the existing one
        </p>
      )}

      {formData.attachedFile instanceof File && uploadProgress > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-300 mb-1">
            <span>Uploading {formData.attachedFile.name}</span>
            <span>{uploadProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          {uploadSpeed > 0 && (
            <div className="flex justify-between text-sm text-gray-400 mt-1">
              <span>{uploadSpeed.toFixed(1)} KB/s</span>
              {uploadStartTime && (
                <span>
                  Time elapsed: {((Date.now() - uploadStartTime) / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilePreview; 