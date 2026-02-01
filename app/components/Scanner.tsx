'use client';

import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

interface ScannerProps {
    onScanSuccess: (decodedText: string) => void;
    autoStart?: boolean;
}

export default function Scanner({ onScanSuccess, autoStart = false }: ScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isStartingRef = useRef(false); 
    const isMountedRef = useRef(true);
    const [isScanning, setIsScanning] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const divId = "reader-camera";

    useEffect(() => {
        isMountedRef.current = true;
        if (autoStart) {
            startScanner();
        }
        return () => {
            isMountedRef.current = false;
            if (scannerRef.current) {
                const scanner = scannerRef.current;
                try {
                    if (scanner.getState() !== Html5QrcodeScannerState.NOT_STARTED) {
                        scanner.stop()
                            .then(() => scanner.clear())
                            .catch(() => {});
                    }
                } catch (e) {
                    // Cleanup errors can be ignored
                }
            }
        };
    }, []);

    const getErrorMessage = (err: Error): string => {
        const errStr = err.toString();
        const errName = err.name || "";

        // Check for Secure Context (HTTPS)
        if (typeof window !== 'undefined' && !window.isSecureContext) {
             return "Sicherheits-Warnung: Der Browser blockiert den Kamerazugriff, weil die Verbindung nicht sicher ist (kein HTTPS). Wenn du im lokalen Netzwerk testest, nutze 'localhost' oder aktiviere HTTPS im Dev-Server.";
        }

        if (errName === "NotAllowedError" || errStr.includes("NotAllowedError")) {
            return "Der Browser blockiert die Kamera. Klicke oben links auf das Schloss-Symbol, erlaube die Kamera und lade die Seite neu (F5).";
        }
        if (errName === "NotFoundError" || errStr.includes("NotFoundError")) {
            return "Keine Kamera gefunden. Ist eine Kamera angeschlossen?";
        }
        if (errName === "NotReadableError" || errStr.includes("NotReadableError")) {
            return "Kamera-Hardware-Fehler. Wird die Kamera bereits von einer anderen App verwendet?";
        }
        return `${err.message || "Unbekannt"} (${errName})`;
    };

    const startScanner = async () => {
        if (isStartingRef.current) return;
        isStartingRef.current = true;
        setIsStarting(true);
        setErrorMsg(null);

        try {
            // Give browser time to release resources
            await new Promise(r => setTimeout(r, 100));

            // Cleanup existing scanner
            if (scannerRef.current) {
                try {
                    const state = scannerRef.current.getState();
                    if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                        await scannerRef.current.stop();
                    }
                    await scannerRef.current.clear();
                } catch (e) {
                    console.warn("Cleanup warning:", e);
                }
                scannerRef.current = null;
            }

            // Initialize new scanner
            const scanner = new Html5Qrcode(divId);
            scannerRef.current = scanner;

            const config = {
                fps: 10,
                qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                    const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.75;
                    return { width: size, height: size };
                },
                aspectRatio: 1.0,
            };

            // Try back camera first, fallback to front camera
            try {
                await scanner.start({ facingMode: "environment" }, config, onScanSuccess, undefined);
            } catch (e) {
                const error = e as Error;
                if (error.name === "OverconstrainedError" || error.toString().includes("OverconstrainedError")) {
                    await scanner.start({ facingMode: "user" }, config, onScanSuccess, undefined);
                } else {
                    throw error;
                }
            }

            if (isMountedRef.current) setIsScanning(true);
        } catch (err) {
            console.error("Scanner Error:", err);
            if (isMountedRef.current) {
                setErrorMsg(getErrorMessage(err as Error));
            }
        } finally {
            if (isMountedRef.current) {
                setIsStarting(false);
                isStartingRef.current = false;
            }
        }
    };
    
    return (
        <div className="w-full h-full relative"> 
            <div className="relative overflow-hidden w-full h-full bg-black">
                {/* Scanner container - HTML5 QR Code will inject video here */}
                <div 
                    id={divId} 
                    className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full"
                />

                {/* Idle/Starting Overlay */}
                {!isScanning && !errorMsg && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-black/80 backdrop-blur-sm">
                        {!isStarting ? (
                            <>
                                <div className="mb-4 text-4xl">📷</div>
                                {!autoStart && (
                                    <button 
                                        onClick={startScanner}
                                        className="bg-white hover:bg-zinc-200 text-black font-bold py-2 px-6 rounded-lg transition shadow-lg active:scale-95 text-sm"
                                    >
                                        Scanner starten
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin mb-4" />
                                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                                    Kamera wird gestartet...
                                </p>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Error Overlay */}
            {errorMsg && (
                <div className="absolute inset-0 z-20 bg-black/95 flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in-95">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <p className="text-red-400 font-black mb-2 uppercase tracking-widest text-sm">
                        Scanner-Fehler
                    </p>
                    <p className="text-zinc-400 text-[11px] mb-6 leading-relaxed max-w-[280px]">
                        {errorMsg}
                    </p>
                    <div className="flex flex-col gap-3 w-full max-w-[200px]">
                        <button 
                            onClick={startScanner} 
                            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-6 rounded-xl text-xs transition active:scale-95 border border-zinc-700"
                        >
                            Erneut versuchen
                        </button>
                        <button 
                            onClick={() => setErrorMsg(null)} 
                            className="text-zinc-600 hover:text-white text-[10px] uppercase font-bold tracking-widest transition"
                        >
                            Abbrechen
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
