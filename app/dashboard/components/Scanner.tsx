'use client';

import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef } from "react";

interface ScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanFailure?: (error: any) => void;
    width?: number;
    height?: number;
}

export default function Scanner({ onScanSuccess, width = 500, height = 500 }: ScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const callbackRef = useRef(onScanSuccess);
    const divId = "params-qr-reader";

    // Immer den aktuellsten Callback speichern
    useEffect(() => {
        callbackRef.current = onScanSuccess;
    }, [onScanSuccess]);

    useEffect(() => {
        // Sicherstellen, dass der Container wirklich existiert, bevor wir starten
        const checkElement = setInterval(() => {
            if (document.getElementById(divId)) {
                clearInterval(checkElement);
                startScanner();
            }
        }, 100);

        function startScanner() {
            if (scannerRef.current) return;

            const scanner = new Html5QrcodeScanner(
                divId,
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    showTorchButtonIfSupported: true,
                    videoConstraints: {
                        facingMode: "environment" // Versucht Rückkamera zu nehmen
                    }
                },
                false
            );
            
            scanner.render((decodedText) => {
                if (callbackRef.current) {
                    callbackRef.current(decodedText);
                }
            }, (error) => {
                // Ignore scan errors, they happen continuously
            });

            scannerRef.current = scanner;
        }

        return () => {
            clearInterval(checkElement);
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear().catch(err => console.warn("Scanner clear error", err));
                } catch (e) {
                   console.warn("Scanner clear exception", e);
                }
                scannerRef.current = null;
            }
        };
    }, []); // Leeres Array -> Nur einmal beim Laden initialisieren!

    return (
        <div className="w-full max-w-md mx-auto bg-black rounded-xl overflow-hidden relative">
            <div id={divId} className="bg-black text-white"></div>
        </div>
    );
}
