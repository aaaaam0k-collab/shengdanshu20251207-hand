import * as THREE from 'three';

/**
 * Generates 3D positions based on text rendered to a 2D canvas.
 * Returns a Float32Array of [x, y, z, x, y, z...]
 */
export function generateTextPositions(text: string, count: number, areaWidth: number, areaHeight: number): Float32Array {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return new Float32Array(count * 3);

  // Black background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  
  // White Text
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 180px "Playfair Display", serif'; 
  
  const lines = text.split('\n');
  const lineHeight = 160;
  const startY = (height - (lines.length - 1) * lineHeight) / 2;
  
  lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineHeight);
  });

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const pixels: {x: number, y: number}[] = [];

  // Sample pixels
  for (let y = 0; y < height; y += 4) { 
      for (let x = 0; x < width; x += 4) {
          const i = (y * width + x) * 4;
          // If pixel is bright enough
          if (data[i] > 100) { 
              pixels.push({x, y});
          }
      }
  }

  const positions = new Float32Array(count * 3);
  if (pixels.length === 0) return positions;

  for (let i = 0; i < count; i++) {
      // Pick a random pixel from the text shape
      const p = pixels[Math.floor(Math.random() * pixels.length)];
      
      // Map 2D pixel to 3D space centered at 0,0
      // x: -0.5 to 0.5 * areaWidth
      // y: 0.5 to -0.5 * areaHeight (flip Y because canvas Y is down)
      
      const px = (p.x / width - 0.5) * areaWidth;
      const py = -(p.y / height - 0.5) * areaHeight; 
      
      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.0; // Depth thickness
  }

  return positions;
}
