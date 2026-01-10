'use client';

import { Html5Qrcode } from "html5-qrcode";
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
            // Safer cleanup
            if (scannerRef.current) {
                try {
                    if (scannerRef.current.isScanning) {
                        scannerRef.current.stop()
                            .then(() => scannerRef.current?.clear())
                            .catch(console.warn);
                    } else {
                        scannerRef.current.clear().catch(console.warn);
                    }
                } catch (e) {
                    console.warn(e);
                }
            }
        };
    }, []);

    async function startScanner() {
        setErrorMsg(null);
        try {
            // Falls schon einer existiert und läuft -> stoppen!
            if (scannerRef.current) {
                 if (scannerRef.current.isScanning) {
                      await scannerRef.current.stop();
                 }
                 // Reset DOM
                 try {
                    await scannerRef.current.clear();
                 } catch (e) {
                    // Ignorieren, falls schon gecleart
                 }
            }

            const scanner = new Html5Qrcode(divId);
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" }, 
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                (decodedText) => {
                    onScanSuccess(decodedText);
                },
                (errorMessage) => {
                    // ignore frame errors
                }
            );
            setIsScanning(true);
        } catch (err: any) {
            console.error("Scanner Error:", err);
            setErrorMsg("Kamera-Fehler: " + (err?.message || err));
            setIsScanning(false);
        }
    }

    async function stopScanner() {
        if (scannerRef.current && isScanning) {
            try {
                await scannerRef.current.stop();
                setIsScanning(false);
            } catch (err) {
                console.error(err);
            }
        }
    }

    return (
        <div className="w-full max-w-md mx-auto">
             <div className="relative overflow-hidden rounded-xl bg-black min-h-[300px] mb-4 shadow-2xl border border-zinc-800">
                {/* Scanner Target - React must NOT put children here */}
                <div id={divId}></div>

                {/* UI Overlay - liegt DARÜBER, nicht DRIN */}
                {!isScanning && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-black/80 backdrop-blur-sm">
                        <div className="mb-4 text-4xl">📷</div>
                        <h3 className="text-white font-bold mb-2">QR-Scanner</h3>
                        <p className="text-zinc-400 text-sm mb-6">Zum Scannen von Flaschencodes Zugriff erlauben.</p>
                        <button 
                            onClick={startScanner}
                            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 px-8 rounded-full transition shadow-lg shadow-cyan-500/20 active:scale-95"
                        >
                            Kamera starten
                        </button>
                    </div>
                )}
             </div>
             
             {isScanning && (
                 <button 
                    onClick={stopScanner} 
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold transition flex items-center justify-center gap-2"
                 >
                    🛑 Scanner stoppen
                 </button>
             )}

             {errorMsg && (
                 <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl text-sm mb-4 animate-in fade-in slide-in-from-top-2">
                     <p className="font-bold">⚠️ Zugriff fehlgeschlagen</p>
                     <p className="mt-1">{errorMsg}</p>
                     <p className="mt-2 text-xs opacity-70 bg-black/20 p-2 rounded">
                        Tipp: Prüfe die Browser-Einstellungen (Schloss-Symbol in der Adresszeile) und erlaube den Zugriff auf die Kamera.
                     </p>
                     <button onClick={() => setErrorMsg(null)} className="mt-3 text-red-400 underline text-xs">
                        Schließen
                     </button>
                 </div>
             )}
        </div>
    );
}
