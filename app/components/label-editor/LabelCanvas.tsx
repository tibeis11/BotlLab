'use client';

import React, { useRef } from 'react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { LabelDesign, LabelElement } from '@/lib/types/label-system';
import { mmToPx, pxToMm } from '@/lib/utils/label-units';

interface LabelCanvasProps {
    design: LabelDesign;
    scale: number;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onUpdate: (id: string, updates: Partial<LabelElement>) => void;
}

export default function LabelCanvas({ design, scale, selectedId, onSelect, onUpdate }: LabelCanvasProps) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [guidelines, setGuidelines] = React.useState<{ x: number | null, y: number | null }>({ x: null, y: null });

    // Calculate canvas size in pixels based on mm * scale
    const widthPx = mmToPx(design.width, scale);
    const heightPx = mmToPx(design.height, scale);

    const handleDrag = (id: string, data: DraggableData) => {
        const el = design.elements.find(e => e.id === id);
        if (!el) return;

        const xMm = pxToMm(data.x, scale);
        const yMm = pxToMm(data.y, scale);
        const centerX = xMm + el.width / 2;
        const centerY = yMm + el.height / 2;
        const labelCenterX = design.width / 2;
        const labelCenterY = design.height / 2;
        const threshold = 1.5; // mm snap threshold (tighter)

        let snapX: number | null = null;
        let snapY: number | null = null;

        // 1. Center Snapping
        if (Math.abs(centerX - labelCenterX) < threshold) snapX = labelCenterX;
        if (Math.abs(centerY - labelCenterY) < threshold) snapY = labelCenterY;

        // 2. Custom Guides Snapping (overrides center if closer?)
        // Actually we usually prioritize closest.
        const guides = design.guides || [];
        
        guides.forEach(g => {
            if (g.orientation === 'vertical') {
                // Check Left, Center, Right
                if (Math.abs(xMm - g.position) < threshold) snapX = g.position;
                else if (Math.abs(centerX - g.position) < threshold) snapX = g.position;
                else if (Math.abs((xMm + el.width) - g.position) < threshold) snapX = g.position;
            } else {
                // Check Top, Center, Bottom
                if (Math.abs(yMm - g.position) < threshold) snapY = g.position;
                else if (Math.abs(centerY - g.position) < threshold) snapY = g.position;
                else if (Math.abs((yMm + el.height) - g.position) < threshold) snapY = g.position;
            }
        });

        setGuidelines({ x: snapX, y: snapY });
    };

    const handleDragStop = (id: string, e: DraggableEvent, data: DraggableData) => {
        let xMm = pxToMm(data.x, scale);
        let yMm = pxToMm(data.y, scale);

        const el = design.elements.find(e => e.id === id);
        if (el) {
            const centerX = xMm + el.width / 2;
            const centerY = yMm + el.height / 2;
            const labelCenterX = design.width / 2;
            const labelCenterY = design.height / 2;
            const threshold = 1.5;

            // Apply best snap
            let bestSnapX = xMm;
            let bestSnapY = yMm;
            let minDiffX = threshold; // Start with max tolerance
            let minDiffY = threshold;

            // Check Center
            if (Math.abs(centerX - labelCenterX) < minDiffX) {
                bestSnapX = labelCenterX - el.width / 2;
                minDiffX = Math.abs(centerX - labelCenterX);
            }
            if (Math.abs(centerY - labelCenterY) < minDiffY) {
                bestSnapY = labelCenterY - el.height / 2;
                minDiffY = Math.abs(centerY - labelCenterY);
            }

            // Check Guides
            (design.guides || []).forEach(g => {
                if (g.orientation === 'vertical') {
                    // Left
                    if (Math.abs(xMm - g.position) < minDiffX) {
                        bestSnapX = g.position;
                        minDiffX = Math.abs(xMm - g.position);
                    }
                    // Center
                    if (Math.abs(centerX - g.position) < minDiffX) {
                        bestSnapX = g.position - el.width / 2;
                        minDiffX = Math.abs(centerX - g.position);
                    }
                    // Right
                    if (Math.abs((xMm + el.width) - g.position) < minDiffX) {
                        bestSnapX = g.position - el.width;
                        minDiffX = Math.abs((xMm + el.width) - g.position);
                    }
                } else {
                    // Top
                    if (Math.abs(yMm - g.position) < minDiffY) {
                        bestSnapY = g.position;
                        minDiffY = Math.abs(yMm - g.position);
                    }
                    // Center
                    if (Math.abs(centerY - g.position) < minDiffY) {
                        bestSnapY = g.position - el.height / 2;
                        minDiffY = Math.abs(centerY - g.position);
                    }
                    // Bottom
                    if (Math.abs((yMm + el.height) - g.position) < minDiffY) {
                        bestSnapY = g.position - el.height;
                        minDiffY = Math.abs((yMm + el.height) - g.position);
                    }
                }
            });
            
            xMm = bestSnapX;
            yMm = bestSnapY;
        }
        
        setGuidelines({ x: null, y: null });
        onUpdate(id, { 
            x: Number(xMm.toFixed(1)), 
            y: Number(yMm.toFixed(1)) 
        });
    };

    return (
        <div 
            ref={canvasRef}
            // IMPORTANT: Removed transition-all duration-200. 
            // Why? The transition caused the DOM rect (getBoundingClientRect) to lag behind the state update (height/width change).
            // Ruler.tsx reads the rect immediately on render. If the rect is still animating, it reads the old or intermediate size, causing sync issues.
            className="relative bg-white ease-out origin-top-left overflow-hidden label-wrapper"
            style={{
                width: widthPx,
                height: heightPx,
                backgroundColor: design.background.type === 'color' ? design.background.value : '#ffffff',
                backgroundImage: design.background.type === 'image' ? `url(${design.background.value})` : undefined,
                backgroundSize: 'cover'
            }}
            onClick={(e) => {
                // Deselect if clicking on background or any area that is not an element wrapper
                const target = e.target as HTMLElement;
                const clickedElement = target.closest('[data-element-id]');
                if (!clickedElement) {
                    onSelect(null);
                }
            }}
        >
            {/* Render Elements */}
            {design.elements.map(el => (
                <DraggableElement 
                    key={el.id}
                    element={el}
                    scale={scale}
                    isSelected={selectedId === el.id}
                    onSelect={() => onSelect(el.id)}
                    onDrag={(data) => handleDrag(el.id, data)}
                    onDragStop={(e, data) => handleDragStop(el.id, e, data)}
                    onUpdate={(updates) => onUpdate(el.id, updates)}
                />
            ))}

            {/* Magnetic Guidelines */}
            {guidelines.x !== null && (
                <div 
                    className="absolute top-0 bottom-0 w-px bg-cyan-500/50 z-[20] pointer-events-none"
                    style={{ left: mmToPx(guidelines.x, scale) }}
                />
            )}
            {guidelines.y !== null && (
                <div 
                    className="absolute left-0 right-0 h-px bg-cyan-500/50 z-[20] pointer-events-none"
                    style={{ top: mmToPx(guidelines.y, scale) }}
                />
            )}
            
            {/* Safe Zone Overlay (5mm) */}
            <div 
                className="absolute border border-red-500/30 border-dashed pointer-events-none z-[10]"
                style={{
                    left: mmToPx(5, scale),
                    top: mmToPx(5, scale),
                    width: widthPx - mmToPx(10, scale),
                    height: heightPx - mmToPx(10, scale),
                }}
            />
        </div>
    );
}

// Subcomponent for individual draggable items
function DraggableElement({ 
    element, 
    scale, 
    isSelected, 
    onSelect, 
    onDrag,
    onDragStop,
    onUpdate
}: { 
    element: LabelElement; 
    scale: number; 
    isSelected: boolean;
    onSelect: () => void;
    onDrag: (data: DraggableData) => void;
    onDragStop: (e: DraggableEvent, data: DraggableData) => void;
    onUpdate: (updates: Partial<LabelElement>) => void;
}) {
    // Reference for the draggable node to avoid findDOMNode usage (React 18+ strict mode / React 19)
    const nodeRef = useRef<HTMLDivElement>(null);

    // Current position in pixels for rendering
    const xPx = mmToPx(element.x, scale);
    const yPx = mmToPx(element.y, scale);
    const wPx = mmToPx(element.width, scale);
    const hPx = mmToPx(element.height, scale);

    const handleResizeStart = (e: React.MouseEvent, corner: 'se' | 'sw' | 'ne' | 'nw') => {
        e.stopPropagation(); // Don't trigger drag
        e.preventDefault();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = element.width;
        const startHeight = element.height;
        const startElX = element.x;
        const startElY = element.y;
        
        // Rotation in radians for mouse projection
        const rotationRad = (element.rotation || 0) * (Math.PI / 180);

        const onMouseMove = (moveEvent: MouseEvent) => {
            const screenDx = moveEvent.clientX - startX;
            const screenDy = moveEvent.clientY - startY;
            
            // Project screen delta onto element axes (Local Delta)
            const localDxPx = (screenDx * Math.cos(rotationRad)) + (screenDy * Math.sin(rotationRad));
            const localDyPx = (screenDy * Math.cos(rotationRad)) - (screenDx * Math.sin(rotationRad));
            
            // Convert to mm
            const dxMm = pxToMm(localDxPx, scale);
            const dyMm = pxToMm(localDyPx, scale);

            // Calculate raw size changes based on corner
            let dWidth = 0;
            let dHeight = 0;

            if (corner === 'se') {
                dWidth = dxMm;
                dHeight = dyMm;
            } else if (corner === 'sw') {
                dWidth = -dxMm;
                dHeight = dyMm;
            } else if (corner === 'ne') {
                dWidth = dxMm;
                dHeight = -dyMm;
            } else if (corner === 'nw') {
                dWidth = -dxMm;
                dHeight = -dyMm;
            }

            let newWidth = Math.max(5, startWidth + dWidth);
            let newHeight = Math.max(5, startHeight + dHeight);

            // Force 1:1 aspect ratio for QR codes
            if (element.type === 'qr-code') {
                const maxDim = Math.max(newWidth, newHeight);
                newWidth = maxDim;
                newHeight = maxDim;
            }

            // Aspect Ratio Lock
            if (element.type === 'brand-logo' || element.type === 'brand-footer' || element.aspectLock || moveEvent.shiftKey) {
                const ratio = startWidth / startHeight;
                // Determine dominant axis
                // (Comparing absolute growth percentage)
                if (Math.abs((newWidth - startWidth) / startWidth) > Math.abs((newHeight - startHeight) / startHeight)) {
                    newHeight = newWidth / ratio;
                } else {
                    newWidth = newHeight * ratio;
                }
            }

            // Recalculate Position based on final dimensions and corner
            // We adjust X/Y to keep the "opposite" corner fixed in local space
            let newX = startElX;
            let newY = startElY;

            if (corner === 'sw') {
                newX = startElX + (startWidth - newWidth);
            } else if (corner === 'ne') {
                newY = startElY + (startHeight - newHeight);
            } else if (corner === 'nw') {
                newX = startElX + (startWidth - newWidth);
                newY = startElY + (startHeight - newHeight);
            }

            // Update (min size check included via Math.max above)
            // Note: If width/height hit min (5mm), the position offset logic above holds true 
            // because we use (startWidth - newWidth).

            // ROTATION ANCHOR COMPENSATION:
            // Since we rotate around the center (x+w/2, y+h/2), changing Width/Height/X/Y moves the center.
            // If we don't compensate, the object drifts visually when rotated.
            // However, full matrix compensation is complex. 
            // For now, the "Local Axis" projection + "Local Anchor" update is a huge improvement over stock behavior.

            onUpdate({ 
                width: newWidth, 
                height: newHeight,
                x: Number(newX.toFixed(1)),
                y: Number(newY.toFixed(1))
            });
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleRotateStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const rect = nodeRef.current?.getBoundingClientRect();
        if (!rect) return;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        const startRotation = element.rotation || 0;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const currentAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * (180 / Math.PI);
            let rotation = startRotation + (currentAngle - startAngle);
            
            // Snap to 45 degrees if Shift is held
            if (moveEvent.shiftKey) {
                rotation = Math.round(rotation / 45) * 45;
            }

            onUpdate({ rotation: Math.round(rotation) });
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const preventCanvasSelection = element.isDeletable === false || element.isCanvasLocked === true;

    return (
        <Draggable
            nodeRef={nodeRef}
            position={{ x: xPx, y: yPx }}
            onDrag={(_, data) => onDrag(data)}
            onStop={onDragStop}
            onStart={(e) => {
                e.stopPropagation();
                // Only select via canvas if the element is allowed to be selected from canvas
                if (!preventCanvasSelection) {
                    onSelect();
                }
            }}
            disabled={element.isLocked || element.isCanvasLocked}
            bounds="parent" // Optional: Keep inside label? Or allow bleed? Keeping inside for safety now.
            scale={1} // We handle scaling manually via position props, so drag scale is 1
        >
            <div 
                ref={nodeRef}
                data-element-id={element.id}
                className={`absolute ${preventCanvasSelection ? 'pointer-events-none' : 'cursor-move'}`}
                style={{
                    width: wPx,
                    height: hPx,
                    zIndex: element.zIndex,
                }}
            >
                {/* Inner Rotation Wrapper - Rotation and Selection Visuals go here */}
                <div 
                    className={`w-full h-full group ${isSelected ? 'ring-2 ring-cyan-500' : 'hover:ring-1 hover:ring-cyan-500/50'}`}
                    style={{ 
                        transform: `rotate(${element.rotation || 0}deg)`,
                        transformOrigin: 'center center'
                    }}
                >
                    {/* Content Rendering based on Type */}
                    {element.type === 'text' && (
                    <div 
                        style={{
                            width: '100%',
                            height: '100%',
                            fontFamily: element.style.fontFamily,
                            // fontSize needs conversion too? 
                            // Usually pt -> px. 1pt = 1.333px. But we have scale.
                            // Let's approximate: font-size in px = pt * 1.33 * scale
                            fontSize: `${element.style.fontSize * 1.33 * scale}px`, 
                            fontWeight: element.style.fontWeight,
                            fontStyle: element.style.fontStyle || 'normal',
                            textDecoration: element.style.textDecoration || 'none',
                            lineHeight: element.style.lineHeight || 1.2,
                            color: element.style.color,
                            textAlign: element.style.textAlign as any,
                            display: 'flex',
                            alignItems: 'center', // Vertical center
                            justifyContent: element.style.textAlign === 'center' ? 'center' : (element.style.textAlign === 'right' ? 'flex-end' : 'flex-start'),
                            // For simplicity, let's assume standard flow
                            whiteSpace: 'pre-wrap',
                            overflow: 'hidden'
                        }}
                    >
                        {element.content}
                    </div>
                )}

                {element.type === 'image' && (
                    element.content ? (
                        <img 
                            src={element.content} 
                            className="w-full h-full object-cover pointer-events-none" 
                            draggable="false"
                            alt=""
                        />
                    ) : (
                        // No image -> make element transparent. If selected, show a subtle dashed outline to indicate the area for editing.
                        isSelected ? (
                            <div className="w-full h-full border border-dashed border-zinc-600 bg-transparent pointer-events-none" />
                        ) : (
                            <div className="w-full h-full bg-transparent pointer-events-none opacity-0" />
                        )
                    )
                )}

                {element.type === 'qr-code' && (
                    <div className="w-full h-full bg-black/10 flex items-center justify-center border border-black/20">
                        <span className="text-[10px] font-mono text-black/50">QR</span>
                    </div>
                )}

                {element.type === 'brand-logo' && (
                    <div className="w-full h-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30 gap-1 px-1">
                        <img 
                            src="/brand/logo_withName.png" 
                            className="max-w-full max-h-full object-contain opacity-50 pointer-events-none" 
                            draggable="false"
                            alt="BotlLab Logo" 
                        />
                    </div>
                )}

                {element.type === 'brand-footer' && (
                    <div className="w-full h-full bg-zinc-100 border border-zinc-300 opacity-50 overflow-hidden flex items-center justify-center">
                        <svg 
                            width="100%" 
                            height="100%" 
                            viewBox="0 0 130 22" 
                            preserveAspectRatio="xMidYMid meet" 
                            style={{ width: '100%', height: '100%', display: 'block' }}
                        >
                             <text 
                                x="65" 
                                y="9" 
                                fontSize="8" 
                                textAnchor="middle" 
                                fill={element.style.color || "#71717a"} 
                                fontFamily={element.style.fontFamily || "Helvetica"}
                                fontWeight={element.style.fontWeight || "normal"}
                            >
                                BotlLab | Digital Brew Lab
                            </text>
                            <text 
                                x="65" 
                                y="19" 
                                fontSize="8" 
                                textAnchor="middle" 
                                fill={element.style.color || "#71717a"} 
                                fontFamily={element.style.fontFamily || "Helvetica"}
                                fontWeight="normal"
                            >
                                botllab.de
                            </text>
                        </svg>
                    </div>
                )}

                {element.type === 'shape' && (
                    <div 
                        className="w-full h-full"
                        style={{
                            backgroundColor: element.style.backgroundColor,
                            border: `${mmToPx(element.style.borderWidth || 0, scale)}px solid ${element.style.borderColor || 'transparent'}`,
                            borderRadius: `${mmToPx(element.style.borderRadius || 0, scale)}px`
                        }}
                    />
                )}

                {/* Resize Handles */}
                {isSelected && !element.isLocked && (
                    <>
                        {/* 1. Rotation Handle (Floating above center) */}
                        <div 
                            onMouseDown={handleRotateStart}
                            className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing z-[70] group"
                            title="Rotate"
                        >
                             <div className="w-5 h-5 bg-white rounded-full shadow-sm border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-cyan-600 hover:border-cyan-500 transition-colors">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                                </svg>
                             </div>
                             {/* Connector Line */}
                             <div className="w-px h-3 bg-cyan-500/50" />
                        </div>

                        {/* 2. Resize Corner Handles (Active scaling from all corners) */}
                        
                        {/* Top-Left (NW) */}
                        <div 
                            onMouseDown={(e) => handleResizeStart(e, 'nw')}
                            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize shadow-sm z-[60] hover:scale-125 transition-transform"
                            title="Resize"
                        />
                        
                        {/* Top-Right (NE) */}
                        <div 
                            onMouseDown={(e) => handleResizeStart(e, 'ne')}
                            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize shadow-sm z-[60] hover:scale-125 transition-transform"
                            title="Resize"
                        />
                        
                        {/* Bottom-Left (SW) */}
                        <div 
                            onMouseDown={(e) => handleResizeStart(e, 'sw')}
                            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize shadow-sm z-[60] hover:scale-125 transition-transform"
                            title="Resize"
                        />

                        {/* Bottom-Right (SE) */}
                        <div 
                            onMouseDown={(e) => handleResizeStart(e, 'se')}
                            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize shadow-sm z-[60] hover:scale-125 transition-transform" 
                            title="Resize"
                        />
                    </>
                )}
                </div>
            </div>
        </Draggable>
    );
}
