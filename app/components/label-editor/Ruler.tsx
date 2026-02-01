'use client';

import React, { useRef, useEffect } from 'react';
import { mmToPx } from '@/lib/utils/label-units';

interface RulerProps {
    orientation: 'horizontal' | 'vertical';
    scale: number;
    containerRef: React.RefObject<HTMLElement | null>;
    targetRef: React.RefObject<HTMLElement | null>;
    onAddGuide?: (orientation: 'horizontal' | 'vertical', posMm: number) => void;
}

export default function Ruler({ orientation, scale, containerRef, targetRef, onAddGuide }: RulerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lastStateRef = useRef({ origin: -9999, size: -9999, scale: -9999 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!onAddGuide) return;
        
        // Calculate mm position
        const { origin } = lastStateRef.current;
        const stepPx = mmToPx(1, scale);
        
        const clickPos = orientation === 'horizontal' ? e.nativeEvent.offsetX : e.nativeEvent.offsetY;
        const mm = (clickPos - origin) / stepPx;
        
        onAddGuide(orientation, mm);
    };

    useEffect(() => {
        let animationFrameId: number;

        const render = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            const target = targetRef.current;

            if (!canvas || !container || !target) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            // Measure relative positions
            const containerRect = container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();

            // Calculate origin (where 0mm starts relative to the container Top-Left)
            // Note: Rulers are sticky/fixed to container top-left, so we just want the delta.
            let origin = 0;
            let viewportSize = 0;

            if (orientation === 'horizontal') {
                origin = targetRect.left - containerRect.left;
                viewportSize = containerRect.width;
            } else {
                origin = targetRect.top - containerRect.top;
                viewportSize = containerRect.height;
            }

            // Check if redraw is needed (optimize to avoid burning GPU on static scene)
            // We also check scale because props change might overlap RAF
            if (
                Math.abs(lastStateRef.current.origin - origin) < 0.5 &&
                Math.abs(lastStateRef.current.size - viewportSize) < 0.5 &&
                lastStateRef.current.scale === scale
            ) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            lastStateRef.current = { origin, size: viewportSize, scale };

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            const dpr = window.devicePixelRatio || 1;
            
            // Logical dimensions
            const width = orientation === 'horizontal' ? viewportSize : 20;
            const height = orientation === 'horizontal' ? 20 : viewportSize;

            // Resize canvas if viewport changed
            if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
                ctx.scale(dpr, dpr);
            } else {
                // Just clear
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to clear full buffer
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
                // Reset scale is needed?
                // setTransform resets everything. scale(dpr, dpr) must be reapplied if we reset.
                // Or just clear in logic space if transform is active?
                // Simpler: Just re-scale every time or track context state. 
                // Let's re-scale to be safe.
                ctx.save();
                ctx.scale(dpr, dpr);
                // logic below uses ctx
            }

            // Draw Background
            ctx.fillStyle = '#18181b'; 
            ctx.fillRect(0, 0, width, height);
            
            ctx.strokeStyle = '#52525b'; 
            ctx.fillStyle = '#a1a1aa'; 
            ctx.font = '10px sans-serif';
            ctx.lineWidth = 1;
            ctx.beginPath();

            const stepPx = mmToPx(1, scale);
            const showMm = stepPx > 3;
            const showEm = stepPx > 0.5;

            // Determine Start/End in Millimeters
            // We want to draw from pixel 0 to pixel width
            // Pixel 0 corresponds to: 0 = origin + (mm * stepPx) -> mm = -origin / stepPx
            
            const startMm = Math.floor((-origin) / stepPx) - 5;
            const endMm = Math.ceil((viewportSize - origin) / stepPx) + 5;

            for (let mm = startMm; mm <= endMm; mm++) {
                const pos = Math.floor(origin + (mm * stepPx)) + 0.5;

                if (mm % 10 === 0) {
                    if (orientation === 'horizontal') {
                        ctx.moveTo(pos, 0);
                        ctx.lineTo(pos, 20);
                        if (mm >= 0) ctx.fillText((mm/10).toString(), pos + 4, 13);
                    } else {
                        ctx.moveTo(0, pos);
                        ctx.lineTo(20, pos);
                        if (mm >= 0) {
                            // Horizontal numbers for better readability
                            ctx.save();
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            // Rotate -90 degrees is standard for vertical rulers to save space
                            // But user feedback suggests readability issues.
                            // If we keep them horizontal:
                            ctx.fillText((mm/10).toString(), 10, pos + 8);
                            ctx.restore();
                        }
                    }
                } else if (mm % 5 === 0 && showEm) {
                    if (orientation === 'horizontal') {
                        ctx.moveTo(pos, 12);
                        ctx.lineTo(pos, 20);
                    } else {
                        ctx.moveTo(12, pos);
                        ctx.lineTo(20, pos);
                    }
                } else if (showMm) {
                    if (orientation === 'horizontal') {
                        ctx.moveTo(pos, 16);
                        ctx.lineTo(pos, 20);
                    } else {
                        ctx.moveTo(16, pos);
                        ctx.lineTo(20, pos);
                    }
                }
            }
            ctx.stroke();

            // Border
            ctx.beginPath();
            if (orientation === 'horizontal') {
                ctx.moveTo(0, 19.5);
                ctx.lineTo(width, 19.5);
            } else {
                ctx.moveTo(19.5, 0);
                ctx.lineTo(19.5, height);
            }
            ctx.strokeStyle = '#3f3f46';
            ctx.stroke();
            
            if (canvas.width === Math.floor(width * dpr)) {
                 ctx.restore(); // Restore save() done in else branch
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [orientation, scale, containerRef, targetRef]);

    return (
        <canvas 
            ref={canvasRef} 
            onMouseDown={handleMouseDown}
            className={`absolute z-[50] pointer-events-auto cursor-crosshair ${orientation === 'horizontal' ? 'top-0 left-0 w-full h-5' : 'top-0 left-0 w-5 h-full'}`} 
            style={{ 
                position: 'sticky', 
                top: orientation === 'horizontal' ? 0 : undefined, 
                left: orientation === 'vertical' ? 0 : undefined,
                width: orientation === 'horizontal' ? '100%' : '20px',
                height: orientation === 'vertical' ? '100%' : '20px'
            }}
        />
    );
}
