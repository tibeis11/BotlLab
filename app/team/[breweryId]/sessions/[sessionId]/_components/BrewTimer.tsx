'use client';

import { useState, useEffect, useRef } from 'react';

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
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-6 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl pointer-events-none text-amber-500">⏳</div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-1">Maisch-Timer</div>
                            <h3 className="text-2xl font-black text-white">{currentStep.label}</h3>
                            <p className="text-zinc-400">{currentStep.temperature}°C</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-mono font-black text-white tabular-nums tracking-tight">
                                {formatTime(timeLeft)}
                            </div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Verbleibend</div>
                        </div>
                    </div>
                    
                    {/* Controls */}
                    <div className="flex gap-3">
                        <button 
                            onClick={toggleTimer}
                            className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-wide transition-all ${
                                running 
                                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
                                : 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-900/20'
                            }`}
                        >
                            {running ? 'Pause' : 'Start'}
                        </button>
                        <button 
                            onClick={skipStep}
                            className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        >
                            ⏭
                        </button>
                    </div>

                    {/* Next Step Preview */}
                    {currentStepIndex < steps.length - 1 && (
                        <div className="mt-4 pt-4 border-t border-amber-500/10 flex items-center justify-between text-sm">
                            <span className="text-zinc-500">Danach:</span>
                            <span className="text-zinc-300 font-bold">
                                {steps[currentStepIndex + 1].label} ({steps[currentStepIndex + 1].temperature}°C)
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
        const upcomingEvent = sortedSteps.filter(s => s.timePoint! <= currentMinutes).sort((a,b) => b.timePoint! - a.timePoint!)[0]; // Finds largest timePoint <= current

        // Actually upcoming means timePoint < currentMinutes and closest.
        // Wait, normally boil timer counts DOWN.
        // If boil is 60 min. Current is 55.
        // Valid additions are those at 50, 40 etc.
        // The *next* one is the one with highest timePoint that is LESS than current time.
        const nextAddition = sortedSteps.filter(s => s.timePoint! < currentMinutes).reduce((prev, curr) => {
            return (prev && prev.timePoint! > curr.timePoint!) ? prev : curr;
        }, null as TimerStep | null);

        return (
            <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-6 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl pointer-events-none text-red-500">🔥</div>
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                             <div className="text-red-500 text-xs font-bold uppercase tracking-widest mb-1">Koch-Timer</div>
                             <h3 className="text-xl font-black text-white">Würzekochen</h3>
                        </div>
                         <div className="text-right">
                            <div className="text-5xl font-mono font-black text-white tabular-nums tracking-tight">
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                    </div>

                    {activeBoilStep && (
                        <div className="bg-red-500 text-black px-4 py-3 rounded-xl font-bold mb-4 animate-in fade-in slide-in-from-top-2">
                            🚨 JETZT ZUGEBEN: {activeBoilStep.label}
                        </div>
                    )}

                    {nextAddition ? (
                         <div className="bg-zinc-900/50 rounded-xl p-3 border border-red-500/20 mb-4 flex justify-between items-center">
                            <div>
                                <span className="text-xs text-red-400 font-bold uppercase">Nächste Gabe</span>
                                <div className="font-bold text-white">{nextAddition.label}</div>
                            </div>
                            <div className="text-xl font-mono font-bold text-red-400">
                                @ {nextAddition.timePoint} min
                            </div>
                         </div>
                    ) : (
                         <div className="text-zinc-500 text-sm mb-4">Keine weiteren Gaben geplant.</div>
                    )}

                    {/* Controls */}
                    <div className="flex gap-3">
                        <button 
                            onClick={toggleTimer}
                            className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-wide transition-all ${
                                running 
                                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
                                : 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-900/20'
                            }`}
                        >
                            {running ? 'Pause' : 'Start'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
