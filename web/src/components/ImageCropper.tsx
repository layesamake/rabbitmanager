import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../lib/cropImage';
import { X, Check } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = async () => {
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  const content = (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col">
      <div className="flex justify-between items-center p-4 text-white z-10 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
        <span className="font-heading font-semibold">Recadrer la photo</span>
        <button onClick={showCroppedImage} className="p-2 hover:bg-white/10 rounded-full transition-colors text-primary">
          <Check className="w-6 h-6" />
        </button>
      </div>
      
      <div className="relative flex-1 w-full h-full min-h-0 bg-black">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={setZoom}
        />
      </div>

      <div className="p-6 pb-12 z-10 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <span className="text-white text-xs font-medium">Zoom</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
