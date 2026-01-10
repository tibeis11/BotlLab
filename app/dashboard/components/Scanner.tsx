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
    const divId = "params-qr-reader";

    useEffect(() => {
        if (!scannerRef.current) {
            const scanner = new Html5QrcodeScanner(
                divId,
                { 
                    fps: 10, 
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    showTorchButtonIfSupported: true
                },
                false
            );
            
            scanner.render((decodedText) => {
                onScanSuccess(decodedText);
            }, (error) => {
            });

            scannerRef.current = scanner;
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
            }
        };
    }, [onScanSuccess]);

    return (
        <div className="w-full max-w-md mx-auto bg-black rounded-xl overflow-hidden">
            <div id={divId} style={{ backgroundColor: 'black' }}></div>
            <p className="text-center text-xs text-zinc-500 py-2">Kamera-Zugriff erlauben</p>
        </div>
    );
}
