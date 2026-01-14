import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Loader2, AlertCircle, X } from 'lucide-react';

/**
 * ImageUploader Component
 * 
 * A beautiful drag-and-drop image uploader that uploads to Cloudinary
 * and organizes files by product/maintenance type/serial/date/question
 * 
 * @param {string} questionKey - e.g., "q1", "q2" 
 * @param {string} questionText - e.g., "Monthly inspection checklists"
 * @param {string} serialNumber - e.g., "SWI005"
 * @param {string} maintenanceType - e.g., "annual", "monthly"
 * @param {function} onImagesChange - Callback when images are uploaded/removed
 */
export default function ImageUploader({ 
  questionKey, 
  questionText, 
  serialNumber, 
  maintenanceType,
  onImagesChange 
}) {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef(null);
  const isInitialMount = useRef(true);

  const storageKey = `images_${maintenanceType}_${serialNumber}_${questionKey}`;

  // Detect if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load saved images from localStorage on mount ONLY
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsedImages = JSON.parse(saved);
        setImages(parsedImages);
        // Only call onImagesChange if we actually loaded images
        if (parsedImages.length > 0 && onImagesChange) {
          onImagesChange(parsedImages);
        }
      } catch (e) {
        console.error('Failed to load saved images', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Save images to localStorage whenever they change (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (images.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(images));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [images, storageKey]);

  // Generate folder path for Cloudinary
  const getFolderPath = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;
    
    // Convert question text to slug (e.g., "Monthly inspection checklists" -> "monthly-inspection-checklists")
    const questionSlug = questionText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `zelimmaintenance/SWIFT/${maintenanceType}/${serialNumber}/${dateStr}/${questionSlug}`;
  };

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'maintenance-uploads');
    formData.append('folder', getFolderPath());

    // Determine if it's a PDF
    const isPDF = file.type === 'application/pdf';
    const uploadUrl = isPDF 
      ? 'https://api.cloudinary.com/v1_1/zelimmaintenanceportal/raw/upload'
      : 'https://api.cloudinary.com/v1_1/zelimmaintenanceportal/image/upload';

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      // Create thumbnail based on file type
      let thumbnail;
      if (isPDF) {
        // For PDFs, use first page as thumbnail
        thumbnail = data.secure_url.replace('/upload/', '/upload/w_150,h_150,c_fill,pg_1,f_jpg/');
      } else {
        // For images, create thumbnail
        thumbnail = data.secure_url.replace('/upload/', '/upload/w_150,h_150,c_fill/');
      }

      return {
        url: data.secure_url,
        publicId: data.public_id,
        thumbnail: thumbnail,
        filename: file.name,
        fileType: isPDF ? 'pdf' : 'image',
      };
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      throw err;
    }
  };

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;

    setError('');
    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(file => uploadToCloudinary(file));
      const uploadedImages = await Promise.all(uploadPromises);
      
      const newImages = [...images, ...uploadedImages];
      setImages(newImages);
      if (onImagesChange) {
        onImagesChange(newImages);
      }
    } catch (err) {
      setError('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const removeImage = useCallback((index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    if (onImagesChange) {
      onImagesChange(newImages);
    }
  }, [images, onImagesChange]);

  const handleRemoveClick = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    removeImage(index);
  };

  const handleRemoveTouch = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    removeImage(index);
  };

  return (
    <div className="image-uploader-container">
      {/* Drop Zone */}
      <div 
        className="image-drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={isMobile ? "image/*" : "image/*,application/pdf"}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            handleFileSelect(e.target.files);
            // Reset input value so same file can be selected again
            e.target.value = '';
          }}
        />
        
        {uploading ? (
          <div className="upload-status">
            <div className="upload-icon-circle">
              <Loader2 className="animate-spin" size={24} strokeWidth={1.5} />
            </div>
            <span>Uploading...</span>
          </div>
        ) : (
          <div className="upload-prompt">
            <div className="upload-icon-circle">
              <Camera size={24} strokeWidth={1.5} />
            </div>
            <span>
              {isMobile 
                ? "Take photo/s or upload from gallery" 
                : "Click to upload images or PDFs, or drag files here"
              }
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="upload-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Image Thumbnails */}
      {images.length > 0 && (
        <div className="image-thumbnails">
          {images.map((img, index) => (
            <div key={`${img.publicId}-${index}`} className="thumbnail-item">
              <img src={img.thumbnail} alt={`Upload ${index + 1}`} />
              <button
                type="button"
                className="thumbnail-remove"
                onClick={(e) => handleRemoveClick(e, index)}
                onTouchEnd={(e) => handleRemoveTouch(e, index)}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'rgb(0, 255, 246)',
                  color: 'rgb(13, 48, 55)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  zIndex: 10,
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#01e6dd';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgb(0, 255, 246)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <X size={14} strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}