'use client';

import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

interface ScannerProps {
    onScanSuccess: (decodedText: string) => void;
    // Alte props ignorieren wir, aber lassen sie drin für Kompatibilität
    onScanFailure?: (error: any) => void;
    width?: number;
    height?: number;
}

export default function Scanner({ onScanSuccess }: ScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isStartingRef = useRef(false); // Verhindert gleichzeitige Start-Versuche
    const [isScanning, setIsScanning] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const divId = "reader-camera";

    useEffect(() => {
        let isMounted = true;

        const initScanner = async () => {
            // Warte kurz, bis das DOM-Element sicher da ist
            await new Promise(r => setTimeout(r, 500));
            if (isMounted) {
                await startScanner();
            }
        };

        initScanner();

        return () => {
            isMounted = false;
            if (scannerRef.current) {
                const scanner = scannerRef.current;
                if (scanner.getState() !== Html5QrcodeScannerState.NOT_STARTED) {
                    scanner.stop().then(() => scanner.clear()).catch(() => {});
                }
            }
        };
    }, []);

    async function startScanner() {
        if (isStartingRef.current) return;
        isStartingRef.current = true;
        setErrorMsg(null);

        try {
            // Check for Secure Context
            if (!window.isSecureContext && window.location.hostname !== 'localhost') {
                throw new Error("UNSICHERER KONTEXT: Die Kamera-API wird vom Browser nur über HTTPS oder auf 'localhost' erlaubt. Deine aktuelle Verbindung ist nicht sicher.");
            }

            // Cleanup existing
            if (scannerRef.current) {
                try {
                    const state = scannerRef.current.getState();
                    if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                        await scannerRef.current.stop();
                    }
                    await scannerRef.current.clear();
                } catch (e) {}
            }

            const scanner = new Html5Qrcode(divId);
            scannerRef.current = scanner;

            // Kamera-Konfiguration
            const config = {
                fps: 15,
                qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                    const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.75;
                    return { width: size, height: size };
                },
                aspectRatio: 1.0,
            };

            // Versuche erst Rückkamera, dann irgendeine
            try {
                await scanner.start({ facingMode: "environment" }, config, onScanSuccess, () => {});
            } catch (e) {
                console.warn("Back camera failed, trying any camera...");
                await scanner.start({ facingMode: "user" }, config, onScanSuccess, () => {});
            }

            setIsScanning(true);
        } catch (err: any) {
            console.error("Scanner Error:", err);
            
            let displayMsg = "Kamera-Fehler";
            const errStr = err.toString();

            if (errStr.includes("NotAllowedError") || err.name === "NotAllowedError") {
                displayMsg = "Zugriff verweigert oder blockiert. Bitte stelle sicher, dass die Kamera nicht von einer anderen App genutzt wird.";
            } else if (errStr.includes("UNSICHERER KONTEXT")) {
                displayMsg = err.message;
            } else {
                displayMsg = err.message || "Unbekannter Fehler beim Kamera-Start.";
            }
            
            setErrorMsg(displayMsg);
            setIsScanning(false);
        } finally {
            isStartingRef.current = false;
        }
    }

    async function stopScanner() {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState();
                if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                    await scannerRef.current.stop();
                }
                await scannerRef.current.clear();
            } catch (err) {
                console.warn("Stop failed", err);
            }
            setIsScanning(false);
        }
    }

    return (
        <div className="w-full h-full relative"> 
             <div className="relative overflow-hidden w-full h-full bg-black">
                {/* Scanner Target - React must NOT put children here */}
                <div id={divId} className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full"></div>

                {/* UI Overlay - Loading/Pre-start */}
                {!isScanning && !errorMsg && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-black/80 backdrop-blur-sm">
                        <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Kamera wird gestartet...</p>
                    </div>
                )}
             </div>

             {errorMsg && (
                 <div className="absolute inset-0 z-20 bg-black/95 flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in-95">
                     <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                        <span className="text-2xl">⚠️</span>
                     </div>
                     <p className="text-red-400 font-black mb-2 uppercase tracking-widest text-sm">Scanner-Fehler</p>
                     <p className="text-zinc-500 text-xs mb-6 leading-relaxed max-w-[240px]">
                        {errorMsg}
                     </p>
                     <div className="flex flex-col gap-3 w-full max-w-[200px]">
                        <button 
                            onClick={() => startScanner()} 
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
