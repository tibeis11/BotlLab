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
    const isStartingRef = useRef(false); 
    const isMountedRef = useRef(true);
    const [isScanning, setIsScanning] = useState(false);
    const [permissionRequested, setPermissionRequested] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    // Use stable unique ID to avoid collisions during re-renders/HMR
    const divId = useRef(`reader-${Math.random().toString(36).slice(2)}`).current;

    useEffect(() => {
        isMountedRef.current = true;
        
        // Removed auto-start to comply with browser policies requiring user interaction
        // initScanner(); 

        return () => {
            isMountedRef.current = false;
            if (scannerRef.current) {
                // Fire and forget cleanup
                const scanner = scannerRef.current;
                scanner.stop()
                    .then(() => scanner.clear())
                    .catch(e => console.warn("Cleanup warning:", e));
            }
        };
    }, []);

    const startScanner = async () => {
        if (isStartingRef.current) return;
        isStartingRef.current = true;
        setPermissionRequested(true);
        setErrorMsg(null);

        try {
            // Check for Secure Context
            if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
                throw new Error("UNSICHERER KONTEXT: HTTPS erforderlich.");
            }

            // Ensure previous instance is gone
            if (scannerRef.current) {
                try {
                    const state = scannerRef.current.getState();
                    if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                        await scannerRef.current.stop();
                    }
                    await scannerRef.current.clear();
                } catch (e) {
                    console.warn("Pre-start cleanup warning:", e);
                }
                scannerRef.current = null;
            }

            // Create new instance
            // Wait a tick to ensure DOM is ready and previous cleanup registered
            await new Promise(r => setTimeout(r, 50));
            
            if (!document.getElementById(divId)) {
                throw new Error("Scanner Container nicht gefunden");
            }

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

            // Attempt to start
            try {
                // FORCE permission prompt via native API first.
                // This is more reliable than the library on some devices.
                // We request a stream, then immediately stop it just to get the "Allow" signal.
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                    // Permission granted! Stop the stream to release hardware for the library.
                    stream.getTracks().forEach(track => track.stop());
                }

                // Now use the library
                const devices = await Html5Qrcode.getCameras();
                if (!devices || devices.length === 0) {
                     throw new Error("NotFoundError: Keine Kamera gefunden");
                }

                // Try to find back camera
                const backCamera = devices.find(id => id.label.toLowerCase().includes('back') || id.label.toLowerCase().includes('rück'));
                const cameraId = backCamera ? backCamera.id : devices[0].id;
                
                await scanner.start(
                    cameraId, 
                    config, 
                    onScanSuccess, 
                    undefined
                );
            } catch (err: any) {
                console.warn("Camera start failed with specific ID, falling back to mode:", err);
                
                // Fallback to basic mode if specific ID failed or permission was partial
                await scanner.start(
                    { facingMode: "environment" }, 
                    config, 
                    onScanSuccess, 
                    undefined
                );
            }

            if (isMountedRef.current) setIsScanning(true);
            
        } catch (err: any) {
            console.error("Scanner Start Error:", err);
            let msg = err.message || "Kamera konnte nicht gestartet werden.";
            let detailedHelp = null;
            
            // Analyze Error
            const errStr = msg.toString();
            if (errStr.includes("NotAllowedError") || errStr.includes("Permission denied")) {
                msg = "Zugriff verweigert";
                if (typeof window !== 'undefined' && !window.isSecureContext) {
                    detailedHelp = "Browser blockieren Kameras auf unsicheren Verbindungen (HTTP). Bitte nutze HTTPS oder Localhost.";
                } else {
                    detailedHelp = "Bitte erlaube den Zugriff im Browser (Schloss-Symbol in Adresszeile) oder prüfe die Systemeinstellungen.";
                }
            } else if (errStr.includes("NotFoundError")) {
                msg = "Keine Kamera gefunden";
                detailedHelp = "Es wurde kein Video-Eingabegerät erkannt.";
            } else if (errStr.includes("NotReadableError")) {
                msg = "Kamera belegt/fehlerhaft";
                detailedHelp = "Die Kamera wird evtl. von einer anderen App genutzt oder ist abgestürzt.";
            } else if (errStr.includes("UNSICHERER KONTEXT")) {
                msg = "Unsichere Verbindung";
                detailedHelp = "Kamera funktioniert nur über HTTPS oder auf Localhost.";
            }
            
            if (isMountedRef.current) {
                setErrorMsg(detailedHelp ? `${msg}|${detailedHelp}` : msg);
            }
        } finally {
            isStartingRef.current = false;
        }
    };
    
    const handleRetry = () => {
        isStartingRef.current = false;
        startScanner();
    };

    const [errorTitle, errorDetail] = errorMsg ? errorMsg.split('|') : [errorMsg, null];

    return (
        <div className="w-full h-full relative bg-black"> 
             <div className="relative overflow-hidden w-full h-full">
                {/* Scanner Target */}
                <div id={divId} className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full"></div>

                {/* Pre-Permission State: Explicit User Action Required */}
                {!isScanning && !permissionRequested && !errorMsg && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-zinc-900">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                            <span className="text-3xl text-zinc-400">📷</span>
                        </div>
                        <h3 className="text-white font-bold mb-2">Kamera aktivieren</h3>
                        <p className="text-zinc-500 text-xs mb-8 max-w-[200px]">
                            Der Browser benötigt deine Erlaubnis, um den Scanner zu nutzen.
                        </p>
                        <button 
                            onClick={startScanner}
                            className="w-full max-w-[200px] py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-cyan-900/20 transition-all active:scale-95"
                        >
                            Zugriff erlauben
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {!isScanning && permissionRequested && !errorMsg && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-black/80 backdrop-blur-sm">
                        <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Kamera wird gestartet...</p>
                    </div>
                )}
             </div>

             {/* Error State */}
             {errorMsg && (
                 <div className="absolute inset-0 z-20 bg-black/95 flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in-95">
                     <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                        <span className="text-2xl">⚠️</span>
                     </div>
                     <p className="text-red-400 font-black mb-2 uppercase tracking-widest text-sm">{errorTitle}</p>
                     {errorDetail && (
                         <p className="text-zinc-400 text-xs mb-6 leading-relaxed max-w-[240px] border-l-2 border-red-500/30 pl-3 py-1 text-left bg-red-500/5 rounded-r mt-2">
                            {errorDetail}
                         </p>
                     )}
                     {!errorDetail && <div className="h-4"></div>}
                     
                     <button 
                        onClick={handleRetry}
                        className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs border border-zinc-700 transition"
                     >
                        Erneut versuchen
                     </button>
                 </div>
             )}
        </div>
    );
}
