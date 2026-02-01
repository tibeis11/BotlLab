'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LabelDesign, LabelElement, ElementType } from '@/lib/types/label-system';
import LabelCanvas from './LabelCanvas';
import EditorSidebar from './EditorSidebar';
import Ruler from './Ruler';
import GuideLine from './GuideLine';
import { Save, ArrowLeft, ZoomIn, ZoomOut, Layers, Maximize2, Monitor, Lock, Undo, Redo } from 'lucide-react';
import { mmToPx } from '@/lib/utils/label-units';
import { useHistory } from '@/app/hooks/useHistory';

interface LabelEditorProps {
    initialDesign: LabelDesign;
    onSave: (design: LabelDesign) => void;
    onExit: () => void;
    isSimpleMode?: boolean;
}

export default function LabelEditor({ initialDesign, onSave, onExit, isSimpleMode = false }: LabelEditorProps) {
    // If Simple Mode is active, enforce locks on brand elements immediately
    const processedInitialDesign = React.useMemo(() => {
        if (!isSimpleMode) return initialDesign;
        return {
            ...initialDesign,
            elements: initialDesign.elements.map(el => {
                const isBranding = el.type === 'brand-logo' || el.type === 'brand-footer';
                const isBackground = el.name?.includes('Background');
                
                if (isBranding || isBackground) {
                    // In Simple Mode: Branding AND Backgrounds are FULLY locked
                    return { ...el, isLocked: true, isCanvasLocked: true, isDeletable: false };
                }
                return el;
            })
        };
    }, [initialDesign, isSimpleMode]);

    const { state: design, set: setHistoryDesign, undo, redo, canUndo, canRedo } = useHistory<LabelDesign>(processedInitialDesign);

    const setDesign = (update: LabelDesign | ((prev: LabelDesign) => LabelDesign)) => {
         setHistoryDesign(update);
         setHasUnsavedChanges(true);
    };

    // Undo/Redo Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Undo: Ctrl+Z
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undo();
            }
            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    // Sync design state when simple mode changes (e.g. after loading)
    useEffect(() => {
        setDesign(prev => ({
            ...prev,
            elements: prev.elements.map(el => {
                const isBranding = el.type === 'brand-logo' || el.type === 'brand-footer';
                const isBackground = el.name?.includes('Background');
                
                if (isBranding || isBackground) {
                    if (isSimpleMode) {
                        return { ...el, isLocked: true, isCanvasLocked: true, isDeletable: false };
                    } else {
                        // Restore unlock if switching to normal mode (optional, but good for admin toggles)
                        // Be careful not to unlock background if it was system locked originally?
                        // For now we assume backgrounds are always locked, but let's stick to Simple Mode enforcement.
                        // Actually, if we leave Simple Mode, we should probably make them selectable again but keep background locked?
                        // Let's just re-apply the logic:
                        
                        // Backgrounds are always locked/non-deletable usually, but canvas-selectable?
                        if (isBackground) return { ...el, isLocked: true, isCanvasLocked: true, isDeletable: false }; 
                        
                        // Branding is freed in normal mode
                        return { ...el, isLocked: false, isCanvasLocked: false, isDeletable: true };
                    }
                }
                return el;
            })
        }));
    }, [isSimpleMode]);

    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [scale, setScale] = useState(1.5); // Default zoom
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [autoFit, setAutoFit] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const mainRef = useRef<HTMLElement>(null);
    const labelContainerRef = useRef<HTMLDivElement>(null);

    // Mobile Check
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024); // lg breakpoint
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Panning / Hand-tool state for Photoshop-like canvas panning
    const [isPanning, setIsPanning] = useState(false);
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const lastPanRef = useRef<{ x: number; y: number } | null>(null);
    const panPerformedRef = useRef(false);

    // Spacebar toggles hand tool (unless typing in an input)
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
                e.preventDefault();
                setIsSpacePressed(true);
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space') setIsSpacePressed(false);
        };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
    }, []);

    // Hand-tool / Middle-click pan start
    const startPan = (e: React.MouseEvent) => {
        if (e.button === 1 || isSpacePressed) {
            e.preventDefault();
            setIsPanning(true);
            lastPanRef.current = { x: e.clientX, y: e.clientY };
            panPerformedRef.current = false;
            document.body.style.cursor = 'grabbing';

            const onMove = (moveEvent: MouseEvent) => {
                if (!mainRef.current) return;
                const last = lastPanRef.current;
                if (!last) return;
                const dx = moveEvent.clientX - last.x;
                const dy = moveEvent.clientY - last.y;
                mainRef.current.scrollLeft -= dx;
                mainRef.current.scrollTop -= dy;
                lastPanRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
                panPerformedRef.current = true;
            };

            const onUp = () => {
                setIsPanning(false);
                lastPanRef.current = null;
                document.body.style.cursor = '';
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                // Small delay clearing the flag to avoid immediate click after pan
                setTimeout(() => { panPerformedRef.current = false; }, 0);
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        }
    };

    // Zoom on Wheel (Centering on Cursor)
    // Using a ref-based non-passive listener to reliably prevent browser zoom
    useEffect(() => {
        const container = mainRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();

                const rect = container.getBoundingClientRect();
                
                // Mouse position relative to the scroll container's viewport
                const offsetX = e.clientX - rect.left;
                const offsetY = e.clientY - rect.top;

                // Current state before zoom
                const scrollLeft = container.scrollLeft;
                const scrollTop = container.scrollTop;
                const currentScale = scale;

                // Determine zoom direction
                const delta = -e.deltaY; 
                const zoomFactor = delta > 0 ? 1.1 : 0.9;
                
                // Calculate new scale with clamping
                let newScale = currentScale * zoomFactor;
                newScale = Math.min(Math.max(0.2, newScale), 5); // 20% to 500%

                // Calculate pivot point
                const worldX = (scrollLeft + offsetX) / currentScale;
                const worldY = (scrollTop + offsetY) / currentScale;

                const newScrollLeft = (worldX * newScale) - offsetX;
                const newScrollTop = (worldY * newScale) - offsetY;

                // Apply updates
                setAutoFit(false);
                setScale(newScale);

                // Sync scroll position
                requestAnimationFrame(() => {
                    if (mainRef.current) {
                        mainRef.current.scrollLeft = newScrollLeft;
                        mainRef.current.scrollTop = newScrollTop;
                    }
                });
            }
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        
        return () => {
            container.removeEventListener('wheel', onWheel);
        };
    }, [scale]);

    // Auto-fit canvas to available space
    useEffect(() => {
        if (!autoFit) return;
        const computeScale = () => {
            if (!mainRef.current) return;
            const container = mainRef.current;
            // Increase padding allowance to account for p-12 (48px) * 2 = 96px + extra breathing room
            const containerWidth = container.clientWidth - 120; 
            const containerHeight = container.clientHeight - 120;
            const widthPx = mmToPx(design.width, 1);
            const heightPx = mmToPx(design.height, 1);
            const fitScale = Math.min(containerWidth / widthPx, containerHeight / heightPx, 3);
            setScale(Math.max(0.5, fitScale || 1));
        };
        computeScale();
        window.addEventListener('resize', computeScale);
        return () => window.removeEventListener('resize', computeScale);
    }, [design.width, design.height, autoFit]);
    // Auto-Save or manual save handler
    const handleSaveClick = () => {
        onSave(design);
        setHasUnsavedChanges(false);
    };

    // Helper: Ensure branding elements are always on top (highest Z-Index) in Simple Mode
    const enforceBrandingZIndex = (elements: LabelElement[]): LabelElement[] => {
        if (!isSimpleMode) return elements;

        // Find max Z of content elements (non-branding)
        const contentElements = elements.filter(el => el.type !== 'brand-logo' && el.type !== 'brand-footer');
        const maxContentZ = contentElements.reduce((max, el) => Math.max(max, el.zIndex), 0);

        // Ensure branding is above maxContentZ
        return elements.map(el => {
            if (el.type === 'brand-logo' || el.type === 'brand-footer') {
                // If it's branding, boost Z-Index if needed
                // We use a safe margin (e.g. +100) to ensure it stays on top even if user adds many items
                if (el.zIndex <= maxContentZ) {
                    return { ...el, zIndex: maxContentZ + 100 };
                }
            }
            return el;
        });
    };

    // Update Element Handler (position, style, content)
    const handleUpdateElement = (id: string, updates: Partial<LabelElement>) => {
        setDesign(prev => {
            const updatedElements = prev.elements.map(el => el.id === id ? { ...el, ...updates } : el);
            return {
                ...prev,
                elements: enforceBrandingZIndex(updatedElements)
            };
        });
        setHasUnsavedChanges(true);
    };

    // Add Element Handler
    const handleAddElement = (type: ElementType) => {
        const newElement: LabelElement = {
            id: crypto.randomUUID(),
            type,
            x: 10,
            y: 10,
            width: type === 'qr-code' ? 20 : (type === 'brand-logo' ? 40 : (type === 'brand-footer' ? 50 : 40)),
            height: type === 'text' ? 10 : (type === 'shape' ? 30 : (type === 'brand-logo' ? 10 : (type === 'brand-footer' ? 8 : 20))),
            rotation: 0,
            zIndex: design.elements.length + 1, // Initial Z, will be corrected by enforce function
            content: type === 'text' ? 'Neuer Text' : (type === 'qr-code' ? '{{qr_code}}' : (type === 'brand-footer' ? 'BotlLab | Digital Brew Lab\nbotllab.de' : '')),
            style: {
                fontFamily: 'Helvetica',
                fontSize: type === 'brand-footer' ? 6 : 12,
                fontWeight: 'normal',
                color: '#000000',
                textAlign: type === 'brand-footer' ? 'center' : 'left',
                backgroundColor: type === 'shape' ? '#cccccc' : undefined,
                borderColor: type === 'shape' ? '#000000' : undefined,
                borderWidth: type === 'shape' ? 1 : undefined,
            },
            isLocked: false,
            isDeletable: true,
            aspectLock: type === 'qr-code' || type === 'brand-logo' || type === 'brand-footer',
            isVariable: type === 'qr-code' || type === 'brand-logo' || type === 'brand-footer'
        };

        setDesign(prev => ({
            ...prev,
            elements: enforceBrandingZIndex([...prev.elements, newElement])
        }));
        setSelectedElementId(newElement.id);
        setHasUnsavedChanges(true);
    };

    // Delete Element Handler
    const handleDeleteElement = (id: string) => {
        const el = design.elements.find(e => e.id === id);
        if (!el) return;
        if (el.isDeletable === false) {
            // Silently ignore if invoked via keyboard shortcut
            return;
        }
        setDesign(prev => ({
            ...prev,
            elements: prev.elements.filter(el => el.id !== id)
        }));
        setSelectedElementId(null);
        setHasUnsavedChanges(true);
    };

    // Duplicate Element Handler
    const handleDuplicateElement = (id: string) => {
        const original = design.elements.find(e => e.id === id);
        if (!original) return;
        
        // Don't duplicate unique/locked branded elements in Simple Mode if logic forbids (though usually duplication is fine, deletion is restricted)
        // Actually, Brand Logo/Footer should probably be unique per label in simple mode? 
        // Let's allow it for now, but usually they are 1-per-label.
        
        const newElement: LabelElement = {
            ...original,
            id: crypto.randomUUID(),
            x: original.x + 5, // Offset position
            y: original.y + 5,
            zIndex: design.elements.length + 1,
            // If original was locked (e.g. brand logo), the copy should probably NOT be locked? 
            // Or if it is a brand element, it inherits properties.
            // If simple mode, branding is locked. So copy is locked too?
            // Usually copying a locked element is weird. Let's allow copy but check lock state.
            isLocked: isSimpleMode && (original.type === 'brand-logo' || original.type === 'brand-footer') ? true : false,
            isCanvasLocked: isSimpleMode && (original.type === 'brand-logo' || original.type === 'brand-footer') ? true : false,
        };
        
        setDesign(prev => ({
            ...prev,
            elements: enforceBrandingZIndex([...prev.elements, newElement])
        }));
        setSelectedElementId(newElement.id);
        setHasUnsavedChanges(true);
    };

    // Move / Reorder Element (Drag & Drop in Layer Panel)
    const handleMoveElement = (fromIndex: number, toIndex: number) => {
        setDesign(prev => {
            const newElements = [...prev.elements];
            const [moved] = newElements.splice(fromIndex, 1);
            newElements.splice(toIndex, 0, moved);
            
            // Rewrite Z-Indices (1-based)
            const reindexed = newElements.map((el, i) => ({
                ...el,
                zIndex: i + 1
            }));
            
            return {
                ...prev,
                elements: enforceBrandingZIndex(reindexed)
            };
        });
        setHasUnsavedChanges(true);
    };

    // Guide Handlers
    const handleAddGuide = (orientation: 'horizontal' | 'vertical', posMm: number) => {
        const newGuide = {
            id: crypto.randomUUID(),
            orientation,
            position: posMm
        };
        setDesign(prev => ({
            ...prev,
            guides: [...(prev.guides || []), newGuide]
        }));
        setHasUnsavedChanges(true);
    };

    const handleUpdateGuide = (id: string, newMm: number) => {
        setDesign(prev => ({
            ...prev,
            guides: (prev.guides || []).map(g => g.id === id ? { ...g, position: newMm } : g)
        }));
        setHasUnsavedChanges(true);
    };

    const handleReorderElement = (id: string, direction: 'up' | 'down') => {
        setDesign(prev => {
            const index = prev.elements.findIndex(e => e.id === id);
            if (index === -1) return prev;
            
            const newElements = [...prev.elements];
            
            if (direction === 'up') {
                // Move towards end of array (Higher Z-Index)
                if (index >= newElements.length - 1) return prev;
                [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
            } else {
                // Move towards start of array (Lower Z-Index)
                if (index <= 0) return prev;
                [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
            }
            
            // Re-index Z-Index based on new array order to ensure CSS z-index matches DOM order
            const reindexedElements = newElements.map((el, i) => ({
                ...el,
                zIndex: i + 1
            }));
            
            return {
                ...prev,
                elements: isSimpleMode ? enforceBrandingZIndex(reindexedElements) : reindexedElements
            };
        });
        setHasUnsavedChanges(true);
    };

    const handleRemoveGuide = (id: string) => {
        setDesign(prev => ({
            ...prev,
            guides: (prev.guides || []).filter(g => g.id !== id)
        }));
        setHasUnsavedChanges(true);
    };

    const designRef = useRef(design);
    const selectedIdRef = useRef(selectedElementId);

    useEffect(() => {
        designRef.current = design;
    }, [design]);

    useEffect(() => {
        selectedIdRef.current = selectedElementId;
    }, [selectedElementId]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if user is typing in an input or textarea
            const activeEl = document.activeElement;
            const tagName = activeEl?.tagName;
            const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || (activeEl as HTMLElement)?.isContentEditable;
            
            if (isInput) return;

            const currentSelectedId = selectedIdRef.current;

            // Global Shortcuts
            if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedElementId(null);
                return;
            }

            if (currentSelectedId) {
                // Delete / Backspace
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    // Prevent default to avoid browser navigation history back
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Logic from handleDeleteElement inline or called (but safely)
                    const currentDesign = designRef.current;
                    const el = currentDesign.elements.find(e => e.id === currentSelectedId);
                    if (!el) return;
                    if (el.isDeletable === false) return;

                    setDesign(prev => ({
                        ...prev,
                        elements: prev.elements.filter(el => el.id !== currentSelectedId)
                    }));
                    setSelectedElementId(null);
                    setHasUnsavedChanges(true);
                }

                // Arrow Keys Nudge
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                    e.stopPropagation();

                    const currentDesign = designRef.current;
                    const el = currentDesign.elements.find(e => e.id === currentSelectedId);
                    if (!el || el.isLocked) return;

                    const shift = e.shiftKey;
                    const delta = shift ? 0.1 : 1.0;
                    
                    let dx = 0;
                    let dy = 0;

                    if (e.key === 'ArrowUp') dy = -delta;
                    if (e.key === 'ArrowDown') dy = delta;
                    if (e.key === 'ArrowLeft') dx = -delta;
                    if (e.key === 'ArrowRight') dx = delta;

                    const newX = Number((el.x + dx).toFixed(2));
                    const newY = Number((el.y + dy).toFixed(2));

                    // Use handleUpdateElement logic inline or call it if available via ref?
                    // We don't have handleUpdateElement in a ref, but we are inside the component.
                    // However, handleUpdateElement uses state closure 'design' which might be stale in this listener 
                    // IF the listener was created once. 
                    // Wait, the useEffect has NO dependency on `design`! It has `[]`.
                    // So we MUST use setDesign with functional update or designRef.
                    
                    // Let's replicate handleUpdateElement logic briefly for safety
                    setDesign(prev => {
                       const updatedElements = prev.elements.map(elem => 
                           elem.id === currentSelectedId ? { ...elem, x: newX, y: newY } : elem
                       );
                       // We should also enforce Z-Index if needed, but moving X/Y doesn't change Z.
                       // But handleUpdateElement calls enforceBrandingZIndex. Let's do it to be safe.
                       // We need access to enforceBrandingZIndex. It's defined in component scope.
                       // Is it stable? It depends on `isSimpleMode`. 
                       // `isSimpleMode` is a prop/state. 
                       // The useEffect has only `[]` dep. So `isSimpleMode` inside here is STALE (initial value).
                       
                       // REFACTOR: The handledKeyDown should be wrapped in useCallback or we should add deps.
                       // Adding deps to this big useEffect is risky (rebinds listeners).
                       
                       // BETTER APPROACH: Use a Ref for `isSimpleMode` too if needed, OR 
                       // since we are just updating X/Y, maybe we don't need to re-run enforceZIndex?
                       // Actually, enforceZIndex only matters if Z changes.
                       // So simple mapping is fine.
                       
                       return { ...prev, elements: updatedElements };
                    });
                    setHasUnsavedChanges(true);
                }

                // Duplicate (Ctrl + D)
                if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyD' || e.key.toLowerCase() === 'd')) {
                    e.preventDefault();
                    e.stopPropagation();

                    const currentDesign = designRef.current;
                    const original = currentDesign.elements.find(e => e.id === currentSelectedId);
                    if (!original) return;
                    
                    const newElement: LabelElement = {
                        ...original,
                        id: crypto.randomUUID(),
                        x: original.x + 5,
                        y: original.y + 5,
                        zIndex: currentDesign.elements.length + 1,
                        isLocked: isSimpleMode && (original.type === 'brand-logo' || original.type === 'brand-footer') ? true : false,
                        isCanvasLocked: isSimpleMode && (original.type === 'brand-logo' || original.type === 'brand-footer') ? true : false,
                    };
                    
                    // We must use functional update to be safe, but we can restart flow
                    // Actually, since we have designRef, we can construct next state
                    // But standard react: setDesign(prev => ...) is safer against races
                    // So we use setDesign logic basically same as handleDuplicateElement
                    setDesign(prev => ({
                        ...prev,
                        elements: enforceBrandingZIndex([...prev.elements, newElement])
                    }));
                    setSelectedElementId(newElement.id);
                    setHasUnsavedChanges(true);
                }

                // Nudge with Arrow Keys
                if (e.key.startsWith('Arrow')) {
                    // Prevent scrolling
                    e.preventDefault();
                    e.stopPropagation();

                    const currentDesign = designRef.current;
                    const el = currentDesign.elements.find(x => x.id === currentSelectedId);
                    if (el && !el.isLocked) {
                        const step = e.shiftKey ? 0.1 : 1.0; 
                        const updates: Partial<LabelElement> = {};
                        
                        if (e.key === 'ArrowUp') updates.y = Math.round((el.y - step) * 10) / 10;
                        if (e.key === 'ArrowDown') updates.y = Math.round((el.y + step) * 10) / 10;
                        if (e.key === 'ArrowLeft') updates.x = Math.round((el.x - step) * 10) / 10;
                        if (e.key === 'ArrowRight') updates.x = Math.round((el.x + step) * 10) / 10;
                        
                        // use handleUpdateElement logic inline or call it? 
                        // It uses setDesign(prev), so it is safe to call from here?
                        // But handleUpdateElement is recreated on render.
                        // We can just call setDesign directly.
                         setDesign(prev => {
                            const updatedElements = prev.elements.map(e => e.id === currentSelectedId ? { ...e, ...updates } : e);
                            return {
                                ...prev,
                                elements: enforceBrandingZIndex(updatedElements)
                            };
                        });
                        setHasUnsavedChanges(true);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSimpleMode]); // Minimal dependencies! design and selectedId are via Refs.



    if (isMobile) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center p-8 bg-black text-center border-t-4 border-red-500">
                <Monitor size={32} className="text-zinc-500 mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">Desktop Environment Required</h1>
                <p className="text-zinc-500 max-w-sm text-sm">
                    This editor is optimized for desktop usage. Please switch to a larger device for the best experience.
                </p>
                <button 
                    onClick={onExit}
                    className="mt-6 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded text-sm font-medium transition-colors border border-zinc-800"
                >
                    Exit Editor
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full bg-black text-white overflow-hidden font-sans antialiased selection:bg-cyan-900 selection:text-cyan-100">
            {/* Top Navigation Bar - Admin Style */}
            <header className="h-14 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-4 z-50 shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onExit} 
                        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
                    >
                        <ArrowLeft size={16} />
                        <span>Back</span>
                    </button>
                    
                    <div className="h-4 w-px bg-zinc-800"></div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-100">{design.name}</span> 
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-900 text-zinc-500 border border-zinc-800 uppercase tracking-wide">
                            {Math.round(design.width)}×{Math.round(design.height)}mm
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                     {/* Undo/Redo */}
                     <div className="flex items-center bg-zinc-900 rounded-md border border-zinc-800 p-0.5 mr-2">
                        <button 
                            onClick={undo} 
                            disabled={!canUndo}
                            className={`p-1.5 rounded transition-colors ${!canUndo ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white hover:bg-black'}`}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo size={14} />
                        </button>
                        <button 
                            onClick={redo} 
                            disabled={!canRedo}
                            className={`p-1.5 rounded transition-colors ${!canRedo ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white hover:bg-black'}`}
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo size={14} />
                        </button>
                    </div>

                     {/* Scale Controls */}
                     <div className="flex items-center bg-zinc-900 rounded-md border border-zinc-800 p-0.5">
                        <button 
                            onClick={() => { setAutoFit(false); setScale(s => Math.max(0.2, s - 0.1)); }} 
                            className="p-1.5 hover:bg-black rounded text-zinc-500 hover:text-white transition-colors"
                        >
                            <ZoomOut size={14}/>
                        </button>
                        <span className="text-[10px] text-zinc-400 w-10 text-center font-mono">{Math.round(scale * 100)}%</span>
                        <button 
                            onClick={() => { setAutoFit(false); setScale(s => Math.min(4, s + 0.1)); }} 
                            className="p-1.5 hover:bg-black rounded text-zinc-500 hover:text-white transition-colors"
                        >
                            <ZoomIn size={14}/>
                        </button>
                        <div className="w-px h-3 bg-zinc-800 mx-1"></div>
                        <button 
                            title="Auto Fit" 
                            onClick={() => setAutoFit(a => !a)} 
                            className={`p-1.5 rounded transition-colors ${autoFit ? 'text-cyan-400 bg-cyan-950/30' : 'text-zinc-500 hover:text-white hover:bg-black'}`}
                        >
                            <Maximize2 size={14} />
                        </button>
                    </div>

                    <div className="h-4 w-px bg-zinc-800"></div>

                    <button 
                        onClick={handleSaveClick}
                        disabled={!hasUnsavedChanges}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${
                            hasUnsavedChanges 
                                ? 'bg-white text-black hover:bg-zinc-200' 
                                : 'bg-transparent text-zinc-600 border border-zinc-800 bg-zinc-900'
                        }`}
                    >
                        <Save size={14} />
                        <span>{hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Sidebar (Tools & Layers) */}
                <aside className="w-64 bg-black border-r border-zinc-900 flex flex-col z-40 shrink-0">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                        <EditorSidebar 
                            design={design} 
                            selectedId={selectedElementId}
                            onUpdateElement={handleUpdateElement}
                            onAddElement={handleAddElement}
                            onDeleteElement={handleDeleteElement}
                            onReorderElement={handleReorderElement}
                            onMoveElement={handleMoveElement}
                            onSelectElement={setSelectedElementId}
                            onChangeName={(name: string) => { setDesign(d => ({...d, name})); setHasUnsavedChanges(true); }}
                            forceDefault={true}
                            align="left"
                            isSimpleMode={isSimpleMode}
                            showLayers={true}
                        />
                    </div>
                    
                    {/* Simple Mode Footer */}
                    {isSimpleMode && (
                        <div className="p-3 border-t border-zinc-900 bg-zinc-950">
                            <div className="flex items-center gap-2 mb-1">
                                <Lock size={12} className="text-amber-500" />
                                <span className="text-xs font-bold text-zinc-300">Basic Mode</span>
                            </div>
                            <p className="text-[10px] text-zinc-600 mb-2">Some branding elements are locked.</p>
                            <a href="/pricing" target="_blank" className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wide">
                                Upgrade Plan
                            </a>
                        </div>
                    )}
                </aside>

                {/* Main Canvas Area Wrapper */}
                <div className="flex-1 relative flex flex-col min-w-0 bg-zinc-950 overflow-hidden">
                    {/* Rulers Overlay (Positioned absolutely over the wrapper, not scrolling with content) */}
                    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                        <Ruler orientation="horizontal" scale={scale} containerRef={mainRef} targetRef={labelContainerRef} onAddGuide={handleAddGuide} />
                        <Ruler orientation="vertical" scale={scale} containerRef={mainRef} targetRef={labelContainerRef} onAddGuide={handleAddGuide} />
                        {(design.guides || []).map(guide => (
                            <GuideLine 
                                key={guide.id} 
                                id={guide.id}
                                orientation={guide.orientation} 
                                positionMm={guide.position} 
                                scale={scale} 
                                containerRef={mainRef} 
                                targetRef={labelContainerRef} 
                                onRemove={handleRemoveGuide}
                                onUpdate={handleUpdateGuide}
                            />
                        ))}
                    </div>

                    {/* Scrollable Canvas Area */}
                    <main
                        ref={mainRef}
                        className={`w-full h-full overflow-hidden relative z-0 ${isSpacePressed ? 'cursor-grab' : ''}`}
                        onMouseDown={startPan}
                        onClick={(e) => {
                            if (panPerformedRef.current) { panPerformedRef.current = false; return; }
                            const target = e.target as HTMLElement;
                            if (!target.closest('.label-wrapper')) {
                                setSelectedElementId(null);
                            }
                        }}
                    >
                        <div className="min-w-full min-h-full flex p-12">
                            <div ref={labelContainerRef} className="shadow-2xl shadow-black relative label-canvas-container m-auto">
                                <LabelCanvas 
                                    design={design}
                                    scale={scale}
                                    selectedId={selectedElementId}
                                    onSelect={setSelectedElementId}
                                    onUpdate={handleUpdateElement}
                                />
                            </div>
                        </div>
                    </main>
                </div>

                {/* Right Sidebar (Properties) */}
                <aside className="w-72 bg-black border-l border-zinc-900 flex flex-col z-40 shrink-0">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                         <div className="h-full">
                            <EditorSidebar 
                                design={design}  
                                selectedId={selectedElementId}
                                onUpdateElement={handleUpdateElement}
                                onAddElement={handleAddElement}
                                onDeleteElement={handleDeleteElement}
                                onDuplicateElement={handleDuplicateElement}
                                onMoveElement={handleMoveElement}
                                onSelectElement={setSelectedElementId}
                                onChangeName={(name: string) => { setDesign(d => ({...d, name})); setHasUnsavedChanges(true); }}
                                emptyWhenNoSelection={true}
                                isSimpleMode={isSimpleMode}
                                align="right"
                                showLayers={false}
                            />
                         </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
