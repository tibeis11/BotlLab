'use client';

import React, { useEffect, useRef, useState } from 'react';
import { mmToPx } from '@/lib/utils/label-units';

interface GuideLineProps {
    id: string;
    orientation: 'horizontal' | 'vertical';
    positionMm: number;
    scale: number;
    containerRef: React.RefObject<HTMLElement | null>;
    targetRef: React.RefObject<HTMLElement | null>;
    onRemove: (id: string) => void;
    onUpdate: (id: string, newMm: number) => void;
}

export default function GuideLine({ id, orientation, positionMm, scale, containerRef, targetRef, onRemove, onUpdate }: GuideLineProps) {
    const lineRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    // We store the pixel position relative to container logic
    
    // We need RAF to sync position just like Ruler
    useEffect(() => {
        let animationFrameId: number;

        const updatePosition = () => {
            const line = lineRef.current;
            const container = containerRef.current;
            const target = targetRef.current;

            if (!line || !container || !target) {
                animationFrameId = requestAnimationFrame(updatePosition);
                return;
            }

            const containerRect = container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();

            let origin = 0;
            if (orientation === 'horizontal') {
                // Vertical line (extends horizontally? No.)
                // Orientation "horizontal" usually means GUIDE is horizontal (Y axis fixed) or GUIDE is on horizontal ruler (X axis fixed)?
                // Standard: Horizontal Guide = Horizontal Line = Y Position.
                // Ruler prop "orientation='horizontal'" draws the top ruler (X axis).
                // Dragging from top ruler -> Horizontal Line (Y Position).
                // So if orientation matches Ruler (horizontal), we draw a Horizontal Line.
                
                // Top Ruler (Horizontal) -> Drag down -> Horizontal Line (y-coords).
                // Origin is Top. relative to container.
                origin = targetRect.top - containerRect.top;
            } else {
                // Left Ruler (Vertical) -> Drag right -> Vertical Line (x-coords).
                origin = targetRect.left - containerRect.left;
            }

            const stepPx = mmToPx(1, scale);
            const pixelPosRaw = origin + (positionMm * stepPx);
            
            // Align with Ruler's canvas drawing (Math.floor + integer snap)
            // Ruler draws lines at Math.floor(pos) + 0.5 for 1px stroke. 
            // Div top position should define integer start.
            const pixelPos = Math.floor(pixelPosRaw);

            // Apply style directly
            if (orientation === 'horizontal') {
                line.style.transform = `translateY(${pixelPos}px)`;
                line.style.left = '0';
                line.style.width = '100%';
                line.style.top = '0'; // We use translate
            } else {
                line.style.transform = `translateX(${pixelPos}px)`;
                line.style.top = '0';
                line.style.height = '100%';
                line.style.left = '0';
            }
            
            // Check if guide is dragged out of view (delete zone)
            // This logic is tricky inside RAF purely visual. 
            // We'll handle delete via checking mouse position during drag event.

            animationFrameId = requestAnimationFrame(updatePosition);
        };

        updatePosition();
        return () => cancelAnimationFrame(animationFrameId);
    }, [orientation, positionMm, scale, containerRef, targetRef]);

    // Drag Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        document.body.style.cursor = orientation === 'horizontal' ? 'row-resize' : 'col-resize';

        const startMouse = orientation === 'horizontal' ? e.clientY : e.clientX;
        // We calculate initial offset from the current mm position to where mouse clicked? 
        // Or just snap to mouse? Usually guides snap to mouse.
        
        const onMove = (moveEvent: MouseEvent) => {
            const container = containerRef.current;
            const target = targetRef.current;
            if (!container || !target) return;

            const containerRect = container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            
            // Current mouse pos relative to container top-left
            // Actually, we need relative to viewport? 
            // moveEvent.client... is viewport.
            // containerRect is viewport.
            
            const mousePos = orientation === 'horizontal' 
                ? moveEvent.clientY - containerRect.top
                : moveEvent.clientX - containerRect.left;
            
            // Calculate equivalent mm
            let origin = 0;
            if (orientation === 'horizontal') {
                origin = targetRect.top - containerRect.top;
            } else {
                origin = targetRect.left - containerRect.left;
            }
            
            const stepPx = mmToPx(1, scale);
            const newMmRaw = (mousePos - origin) / stepPx;
            
            // Simple snapping to near-0 (within 1mm)
            const newMm = Math.abs(newMmRaw) < 1 ? 0 : newMmRaw;
            
            onUpdate(id, newMm);

            // Removing guide: if mouse is over the ruler area (or outside canvas substantially)
            // Ruler is 20px. 
            // If horizontal guide (y-axis) is dragged back to top < 20px (relative to container?)
            // Container includes the rulers. Canvas area starts at 0,0 of this container?
            // Yes, containerRef is "mainRef" which includes the padding? No.
            // mainRef is the scrolling container.
            
            // If we drag it back to "negative" relative to visual start?
            // Let's keep it simple: Double click to remove? 
            // Or Drag out of window?
        };

        const onUp = () => {
            setIsDragging(false);
            document.body.style.cursor = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return (
        <div
            ref={lineRef}
            onMouseDown={handleMouseDown}
            onDoubleClick={() => onRemove(id)}
            className={`absolute pointer-events-auto z-[60] bg-cyan-500/50 hover:bg-cyan-400 group
                ${orientation === 'horizontal' ? 'h-px hover:h-[3px] cursor-row-resize' : 'w-px hover:w-[3px] cursor-col-resize'}
            `}
            title="Hilfslinie (Doppelklick zum Löschen)"
        >
            {/* Handle/Tag showing position? */}
        </div>
    );
}
