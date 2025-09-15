import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import "./App.css";

// Component to render each image
function URLImage({ src, x = 0, y = 0 }) {
  const [image, setImage] = useState(null);

  useEffect(() => {
    const img = new window.Image();
    img.src = src;
    img.onload = () => setImage(img);

    // No immediate revoke; keep it in memory
  }, [src]);

  if (!image) return null;
  return <KonvaImage image={image} x={x} y={y} />;
}

export default function App() {
  const [images, setImages] = useState([]);
  const stageRef = useRef(null);

  // Handle image drop on the Stage
const handleDrop = async (e) => {
  e.preventDefault(); // ✅ absolutely necessary
  if (!stageRef.current) return;

  stageRef.current.setPointersPositions(e);
  const pos = stageRef.current.getPointerPosition();
  if (!pos) return;

  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith("image/")) return;

  const previewUrl = URL.createObjectURL(file);
  setImages((prev) => [...prev, { url: previewUrl, x: pos.x, y: pos.y }]);

  // Optional: upload to backend
  const form = new FormData();
  form.append("image", file);
  form.append("x", pos.x);
  form.append("y", pos.y);
  try {
    await fetch("http://localhost:4000/api/drop", {
      method: "POST",
      body: form,
    });
  } catch (err) {
    console.error(err);
  }
};


  return (
    <div className="App">
      <header className="App-header">
        <h2>🖼️ ImageDrop</h2>
        <p>Drag & drop images anywhere on the canvas</p>
      </header>

      <div
  className="canvas-wrap"
  onDrop={(e) => {
    e.preventDefault();
    handleDrop(e);
  }}
  onDragOver={(e) => e.preventDefault()}
>
  <Stage
    ref={stageRef}
    width={window.innerWidth}
    height={window.innerHeight - 96}
    draggable
  >
    <Layer>
      {images.map((img, i) => (
        <URLImage key={i} src={img.url} x={img.x} y={img.y} />
      ))}
    </Layer>
  </Stage>
</div>

    </div>
  );
}
