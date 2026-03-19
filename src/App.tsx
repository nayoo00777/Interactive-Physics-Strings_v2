import React, { useEffect, useRef, useState } from 'react';
import { Vector, Rope } from './physics';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, X, Key, Maximize2, Minimize2 } from 'lucide-react';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ropesRef = useRef<Rope[]>([]);
  const mouseRef = useRef({ pos: new Vector(-100, -100), radius: 150 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Image Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const generateArtisticRender = async () => {
    if (!hasApiKey) {
      await handleSelectKey();
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              text: 'A breathtaking immersive media art installation. Glowing neon fiber optic cables hanging from a dark ceiling in a vast gallery space. The cables pulse with ethereal blue and violet light, ending in brilliant glowing orbs. The composition is dynamic, with some cables swaying as if in a breeze. Minimalist, futuristic, high-end digital art. 8k resolution, cinematic lighting, deep atmospheric depth.',
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "1K"
          },
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          const imageUrl = `data:image/png;base64,${base64EncodeString}`;
          setGeneratedImage(imageUrl);
          setShowGallery(true);
          break;
        }
      }
    } catch (error) {
      console.error('Image generation failed:', error);
      if (error instanceof Error && error.message.includes("Requested entity was not found")) {
        setHasApiKey(false);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          const { clientWidth, clientHeight } = parent;
          setDimensions({ width: clientWidth, height: clientHeight });
          canvasRef.current.width = clientWidth;
          canvasRef.current.height = clientHeight;
          
          const count = Math.floor(clientWidth / 12);
          ropesRef.current = Array.from({ length: count }, (_, i) => {
            const x = (i / count) * clientWidth + (clientWidth / count / 2);
            const length = clientHeight * 0.4 + Math.random() * (clientHeight * 0.4);
            const hue = 180 + Math.random() * 100; // Cyan to Purple range
            return new Rope(x, 0, length, 20, hue);
          });
        }
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize();

    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time += 16;
      
      // Subtle trail effect
      ctx.fillStyle = 'rgba(10, 10, 10, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const rope of ropesRef.current) {
        rope.update(mouseRef.current);
        rope.draw(ctx, time);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    mouseRef.current.pos.setXY(x, y);
  };

  const handleMouseLeave = () => {
    mouseRef.current.pos.setXY(-1000, -1000);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      {/* Immersive Canvas */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseLeave}
        className="w-full h-full cursor-none"
      />

      {/* Minimal Overlay UI */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
        <div className="flex justify-between items-start">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1"
          >
            <h1 className="text-2xl font-light tracking-[0.3em] uppercase opacity-80">Lumina Flux</h1>
            <p className="text-[10px] font-mono tracking-widest opacity-40 uppercase">Interactive Media Art Installation</p>
          </motion.div>

          <div className="flex gap-4 pointer-events-auto">
            <button
              onClick={generateArtisticRender}
              disabled={isGenerating}
              className="group flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-medium tracking-widest uppercase transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 group-hover:scale-125 transition-transform" />
              )}
              {isGenerating ? 'Synthesizing...' : 'Generate Vision'}
            </button>
            
            <button
              onClick={toggleFullScreen}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all"
              title="Toggle Fullscreen"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            className="text-[9px] font-mono tracking-[0.2em] uppercase max-w-xs leading-relaxed"
          >
            Verlet integration simulation with dynamic constraint resolution. 
            Interactive field mapping via cursor proximity.
          </motion.div>
          
          {!hasApiKey && (
            <button
              onClick={handleSelectKey}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-medium text-amber-500 tracking-widest uppercase transition-all"
            >
              <Key className="w-3 h-3" />
              Initialize API
            </button>
          )}
        </div>
      </div>

      {/* Custom Cursor */}
      <motion.div 
        className="fixed top-0 left-0 w-8 h-8 border border-white/20 rounded-full pointer-events-none mix-blend-difference z-50"
        animate={{ 
          x: mouseRef.current.pos.x - 16, 
          y: mouseRef.current.pos.y - 16,
          scale: mouseRef.current.pos.x < 0 ? 0 : 1
        }}
        transition={{ type: "spring", damping: 20, stiffness: 250, mass: 0.5 }}
      />

      {/* Image Gallery Modal */}
      <AnimatePresence>
        {showGallery && generatedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/95 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative max-w-5xl w-full bg-[#111] rounded-3xl border border-white/5 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]"
            >
              <button
                onClick={() => setShowGallery(false)}
                className="absolute top-6 right-6 p-3 bg-black/50 hover:bg-black/80 rounded-full transition-all z-10 border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
              <img 
                src={generatedImage} 
                alt="AI Generated Media Art" 
                className="w-full aspect-video object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="p-10 text-center">
                <h2 className="text-2xl font-light tracking-[0.4em] uppercase mb-4">Vision Synthesized</h2>
                <p className="text-xs opacity-40 font-mono tracking-widest uppercase max-w-2xl mx-auto leading-relaxed">
                  A high-fidelity neural interpretation of the Lumina Flux installation. 
                  Captured via Gemini 3.1 Flash Image Preview.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
