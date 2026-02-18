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
 * @param {array} initialImages - Images to load from draft (optional)
 * @param {boolean} hasError - Whether to show error styling (optional)
 */
export default function ImageUploader({ 
  questionKey, 
  questionText, 
  serialNumber, 
  maintenanceType,
  onImagesChange,
  initialImages = [],
  hasError = false
}) {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef(null);
  const isInitialMount = useRef(true);
  // Track if user has made changes (upload/delete) - if so, don't reload from initialImages
  const userHasModifiedImages = useRef(false);
  // Track the last initialImages we loaded to detect actual changes
  const lastLoadedInitialImages = useRef(null);

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

  // Load images on mount - DRAFT ALWAYS TRUMPS LOCALSTORAGE
  useEffect(() => {
    // If user has made changes, don't override their work
    if (userHasModifiedImages.current) return;

    const loadImages = () => {
      let imagesToLoad = null;
      let source = null;

      // PRIORITY 1: Draft from Airtable (initialImages from props)
      if (initialImages?.length > 0) {
        const currentJson = JSON.stringify(initialImages);
        const lastJson = JSON.stringify(lastLoadedInitialImages.current);
        
        // Only load if actually different
        if (currentJson !== lastJson) {
          imagesToLoad = initialImages;
          source = 'draft';
        }
      }
      // PRIORITY 2: localStorage (only on first mount AND no draft)
      else if (isInitialMount.current && (!initialImages || initialImages.length === 0)) {
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            imagesToLoad = JSON.parse(saved);
            source = 'localStorage';
          }
        } catch (e) {
          console.error('Failed to load saved images:', e);
        }
      }

      // Update state if we have images to load
      if (imagesToLoad && imagesToLoad.length > 0) {
        setImages(imagesToLoad);
        if (onImagesChange) {
          onImagesChange(imagesToLoad);
        }
        lastLoadedInitialImages.current = imagesToLoad;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`✓ Loaded ${imagesToLoad.length} images from ${source}`);
        }
      } else if (isInitialMount.current) {
        lastLoadedInitialImages.current = [];
      }

      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
    };

    loadImages();
  }, [initialImages, storageKey, onImagesChange]);

  // Save images to localStorage whenever they change (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
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

    // Determine resource type based on file
    const isPDF = file.type === 'application/pdf';
    const isVideo = file.type.startsWith('video/');

    let uploadUrl;
    if (isVideo) {
      uploadUrl = 'https://api.cloudinary.com/v1_1/zelimmaintenanceportal/video/upload';
    } else {
      // Both images and PDFs use the image endpoint — PDFs support pg_1 thumbnail transformation
      uploadUrl = 'https://api.cloudinary.com/v1_1/zelimmaintenanceportal/image/upload';
    }

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
        // For PDFs, use first page as thumbnail - replace extension so browser treats as JPEG
        thumbnail = data.secure_url.replace('/upload/', '/upload/w_150,h_150,c_fill,pg_1,f_jpg/').replace(/\.pdf$/i, '.jpg');
      } else if (isVideo) {
        // For videos, use first frame as thumbnail
        thumbnail = data.secure_url.replace('/upload/', '/upload/w_150,h_150,c_fill,so_0/').replace(/\.\w+$/, '.jpg');
      } else {
        // For images, create thumbnail
        thumbnail = data.secure_url.replace('/upload/', '/upload/w_150,h_150,c_fill/');
      }

      // For videos, rewrite URL to serve as MP4 via Cloudinary transcoding.
      // This fixes .mov and other non-browser-friendly formats (e.g. from iPhones).
      // q_auto:best preserves quality instead of Cloudinary's heavy default compression.
      // For PDFs, f_pdf forces application/pdf content-type; fl_inline ensures browser opens inline.
      let fileUrl;
      if (isVideo) {
        fileUrl = data.secure_url.replace('/upload/', '/upload/f_mp4,q_auto:best/').replace(/\.[^/.]+$/, '.mp4');
      } else if (isPDF) {
        fileUrl = data.secure_url.replace('/upload/', '/upload/f_pdf,fl_inline/');
      } else {
        fileUrl = data.secure_url;
      }

      return {
        url: fileUrl,
        publicId: data.public_id,
        thumbnail: thumbnail,
        filename: file.name,
        fileType: isPDF ? 'pdf' : isVideo ? 'video' : 'image',
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
      
      // Mark that user has modified images
      userHasModifiedImages.current = true;
      
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
    // Mark that user has modified images
    userHasModifiedImages.current = true;
    
    // Use functional update to avoid images dependency
    setImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      if (onImagesChange) {
        onImagesChange(newImages);
      }
      return newImages;
    });
  }, [onImagesChange]);

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
        className={`image-drop-zone ${hasError ? 'has-error' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf,.pdf"
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
                ? "Click to take photo(s) or upload" 
                : (
                  <>
                    Click to upload images
                    <br />
                    or drag files here
                  </>
                )
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

        .thumbnail-remove {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: rgb(0, 255, 246);
          color: rgb(13, 48, 55);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          z-index: 10;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .thumbnail-remove:hover {
          background-color: #01e6dd;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}