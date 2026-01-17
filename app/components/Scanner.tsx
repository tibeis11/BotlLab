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
    const [isScanning, setIsScanning] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const divId = "reader-camera";

    useEffect(() => {
        return () => {
            // Cleanup function must be synchronous, handles promises silently
            if (scannerRef.current) {
                const scanner = scannerRef.current;
                
                try {
                    const state = scanner.getState();
                    // Nur aufräumen wenn der Scanner wirklich läuft
                    if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                        scanner.stop()
                            .then(() => scanner.clear())
                            .catch(() => { /* Silent cleanup */ });
                    }
                    // Bei NOT_STARTED/UNKNOWN: Nichts tun - Scanner wurde nie gestartet
                } catch (e) {
                    // getState() might fail if scanner is in invalid state - that's OK
                }
            }
        };
    }, []);

    async function startScanner() {
        setErrorMsg(null);
        try {
            // Hard Reset: Falls noch einer da ist, weg damit
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
            }

            // Kurze Pause für den Browser
            await new Promise(r => setTimeout(r, 100));

            const scanner = new Html5Qrcode(divId);
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" }, 
                {
                    fps: 10,
                    aspectRatio: 1.0, // Force square container usage by lib
                },
                (decodedText) => {
                    onScanSuccess(decodedText);
                    // Optional: Scanner direkt stoppen nach Erfolg?
                    // stopScanner(); 
                },
                (errorMessage) => {
                    // ignore frame errors
                }
            );
            setIsScanning(true);
        } catch (err: any) {
            console.error("Scanner Error:", err);
            setErrorMsg("Kamera-Fehler: " + (err?.message || "Unbekannter Fehler"));
            setIsScanning(false);
            
            // Versuch aufzuräumen bei Fehler
            if (scannerRef.current) {
                try { await scannerRef.current.clear(); } catch(e) {}
            }
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
        <div className="w-full h-full"> 
             <div className="relative overflow-hidden w-full h-full bg-black">
                {/* Scanner Target - React must NOT put children here */}
                <div id={divId} className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full"></div>

                {/* UI Overlay - liegt DARÜBER, nicht DRIN */}
                {!isScanning && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-black/80 backdrop-blur-sm">
                        <div className="mb-4 text-4xl">📷</div>
                        <button 
                            onClick={startScanner}
                            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 px-8 rounded-full transition shadow-lg shadow-cyan-500/20 active:scale-95"
                        >
                            Start
                        </button>
                    </div>
                )}
             </div>

             {errorMsg && (
                 <div className="absolute inset-0 z-20 bg-black/90 flex flex-col items-center justify-center text-center p-4">
                     <p className="text-red-400 font-bold mb-2">⚠️ Fehler</p>
                     <p className="text-zinc-500 text-xs mb-4">{errorMsg}</p>
                     <button onClick={() => setErrorMsg(null)} className="text-white underline text-xs">OK</button>
                 </div>
             )}
        </div>
    );
}
