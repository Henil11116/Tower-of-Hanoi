import { useState, useRef } from 'react';

type Peg = number[];
type Pegs = [Peg, Peg, Peg];

const DISK_COLORS = [
  'from-red-500 to-red-600',
  'from-orange-500 to-orange-600',
  'from-yellow-500 to-yellow-600',
  'from-green-500 to-green-600',
  'from-teal-500 to-teal-600',
  'from-blue-500 to-blue-600',
  'from-indigo-500 to-indigo-600',
  'from-purple-500 to-purple-600',
  'from-pink-500 to-pink-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
  'from-lime-500 to-lime-600',
];

interface DiskProps {
  size: number;
  totalDisks: number;
  isTop: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function Disk({ size, totalDisks, isTop, isDragging, onDragStart, onDragEnd }: DiskProps) {
  const widthPercent = 40 + (size / totalDisks) * 55;
  
  return (
    <div
      draggable={isTop}
      onDragStart={(e) => {
        if (!isTop) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('text/plain', size.toString());
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`
        h-8 rounded-lg bg-gradient-to-b ${DISK_COLORS[size - 1]}
        shadow-lg border-2 border-white/20
        flex items-center justify-center text-white font-bold text-sm
        ${isTop ? 'cursor-grab active:cursor-grabbing hover:scale-105' : 'cursor-default'}
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        transition-all duration-150
      `}
      style={{ width: `${widthPercent}%` }}
    >
      {size}
    </div>
  );
}

interface PegProps {
  pegs: Pegs;
  pegIndex: number;
  totalDisks: number;
  isSelected: boolean;
  isValidDrop: boolean | null;
  draggingDisk: number | null;
  hintFrom: boolean;
  hintTo: boolean;
  onDragStart: (disk: number) => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onClick: () => void;
}

function Peg({
  pegs,
  pegIndex,
  totalDisks,
  isSelected,
  isValidDrop,
  draggingDisk,
  hintFrom,
  hintTo,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onClick,
}: PegProps) {
  const peg = pegs[pegIndex];
  const pegLabels = ['A', 'B', 'C'];
  
  // Calculate dynamic heights based on disk count
  // Each disk is 32px (h-8) + 4px gap = 36px per disk
  // Add some padding for the base
  const diskHeight = 32;
  const diskGap = 4;
  const basePadding = 20;
  const containerHeight = (totalDisks * (diskHeight + diskGap)) + basePadding;
  const poleHeight = containerHeight - 12; // Slightly shorter than container

  return (
    <div
      className={`
        flex flex-col items-center p-4 rounded-xl transition-all duration-200
        ${isSelected ? 'bg-blue-500/20 ring-2 ring-blue-500' : 'bg-white/5'}
        ${isValidDrop === true ? 'bg-green-500/20 ring-2 ring-green-500' : ''}
        ${isValidDrop === false ? 'bg-red-500/20 ring-2 ring-red-500' : ''}
        ${hintFrom ? 'bg-yellow-500/20 ring-2 ring-yellow-400 animate-pulse' : ''}
        ${hintTo ? 'bg-cyan-500/20 ring-2 ring-cyan-400 animate-pulse' : ''}
      `}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onClick={onClick}
    >
      <div className="text-white/60 font-semibold mb-2">Peg {pegLabels[pegIndex]}</div>
      
      <div 
        className="relative w-full flex flex-col justify-end items-center transition-all duration-300"
        style={{ height: `${containerHeight}px` }}
      >
        {/* Peg pole */}
        <div 
          className="absolute bottom-0 w-3 bg-gradient-to-t from-amber-700 to-amber-500 rounded-t-full shadow-lg transition-all duration-300" 
          style={{ height: `${poleHeight}px` }}
        />
        
        {/* Peg base */}
        <div className="absolute bottom-0 w-full h-3 bg-gradient-to-t from-amber-800 to-amber-600 rounded-lg shadow-lg" />
        
        {/* Disks */}
        <div className="relative z-10 flex flex-col-reverse items-center gap-1 pb-4 w-full">
          {peg.map((disk, index) => (
            <Disk
              key={disk}
              size={disk}
              totalDisks={totalDisks}
              isTop={index === peg.length - 1}
              isDragging={draggingDisk === disk}
              onDragStart={() => onDragStart(disk)}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface HistoryState {
  pegs: Pegs;
  moves: number;
}

export default function App() {
  const [diskCount, setDiskCount] = useState(4);
  const [pegs, setPegs] = useState<Pegs>(() => initializePegs(4));
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [draggingDisk, setDraggingDisk] = useState<number | null>(null);
  const [dragOverPeg, setDragOverPeg] = useState<number | null>(null);
  const [isAutoSolving, setIsAutoSolving] = useState(false);
  const [solveSpeed, setSolveSpeed] = useState(500);
  const [isDragging, setIsDragging] = useState(false);
  const autoSolveRef = useRef(false);
  
  // Undo/Redo history
  const [history, setHistory] = useState<HistoryState[]>(() => [{
    pegs: initializePegs(4),
    moves: 0
  }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Hint state
  const [hint, setHint] = useState<{ from: number; to: number } | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function initializePegs(n: number): Pegs {
    const disks = Array.from({ length: n }, (_, i) => n - i);
    return [disks, [], []];
  }

  const optimalMoves = Math.pow(2, diskCount) - 1;
  const isComplete = pegs[2].length === diskCount;

  function resetGame(newDiskCount?: number) {
    const count = newDiskCount ?? diskCount;
    const initialPegs = initializePegs(count);
    setDiskCount(count);
    setPegs(initialPegs);
    setSelectedPeg(null);
    setMoves(0);
    setDraggingDisk(null);
    setDragOverPeg(null);
    autoSolveRef.current = false;
    setIsAutoSolving(false);
    // Reset history
    setHistory([{ pegs: initialPegs, moves: 0 }]);
    setHistoryIndex(0);
    // Clear hint
    clearHint();
  }

  function isValidMove(fromPeg: number, toPeg: number): boolean {
    if (fromPeg === toPeg) return false;
    if (pegs[fromPeg].length === 0) return false;
    const disk = pegs[fromPeg][pegs[fromPeg].length - 1];
    const targetTop = pegs[toPeg][pegs[toPeg].length - 1];
    return targetTop === undefined || disk < targetTop;
  }

  function makeMove(fromPeg: number, toPeg: number) {
    if (!isValidMove(fromPeg, toPeg)) return false;
    
    // Clear hint when a move is made
    clearHint();
    
    const newPegs: Pegs = [pegs[0].slice(), pegs[1].slice(), pegs[2].slice()];
    const disk = newPegs[fromPeg].pop()!;
    newPegs[toPeg].push(disk);
    const newMoves = moves + 1;
    
    setPegs(newPegs);
    setMoves(newMoves);
    
    // Add to history (clear any future states if we're not at the end)
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ pegs: newPegs, moves: newMoves });
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
    
    return true;
  }

  function handlePegClick(pegIndex: number) {
    if (isAutoSolving) return;
    if (isDragging) return;

    if (selectedPeg === null) {
      if (pegs[pegIndex].length > 0) {
        setSelectedPeg(pegIndex);
      }
    } else {
      if (pegIndex !== selectedPeg) {
        makeMove(selectedPeg, pegIndex);
      }
      setSelectedPeg(null);
    }
  }

  function handleDragStart(disk: number) {
    setIsDragging(true);
    setDraggingDisk(disk);
    setSelectedPeg(null);
  }

  function handleDragEnd() {
    setTimeout(() => {
      setIsDragging(false);
    }, 0);
    setDraggingDisk(null);
    setDragOverPeg(null);
  }

  function handleDrop(toPeg: number) {
    if (draggingDisk === null) return;
    
    const fromPeg = pegs.findIndex((peg) => peg[peg.length - 1] === draggingDisk);
    if (fromPeg !== -1) {
      makeMove(fromPeg, toPeg);
    }
    setIsDragging(false);
    setDraggingDisk(null);
    setDragOverPeg(null);
  }

  function getDropValidity(pegIndex: number): boolean | null {
    if (draggingDisk === null || dragOverPeg !== pegIndex) return null;
    const targetTop = pegs[pegIndex][pegs[pegIndex].length - 1];
    return targetTop === undefined || draggingDisk < targetTop;
  }

  function undo() {
    if (historyIndex <= 0 || isAutoSolving) return;
    const newIndex = historyIndex - 1;
    const state = history[newIndex];
    setPegs([state.pegs[0].slice(), state.pegs[1].slice(), state.pegs[2].slice()]);
    setMoves(state.moves);
    setHistoryIndex(newIndex);
    setSelectedPeg(null);
  }

  function redo() {
    if (historyIndex >= history.length - 1 || isAutoSolving) return;
    const newIndex = historyIndex + 1;
    const state = history[newIndex];
    setPegs([state.pegs[0].slice(), state.pegs[1].slice(), state.pegs[2].slice()]);
    setMoves(state.moves);
    setHistoryIndex(newIndex);
    setSelectedPeg(null);
  }

  const canUndo = historyIndex > 0 && !isAutoSolving;
  const canRedo = historyIndex < history.length - 1 && !isAutoSolving;

  // Function to get all optimal moves from a given state
  function getOptimalMoves(currentPegs: Pegs, n: number, target: number = 2): [number, number][] {
    const moves: [number, number][] = [];
    
    // Find where disks currently are
    function findDisk(disk: number): number {
      for (let p = 0; p < 3; p++) {
        if (currentPegs[p].includes(disk)) return p;
      }
      return -1;
    }
    
    // Recursive function to solve from current state
    function solveDisk(disk: number, targetPeg: number, tempPegs: Pegs) {
      if (disk === 0) return;
      
      const currentPeg = findDisk(disk);
      if (currentPeg === targetPeg) {
        // Disk is already on target, just solve smaller disks
        solveDisk(disk - 1, targetPeg, tempPegs);
        return;
      }
      
      // Find auxiliary peg (not current, not target)
      const auxPeg = [0, 1, 2].find(p => p !== currentPeg && p !== targetPeg)!;
      
      // Move all smaller disks to aux peg
      solveDisk(disk - 1, auxPeg, tempPegs);
      
      // Move this disk to target
      moves.push([currentPeg, targetPeg]);
      const diskValue = tempPegs[currentPeg].pop()!;
      tempPegs[targetPeg].push(diskValue);
      
      // Move smaller disks from aux to target
      solveFromScratch(disk - 1, auxPeg, targetPeg, tempPegs);
    }
    
    function solveFromScratch(disk: number, from: number, to: number, tempPegs: Pegs) {
      if (disk === 0) return;
      const aux = [0, 1, 2].find(p => p !== from && p !== to)!;
      solveFromScratch(disk - 1, from, aux, tempPegs);
      moves.push([from, to]);
      const diskValue = tempPegs[from].pop()!;
      tempPegs[to].push(diskValue);
      solveFromScratch(disk - 1, aux, to, tempPegs);
    }
    
    // Create a copy of the pegs to work with
    const tempPegs: Pegs = [
      currentPegs[0].slice(),
      currentPegs[1].slice(),
      currentPegs[2].slice()
    ];
    
    solveDisk(n, target, tempPegs);
    return moves;
  }

  function showHint() {
    if (isAutoSolving || isComplete) return;
    
    // Clear existing hint timeout
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }
    
    const optimalMoves = getOptimalMoves(pegs, diskCount, 2);
    
    if (optimalMoves.length > 0) {
      const nextMove = optimalMoves[0];
      setHint({ from: nextMove[0], to: nextMove[1] });
      
      // Clear hint after 2 seconds
      hintTimeoutRef.current = setTimeout(() => {
        setHint(null);
      }, 2000);
    }
  }

  function clearHint() {
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }
    setHint(null);
  }

  async function autoSolve() {
    autoSolveRef.current = true;
    setIsAutoSolving(true);
    setSelectedPeg(null);
    
    const moves: [number, number][] = [];
    
    function hanoi(n: number, from: number, to: number, aux: number) {
      if (n === 0) return;
      hanoi(n - 1, from, aux, to);
      moves.push([from, to]);
      hanoi(n - 1, aux, to, from);
    }
    
    setPegs(initializePegs(diskCount));
    setMoves(0);
    
    await new Promise((r) => setTimeout(r, solveSpeed));
    
    hanoi(diskCount, 0, 2, 1);
    
    for (const [from, to] of moves) {
      if (!autoSolveRef.current) break;
      
      setPegs((prev) => {
        const newPegs: Pegs = [prev[0].slice(), prev[1].slice(), prev[2].slice()];
        const disk = newPegs[from].pop()!;
        newPegs[to].push(disk);
        return newPegs;
      });
      setMoves((m) => m + 1);
      
      await new Promise((r) => setTimeout(r, solveSpeed));
    }
    
    setIsAutoSolving(false);
    autoSolveRef.current = false;
  }

  function stopAutoSolve() {
    autoSolveRef.current = false;
    setIsAutoSolving(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 mb-2">
            Tower of Hanoi
          </h1>
          <p className="text-white/60">
            Move all disks from Peg A to Peg C
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 text-center">
            <div className="text-2xl font-bold text-white">{moves}</div>
            <div className="text-white/60 text-sm">Moves</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 text-center">
            <div className="text-2xl font-bold text-amber-400">{optimalMoves}</div>
            <div className="text-white/60 text-sm">Optimal</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 text-center">
            <div className="text-2xl font-bold text-white">{diskCount}</div>
            <div className="text-white/60 text-sm">Disks</div>
          </div>
        </div>

        {/* Game Board */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6 mb-8">
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {[0, 1, 2].map((pegIndex) => (
              <Peg
                key={pegIndex}
                pegs={pegs}
                pegIndex={pegIndex}
                totalDisks={diskCount}
                isSelected={selectedPeg === pegIndex}
                isValidDrop={getDropValidity(pegIndex)}
                draggingDisk={draggingDisk}
                hintFrom={hint?.from === pegIndex}
                hintTo={hint?.to === pegIndex}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={() => handleDrop(pegIndex)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setDragOverPeg(pegIndex)}
                onDragLeave={() => setDragOverPeg(null)}
                onClick={() => handlePegClick(pegIndex)}
              />
            ))}
          </div>
        </div>

        {/* Win Message */}
        {isComplete && !isAutoSolving && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl p-6 mb-8 text-center border border-green-500/30">
            <div className="text-3xl mb-2">🎉</div>
            <div className="text-2xl font-bold text-green-400 mb-2">Congratulations!</div>
            <div className="text-white/80">
              You solved it in {moves} moves!
              {moves === optimalMoves && (
                <span className="text-amber-400 ml-2">✨ Perfect!</span>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6">
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <button
              onClick={() => resetGame()}
              disabled={isAutoSolving}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
            >
              🔄 Reset
            </button>
            
            <button
              onClick={undo}
              disabled={!canUndo}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
            >
              ↩️ Undo
            </button>
            
            <button
              onClick={redo}
              disabled={!canRedo}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
            >
              ↪️ Redo
            </button>
            
            <button
              onClick={showHint}
              disabled={isAutoSolving || isComplete}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
            >
              💡 Hint
            </button>
            
            {!isAutoSolving ? (
              <button
                onClick={autoSolve}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
              >
                🤖 Auto Solve
              </button>
            ) : (
              <button
                onClick={stopAutoSolve}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
              >
                ⏹ Stop
              </button>
            )}
          </div>

          {/* Disk Count Selector */}
          <div className="flex flex-wrap justify-center items-center gap-4 mb-4">
            <span className="text-white/80">Number of Disks:</span>
            <div className="flex gap-2">
              {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                <button
                  key={n}
                  onClick={() => resetGame(n)}
                  disabled={isAutoSolving}
                  className={`
                    w-10 h-10 rounded-lg font-bold transition-all duration-200
                    ${diskCount === n
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Speed Control */}
          <div className="flex flex-wrap justify-center items-center gap-4">
            <span className="text-white/80">Auto-Solve Speed:</span>
            <div className="flex gap-2">
              {[
                { label: 'Slow', value: 800 },
                { label: 'Medium', value: 500 },
                { label: 'Fast', value: 200 },
              ].map((speed) => (
                <button
                  key={speed.value}
                  onClick={() => setSolveSpeed(speed.value)}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all duration-200
                    ${solveSpeed === speed.value
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                    }
                  `}
                >
                  {speed.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-white/40 text-sm">
          <p>Click to select a peg, then click destination • Or drag and drop disks directly</p>
          <p className="mt-1">Only smaller disks can be placed on larger ones</p>
        </div>
      </div>
    </div>
  );
}
