'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, Timer, Flame, AlertCircle } from 'lucide-react';

type TimerMode = 'MASH' | 'BOIL';

interface TimerStep {
    label: string;
    duration: number; // Minutes
    temperature?: number; // Only for mash
    timePoint?: number; // For boil (minutes left)
    completed?: boolean;
}

interface BrewTimerProps {
    mode: TimerMode;
    steps: TimerStep[]; // Mash steps (sequential) or Boil additions (time markers)
    totalBoilTime?: number; // Only for boil
    onStepComplete?: (step: TimerStep) => void;
    onComplete?: () => void;
}

export default function BrewTimer({ mode, steps, totalBoilTime, onStepComplete, onComplete }: BrewTimerProps) {
    const [running, setRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0); // Seconds
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [activeBoilStep, setActiveBoilStep] = useState<TimerStep | null>(null);
    const initialized = useRef(false);

    // Audio Context for Beep
    const playBeep = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
            
            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            console.error("Audio error", e);
        }
    }

    // Initialize (Once)
    useEffect(() => {
        if (initialized.current) return;

        if (mode === 'MASH' && steps.length > 0) {
            setTimeLeft(steps[0].duration * 60);
            initialized.current = true;
        } else if (mode === 'BOIL' && totalBoilTime) {
            setTimeLeft(totalBoilTime * 60);
            initialized.current = true;
        }
    }, [mode, steps, totalBoilTime]);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (running && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => {
                    const next = prev - 1;
                    
                    // BOIL LOGIC: Check for events
                    if (mode === 'BOIL') {
                        // Check if any step matches the *next* second (current minute mark)
                        const remainingMinutes = next / 60;
                        steps.forEach(step => {
                            // If we hit the exact time (with 1s tolerance)
                            if (Math.abs(step.timePoint! - remainingMinutes) < 0.05) {
                                // Trigger alert only once per step (managed by UI state effectively or just beep)
                                // We rely on the second tick.
                                if (Math.floor(next) % 60 === 0) { // On the minute
                                    playBeep();
                                    setActiveBoilStep(step);
                                    if(onStepComplete) onStepComplete(step);
                                }
                            }
                        });
                    }

                    return next;
                });
            }, 1000);
        } else if (running && timeLeft === 0) {
            // Timer Finished Phase
            if (mode === 'MASH') {
                playBeep();
                // Move to next step?
                if (currentStepIndex < steps.length - 1) {
                    const nextIndex = currentStepIndex + 1;
                    setCurrentStepIndex(nextIndex);
                    setRunning(false); // Pause between steps
                    setTimeLeft(steps[nextIndex].duration * 60);
                } else {
                    setRunning(false);
                    if(onComplete) onComplete();
                }
            } else if (mode === 'BOIL') {
                playBeep();
                setRunning(false);
                if(onComplete) onComplete();
            }
        }
        return () => clearInterval(interval);
    }, [running, timeLeft, mode, steps, currentStepIndex]);

    const toggleTimer = () => setRunning(!running);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const skipStep = () => {
        if (mode === 'MASH' && currentStepIndex < steps.length - 1) {
            const nextIndex = currentStepIndex + 1;
            setCurrentStepIndex(nextIndex);
            setRunning(false);
            setTimeLeft(steps[nextIndex].duration * 60);
        }
    }

    if (mode === 'MASH') {
        const currentStep = steps[currentStepIndex];
        if (!currentStep) return null;

        return (
            <div className="bg-zinc-900 border border-amber-500/20 rounded-lg p-6 mb-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-amber-500 pointer-events-none transform scale-150 group-hover:scale-125 transition-transform duration-700">
                    <Timer className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="text-amber-500 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Timer className="w-3 h-3" /> Maisch-Timer
                            </div>
                            <h3 className="text-xl font-bold text-white tracking-tight">{currentStep.label}</h3>
                            <p className="text-zinc-500 text-sm font-bold font-mono mt-1 px-2 py-0.5 bg-amber-950/20 text-amber-500 inline-block rounded border border-amber-500/10">{currentStep.temperature}°C</p>
                        </div>
                        <div className="text-center">
                            <div className={`text-5xl font-mono font-black tabular-nums tracking-tighter ${running ? 'text-white' : 'text-zinc-500'}`}>
                                {formatTime(timeLeft)}
                            </div>
                            <div className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest mt-1">Verbleibend</div>
                        </div>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex gap-3 mt-6">
                        <button 
                            onClick={toggleTimer}
                            className={`flex-1 py-3 px-6 rounded-lg font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                                running 
                                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700' 
                                : 'bg-amber-500 text-black hover:bg-amber-400 border border-amber-400'
                            }`}
                        >
                            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                            <span className="text-xs">{running ? 'Pause' : 'Start'}</span>
                        </button>
                        {currentStepIndex < steps.length - 1 && (
                            <button 
                                onClick={skipStep}
                                className="px-5 py-3 bg-black border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors flex items-center justify-center"
                                title="Nächster Schritt"
                            >
                                <SkipForward className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Next Step Preview */}
                    {currentStepIndex < steps.length - 1 && (
                        <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between text-xs">
                            <span className="text-zinc-600 uppercase font-bold tracking-wider">Danach</span>
                            <span className="text-zinc-400 font-bold flex items-center gap-2">
                                {steps[currentStepIndex + 1].label} 
                                <span className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[10px]">{steps[currentStepIndex + 1].temperature}°C</span>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (mode === 'BOIL') {
         // Sort steps by time descending for display list
        const sortedSteps = [...steps].sort((a, b) => b.timePoint! - a.timePoint!);
        
        // Find next upcoming addition
        const currentMinutes = timeLeft / 60;
        
        // Find largest timePoint < currentMinutes
        const nextAddition = sortedSteps
            .filter(s => s.timePoint! < currentMinutes)
            .reduce((prev, curr) => {
                 return (prev && prev.timePoint! > curr.timePoint!) ? prev : curr;
            }, null as TimerStep | null);

        return (
            <div className="bg-zinc-900 border border-red-500/20 rounded-lg p-6 mb-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-red-500 pointer-events-none transform scale-150 group-hover:scale-125 transition-transform duration-700">
                    <Flame className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                             <div className="text-red-500 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Flame className="w-3 h-3" /> Koch-Timer
                             </div>
                             <h3 className="text-xl font-bold text-white tracking-tight">Würzekochen</h3>
                        </div>
                         <div className="text-right">
                            <div className={`text-5xl font-mono font-black tabular-nums tracking-tighter ${running ? 'text-white' : 'text-zinc-500'}`}>
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                    </div>

                    {activeBoilStep && (
                        <div className="bg-red-500 text-black px-4 py-3 rounded-lg font-bold mb-4 animate-in fade-in slide-in-from-top-2 flex items-center gap-3 shadow-lg shadow-red-900/20">
                            <AlertCircle className="w-5 h-5 fill-black text-white" />
                            <span>JETZT ZUGEBEN: {activeBoilStep.label}</span>
                        </div>
                    )}

                    {nextAddition ? (
                         <div className="bg-black rounded-lg p-3 border border-zinc-800 mb-6 flex justify-between items-center">
                            <div>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-0.5">Nächste Gabe</span>
                                <div className="font-bold text-zinc-300 text-sm">{nextAddition.label}</div>
                            </div>
                            <div className="text-xl font-mono font-bold text-red-500">
                                @ {nextAddition.timePoint} min
                            </div>
                         </div>
                    ) : (
                         <div className="text-zinc-600 text-xs font-bold uppercase tracking-wider mb-6 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span> Keine weiteren Gaben
                         </div>
                    )}

                    {/* Controls */}
                    <div className="flex gap-3">
                        <button 
                            onClick={toggleTimer}
                            className={`flex-1 py-3 px-6 rounded-lg font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                                running 
                                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700' 
                                : 'bg-red-600 text-white hover:bg-red-500 border border-red-500'
                            }`}
                        >
                            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                            <span className="text-xs">{running ? 'Pause' : 'Start'}</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
