
import React, { useState, useRef, useCallback } from 'react';
import { Scene } from './components/Scene';
import { TreeState } from './types';
import { GestureController } from './components/GestureController';

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.FORMED);
  
  // Ref to share rotation data between Gesture Controller and Scene loop
  const rotationRef = useRef({ x: 0.5, y: 0.5, isPresent: false });

  const handleStateChange = useCallback((newState: TreeState) => {
    setTreeState(newState);
  }, []);

  const handleRotationChange = useCallback((x: number, y: number, isPresent: boolean) => {
    rotationRef.current = { x, y, isPresent };
  }, []);

  // Helper for UI styling based on active state
  const getInstructionClass = (isActive: boolean) => 
    `flex items-center justify-end gap-3 font-serif tracking-widest uppercase text-sm drop-shadow-lg transition-all duration-300 ${
      isActive 
        ? 'text-white scale-105 opacity-100 drop-shadow-[0_0_10px_rgba(253,224,71,0.5)]' 
        : 'text-yellow-100/40 scale-100 opacity-60'
    }`;

  const getIconClass = (isActive: boolean) =>
    `w-12 h-12 rounded-full border flex items-center justify-center text-xs backdrop-blur-sm transition-all duration-300 ${
      isActive
        ? 'border-yellow-400 bg-yellow-400/20 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
        : 'border-yellow-400/30 bg-black/40'
    }`;

  return (
    <div className="w-full h-screen relative bg-gray-900 overflow-hidden select-none">
      
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Scene state={treeState} rotationRef={rotationRef} />
      </div>

      {/* Vision Controller */}
      <GestureController 
        onStateChange={handleStateChange} 
        onRotationChange={handleRotationChange}
      />

      {/* Styles for custom animation */}
      <style>{`
        @keyframes shine {
          to {
            background-position: 200% center;
          }
        }
        .text-shine {
          background: linear-gradient(
            to right, 
            #fde047 20%, 
            #fff 40%, 
            #fff 60%, 
            #fde047 80%
          );
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shine 3s linear infinite;
        }
      `}</style>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8 md:p-16">
        
        {/* Header */}
        <header className="flex flex-col items-center justify-center text-center animate-fade-in-down mt-8">
          <div className="relative border-b border-yellow-400/50 pb-2 mb-4 px-4 backdrop-blur-sm bg-black/10 rounded-lg inline-block">
             <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-widest uppercase whitespace-nowrap text-shine drop-shadow-md">
              Merry Christmas
             </h1>
             <div className="absolute -bottom-5 right-0 text-[10px] md:text-xs text-yellow-400/70 font-sans tracking-[0.2em] font-light">
               CHRISTMAS TREE BY M0K
             </div>
          </div>
        </header>

        {/* Footer / Gesture Instructions */}
        <footer className="flex flex-col items-end gap-6 w-full pb-8 pr-4">
           
           <div className="flex flex-col gap-3">
              {/* Pinch -> WORD */}
              <div className={getInstructionClass(treeState === TreeState.WORD)}>
                <span>Pinch</span>
                <div className={getIconClass(treeState === TreeState.WORD)}>
                   👌
                </div>
                <span className={`text-xs w-20 text-right ${treeState === TreeState.WORD ? 'text-emerald-300 font-bold' : 'text-emerald-400/60'}`}>
                  Show Text
                </span>
              </div>

              {/* Open Hand -> CHAOS */}
              <div className={getInstructionClass(treeState === TreeState.CHAOS)}>
                <span>Open Hand</span>
                <div className={getIconClass(treeState === TreeState.CHAOS)}>
                   🖐️
                </div>
                <span className={`text-xs w-20 text-right ${treeState === TreeState.CHAOS ? 'text-emerald-300 font-bold' : 'text-emerald-400/60'}`}>
                  Chaos
                </span>
              </div>

              {/* Fist/Default -> FORMED */}
              <div className={getInstructionClass(treeState === TreeState.FORMED)}>
                <span>Fist/Rest</span>
                <div className={getIconClass(treeState === TreeState.FORMED)}>
                   ✊
                </div>
                <span className={`text-xs w-20 text-right ${treeState === TreeState.FORMED ? 'text-emerald-300 font-bold' : 'text-emerald-400/60'}`}>
                  Form Tree
                </span>
              </div>
           </div>

           <div className="text-yellow-400/40 text-[10px] font-sans tracking-[0.2em] uppercase text-right max-w-xs leading-relaxed">
             Move hand to rotate view
             <br/>
             Ensure camera is enabled
           </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
