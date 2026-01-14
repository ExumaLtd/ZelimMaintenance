import { useState, useRef, useEffect } from 'react';

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
  const fileInputRef = useRef(null);

  // Load saved images from localStorage on mount
  useEffect(() => {
    const storageKey = `images_${maintenanceType}_${serialNumber}_${questionKey}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsedImages = JSON.parse(saved);
        setImages(parsedImages);
        onImagesChange?.(parsedImages);
      } catch (e) {
        console.error('Failed to load saved images', e);
      }
    }
  }, [maintenanceType, serialNumber, questionKey, onImagesChange]);

  // Save images to localStorage whenever they change
  useEffect(() => {
    const storageKey = `images_${maintenanceType}_${serialNumber}_${questionKey}`;
    if (images.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(images));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [images, maintenanceType, serialNumber, questionKey]);

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

    try {
      const response = await fetch(
        'https://api.cloudinary.com/v1_1/zelimmaintenanceportal/image/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return {
        url: data.secure_url,
        publicId: data.public_id,
        thumbnail: data.secure_url.replace('/upload/', '/upload/w_150,h_150,c_fill/'),
        filename: file.name,
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
      onImagesChange?.(newImages);
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

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onImagesChange?.(newImages);
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
          accept="image/*"
          multiple
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        
        {uploading ? (
          <div className="upload-status">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>Uploading...</span>
          </div>
        ) : (
          <div className="upload-prompt">
            <i className="fa-solid fa-camera"></i>
            <span>Take photo or drag images here</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="upload-error">
          <i className="fa-solid fa-circle-exclamation"></i>
          {error}
        </div>
      )}

      {/* Image Thumbnails */}
      {images.length > 0 && (
        <div className="image-thumbnails">
          {images.map((img, index) => (
            <div key={index} className="thumbnail-item">
              <img src={img.thumbnail} alt={`Upload ${index + 1}`} />
              <button
                type="button"
                className="thumbnail-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .image-uploader-container {
          margin-top: 8px;
        }

        .image-drop-zone {
          border: 2px dashed #425558;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: rgba(66, 85, 88, 0.05);
        }

        .image-drop-zone:hover {
          border-color: #5a7073;
          background-color: rgba(66, 85, 88, 0.1);
        }

        .upload-prompt,
        .upload-status {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #425558;
        }

        .upload-prompt i,
        .upload-status i {
          font-size: 24px;
        }

        .upload-prompt span,
        .upload-status span {
          font-size: 14px;
          font-weight: 500;
        }

        .upload-error {
          margin-top: 8px;
          padding: 12px;
          background-color: #fee;
          color: #c33;
          border-radius: 6px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .image-thumbnails {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 12px;
        }

        .thumbnail-item {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #e5e7eb;
        }

        .thumbnail-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumbnail-remove {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }

        .thumbnail-remove:hover {
          background-color: rgba(0, 0, 0, 0.9);
        }

        @media (max-width: 768px) {
          .image-drop-zone {
            padding: 20px;
          }

          .upload-prompt i,
          .upload-status i {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
}