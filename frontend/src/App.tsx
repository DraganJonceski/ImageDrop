// src/App.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import io from 'socket.io-client';
import axios from 'axios';

// 🔧 
const BACKEND_URL = 'http://localhost:3000/'; // ← No trailing spaces!

const socket = io(BACKEND_URL);

const App: React.FC = () => {
  const [memes, setMemes] = useState<{ x: number; y: number; imageUrl: string }[]>([]);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dropPosition, setDropPosition] = useState<{ x: number; y: number } | null>(null); // ✅ Moved inside component

  // Load initial memes
  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/memes`)
      .then((res) => setMemes(res.data))
      .catch((err) => console.error('Failed to load memes:', err));
  }, []);

  // Listen for new memes
  useEffect(() => {
    socket.on('newMeme', (meme: { x: number; y: number; imageUrl: string }) => {
      setMemes((prev) => [...prev, meme]);
    });

    return () => {
      socket.off('newMeme');
    };
  }, []);

  // Handle zoom
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    setScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  // Handle click on canvas
  const handleClick = (e: any) => {
    if (e.target === e.currentTarget) {
      const stage = e.target.getStage(); 
      const pointer = stage.getPointerPosition();

      const scaleX = stage.scaleX();
      const scaleY = stage.scaleY();
      const mouseX = (pointer.x - stage.x()) / scaleX;
      const mouseY = (pointer.y - stage.y()) / scaleY;

      setDropPosition({ x: mouseX, y: mouseY });
      fileInputRef.current?.click(); // Open file picker
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!dropPosition) {
      alert('No position selected!');
      return;
    }

    const { x, y } = dropPosition;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('x', x.toString());
    formData.append('y', y.toString());

    axios
      .post(`${BACKEND_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(() => {
        console.log('Image uploaded at', { x, y });
      })
      .catch((err) => {
        console.error('Upload failed:', err);
        alert('Upload failed: ' + (err.response?.data || err.message));
      });

    // Reset
    setDropPosition(null);
    e.target.value = ''; // Allow re-selecting same file
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onWheel={handleWheel}
        onClick={handleClick}
        draggable
        x={stagePos.x}
        y={stagePos.y}
        scale={{ x: scale, y: scale }}
        onDragEnd={(e) => {
          setStagePos({ x: e.target.x(), y: e.target.y() });
        }}
      >
        <Layer>
          {memes.map((meme, i) => (
            <UrlImage key={i} x={meme.x} y={meme.y} src={meme.imageUrl} />
          ))}
        </Layer>
      </Stage>

      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
    </div>
  );
};

// Move UrlImage above usage or define it before return
const UrlImage: React.FC<{ x: number; y: number; src: string }> = ({ x, y, src }) => {
  const [image, status] = useImage(src);
  return status === 'loaded' ? <KonvaImage image={image} x={x} y={y} width={200} height={200} /> : null;
};

export default App;