'use client';

import React, { useState, useRef } from 'react';
import { LabelDesign, LabelElement, ElementType } from '@/lib/types/label-system';
import { Type, Image as ImageIcon, QrCode, Trash2, Lock, Unlock, Layers, Tag, Shield, AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp, Link, Bold, Italic, Underline, RotateCcw, Copy } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import LayerPanel from './LayerPanel';

interface EditorSidebarProps {
    design: LabelDesign;
    selectedId: string | null;
    onUpdateElement: (id: string, updates: Partial<LabelElement>) => void;
    onAddElement: (type: ElementType) => void;
    onDeleteElement: (id: string) => void;
    onDuplicateElement?: (id: string) => void; // New prop
    onReorderElement?: (id: string, direction: 'up' | 'down') => void; // New prop
    onMoveElement?: (fromIndex: number, toIndex: number) => void; // DnD Reorder
    onSelectElement: (id: string) => void;
    onChangeName: (name: string) => void;
    /**
     * When true, the sidebar will show the default toolbox/layers view
     * even if an element is currently selected. Useful for left menu context.
     */
    forceDefault?: boolean;
    /**
     * When true, and no element is selected, render an empty/placeholder panel
     * instead of showing the default toolbox.
     */
    emptyWhenNoSelection?: boolean;
    /**
     * Direction for color picker popups. 'left' means popup shows to the left of the sidebar.
     */
    align?: 'left' | 'right';
    isSimpleMode?: boolean;
    showLayers?: boolean;
}

export default function EditorSidebar(props: EditorSidebarProps) {
    const { 
        design, 
        selectedId, 
        onUpdateElement, 
        onAddElement, 
        onDeleteElement, 
        onDuplicateElement, 
        onReorderElement, 
        onMoveElement, 
        onSelectElement, 
        onChangeName, 
        forceDefault = false, 
        emptyWhenNoSelection = false, 
        align = 'left', 
        isSimpleMode = false,
        showLayers = true
    } = props;
    
    // Check if selected element is a background element in simple mode (position/size locked)
    const selectedElement = design.elements.find(el => el.id === selectedId);
    const isBackgroundLocked = isSimpleMode && selectedElement?.name?.includes('Background');

    // Handle file upload for a specific image element and set it as content (Data URL)
    const handleElementImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedElement) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            onUpdateElement(selectedElement.id, { content: dataUrl });
        };
        reader.readAsDataURL(file);
    };

    // Helper: which element types have locked aspect ratio
    const aspectLockedTypes = ['qr-code', 'brand-logo', 'brand-footer'];

    // Handle numeric width/height changes and enforce aspect ratio if locked
    const handleWidthChange = (value: number) => {
        if (!selectedElement) return;
        const isAspectLocked = selectedElement.aspectLock || aspectLockedTypes.includes(selectedElement.type);
        
        if (isAspectLocked) {
            // For QR-code, keep square; for others, preserve current ratio
            if (selectedElement.type === 'qr-code') {
                onUpdateElement(selectedElement.id, { width: value, height: value });
            } else {
                const ratio = (selectedElement.width && selectedElement.height) ? (selectedElement.width / selectedElement.height) : 1;
                // Use 2 decimal places precision to prevent ratio drift during typing
                const newHeight = Math.max(0.1, Number((value / (ratio || 1)).toFixed(2)));
                onUpdateElement(selectedElement.id, { width: value, height: newHeight });
            }
        } else {
            onUpdateElement(selectedElement.id, { width: value });
        }
    };

    const handleHeightChange = (value: number) => {
        if (!selectedElement) return;
        const isAspectLocked = selectedElement.aspectLock || aspectLockedTypes.includes(selectedElement.type);

        if (isAspectLocked) {
            if (selectedElement.type === 'qr-code') {
                onUpdateElement(selectedElement.id, { height: value, width: value });
            } else {
                const ratio = (selectedElement.width && selectedElement.height) ? (selectedElement.width / selectedElement.height) : 1;
                const newWidth = Math.max(0.1, Number((value * (ratio || 1)).toFixed(2)));
                onUpdateElement(selectedElement.id, { height: value, width: newWidth });
            }
        } else {
            onUpdateElement(selectedElement.id, { height: value });
        }
    };

    return (
        <div className="flex flex-col h-full text-white">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 relative">
                
                {/* 1. Selection Properties - If an element is selected */}
                {(selectedElement && !forceDefault) ? (
                    <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-200">
                        <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-5 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.4)]"></div>
                                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-zinc-400">Eigenschaften</h3>
                            </div>
                            <div className="flex gap-1">
                                        {onDuplicateElement && (
                                            <button 
                                                onClick={() => onDuplicateElement(selectedElement.id)}
                                                className="text-zinc-500 hover:text-cyan-400 hover:bg-cyan-400/10 p-2 rounded-xl transition-all active:scale-90"
                                                title="Element duplizieren (Strg+D)"
                                            >
                                                <Copy size={18} />
                                            </button>
                                        )}
                                        {selectedElement.isDeletable === false ? (
                                            <div title="Dieses Element kann nicht gelöscht werden" className="text-zinc-700 p-2">
                                                <Shield size={16} />
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => onDeleteElement(selectedElement.id)} 
                                                disabled={isSimpleMode && (selectedElement.type === 'brand-logo' || selectedElement.type === 'brand-footer')}
                                                className={`text-zinc-500 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-xl transition-all active:scale-90 ${isSimpleMode && (selectedElement.type === 'brand-logo' || selectedElement.type === 'brand-footer') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                title={isSimpleMode && (selectedElement.type === 'brand-logo' || selectedElement.type === 'brand-footer') ? 'Im Simple Mode gesperrt' : 'Element löschen'}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Position */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">X (mm)</label>
                                        <input 
                                            type="number" 
                                            value={Number(selectedElement.x.toFixed(1))} 
                                            onChange={(e) => onUpdateElement(selectedElement.id, { x: Number(e.target.value) })}
                                            className={`w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 font-mono text-sm text-white focus:border-zinc-600 transition outline-none ${selectedElement.isDeletable === false || isBackgroundLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={selectedElement.isDeletable === false || isBackgroundLocked}
                                            step="0.1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">Y (mm)</label>
                                        <input 
                                            type="number" 
                                            value={Number(selectedElement.y.toFixed(1))} 
                                            onChange={(e) => onUpdateElement(selectedElement.id, { y: Number(e.target.value) })}
                                            className={`w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 font-mono text-sm text-white focus:border-zinc-600 transition outline-none ${selectedElement.isDeletable === false || isBackgroundLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={selectedElement.isDeletable === false || isBackgroundLocked}
                                            step="0.1"
                                        />
                                    </div>
                                </div>

                                {/* Rotation */}
                                <div className="mb-4">
                                    <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">Rotation (°)</label>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 flex-1 flex items-center gap-2">
                                            <RotateCcw size={12} className="text-zinc-500" />
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max="360" 
                                                value={selectedElement.rotation || 0} 
                                                onChange={(e) => onUpdateElement(selectedElement.id, { rotation: Number(e.target.value) })}
                                                className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-white"
                                                disabled={selectedElement.isDeletable === false || isBackgroundLocked}
                                            />
                                        </div>
                                        <input 
                                            type="number" 
                                            value={selectedElement.rotation || 0} 
                                            onChange={(e) => onUpdateElement(selectedElement.id, { rotation: Number(e.target.value) })}
                                            className="w-12 bg-zinc-900 border border-zinc-800 rounded px-1 py-1.5 font-mono text-sm text-white text-center focus:border-zinc-600 transition outline-none"
                                            disabled={selectedElement.isDeletable === false || isBackgroundLocked}
                                        />
                                    </div>
                                </div>
                                
                                {/* Size */}
                                <div className="flex items-end gap-2 mb-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">Breite (mm)</label>
                                        <input 
                                            type="number" 
                                            value={Number(selectedElement.width.toFixed(2))} 
                                            onChange={(e) => handleWidthChange(Number(e.target.value))}
                                            className={`w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 font-mono text-sm text-white focus:border-zinc-600 transition outline-none ${selectedElement.isDeletable === false || isBackgroundLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={selectedElement.isDeletable === false || isBackgroundLocked}
                                            step="0.1"
                                        />
                                    </div>

                                    <div className="pb-1.5">
                                        <button
                                            onClick={() => onUpdateElement(selectedElement.id, { aspectLock: !selectedElement.aspectLock })}
                                            disabled={selectedElement.isDeletable === false || isBackgroundLocked}
                                            title={selectedElement.aspectLock || aspectLockedTypes.includes(selectedElement.type) ? 'Seitenverhältnis gesperrt' : 'Seitenverhältnis frei'}
                                            className={`p-1.5 rounded transition-all ${
                                                selectedElement.aspectLock || aspectLockedTypes.includes(selectedElement.type) 
                                                ? 'text-zinc-100 bg-zinc-800' 
                                                : 'text-zinc-600 hover:text-zinc-300'
                                            } ${selectedElement.isDeletable === false || isBackgroundLocked ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        >
                                            <Link size={14} />
                                        </button>
                                    </div>

                                    <div className="flex-1">
                                        <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">Höhe (mm)</label>
                                        <input 
                                            type="number" 
                                            value={Number(selectedElement.height.toFixed(2))} 
                                            onChange={(e) => handleHeightChange(Number(e.target.value))}
                                            className={`w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 font-mono text-sm text-white focus:border-zinc-600 transition outline-none ${selectedElement.isDeletable === false || isBackgroundLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={selectedElement.isDeletable === false || isBackgroundLocked}
                                            step="0.1"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-3 border-t border-zinc-900 border-b mb-4">
                                    <div className="flex items-center gap-2">
                                        {selectedElement.isLocked ? <Lock size={14} className="text-amber-500" /> : <Unlock size={14} className="text-zinc-600" />}
                                        <span className="text-xs font-medium text-zinc-400">Lock Position</span>
                                    </div>
                                    {selectedElement.isDeletable === false ? (
                                        <div className="px-2 py-1 rounded bg-zinc-900 text-[10px] text-zinc-600 cursor-not-allowed uppercase font-mono">
                                            System
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => onUpdateElement(selectedElement.id, { isLocked: !selectedElement.isLocked })}
                                            disabled={isSimpleMode && (selectedElement.type === 'brand-logo' || selectedElement.type === 'brand-footer')}
                                            className={`h-6 w-10 rounded-full relative transition-colors ${selectedElement.isLocked ? 'bg-amber-500' : 'bg-zinc-800 hover:bg-zinc-700'} ${isSimpleMode && (selectedElement.type === 'brand-logo' || selectedElement.type === 'brand-footer') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${selectedElement.isLocked ? 'left-5' : 'left-1'}`} />
                                        </button>
                                    )}
                                </div>

                                {/* Content (Text only) */}
                                {selectedElement.type === 'text' && (
                                    <div className="mb-4 pt-4 border-t border-zinc-900">
                                        <label className="text-[10px] text-zinc-500 uppercase font-medium mb-2 block">Content</label>
                                        <textarea 
                                            value={selectedElement.content}
                                            onChange={(e) => onUpdateElement(selectedElement.id, { content: e.target.value })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white min-h-[80px] outline-none focus:border-zinc-600 transition-all resize-y font-sans"
                                            placeholder="Enter text..."
                                        />
                                    </div>
                                )}

                                {/* Image (element) */}
                                {selectedElement.type === 'image' && (
                                    <div className="mb-4 pt-4 border-t border-zinc-900">
                                        <label className="text-[10px] text-zinc-500 uppercase font-medium mb-2 block">Image Source</label>
                                        <div className="space-y-2">
                                            {selectedElement.content ? (
                                                <div className="relative aspect-video rounded border border-zinc-800 bg-zinc-900 group overflow-hidden">
                                                    <img src={selectedElement.content} className="w-full h-full object-contain" alt="preview" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button onClick={() => onUpdateElement(selectedElement.id, { content: '' })} className="p-2 bg-red-900 text-red-200 rounded hover:bg-red-800 transition-all">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="aspect-video bg-zinc-900 border border-dashed border-zinc-800 rounded flex flex-col items-center justify-center gap-1 text-zinc-600">
                                                    <ImageIcon size={24} strokeWidth={1.5} />
                                                    <span className="text-[10px] font-medium uppercase">No Image</span>
                                                </div>
                                            )}
                                            
                                            <input id={`element-image-upload-${selectedElement.id}`} type="file" accept="image/*" className="hidden" onChange={handleElementImageUpload} />
                                            <label 
                                                htmlFor={`element-image-upload-${selectedElement.id}`} 
                                                className="flex items-center justify-center gap-2 w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded text-xs font-medium uppercase cursor-pointer transition-all"
                                            >
                                                <span>Upload Image</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Style for Text */}
                                {selectedElement.type === 'text' && (
                                    <div className="mb-4 pt-4 border-t border-zinc-900">
                                        <div className="grid grid-cols-2 gap-2 mb-4">
                                            <div>
                                                <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">Size (pt)</label>
                                                <input 
                                                    type="number" 
                                                    value={selectedElement.style.fontSize}
                                                    onChange={(e) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, fontSize: Number(e.target.value) } })}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 font-mono text-sm text-white outline-none focus:border-zinc-600"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">Color</label>
                                                <StyledColorPicker 
                                                    color={selectedElement.style.color} 
                                                    onChange={(color) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, color } })} 
                                                    align={align}
                                                    hideHex={true}
                                                />
                                            </div>
                                        </div>

                                        {/* Text Formatting */}
                                        <div>
                                            <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">Formatting</label>
                                            <div className="flex bg-zinc-900 border border-zinc-800 rounded p-1 gap-1">
                                                <button 
                                                    onClick={() => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, fontWeight: selectedElement.style.fontWeight === 'bold' ? 'normal' : 'bold' } })}
                                                    className={`p-1.5 rounded flex-1 flex justify-center transition-all ${selectedElement.style.fontWeight === 'bold' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                    title="Bold"
                                                >
                                                    <Bold size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, fontStyle: selectedElement.style.fontStyle === 'italic' ? 'normal' : 'italic' } })}
                                                    className={`p-1.5 rounded flex-1 flex justify-center transition-all ${selectedElement.style.fontStyle === 'italic' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                    title="Italic"
                                                >
                                                    <Italic size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, textDecoration: selectedElement.style.textDecoration === 'underline' ? 'none' : 'underline' } })}
                                                    className={`p-1.5 rounded flex-1 flex justify-center transition-all ${selectedElement.style.textDecoration === 'underline' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                    title="Unterstrichen"
                                                >
                                                    <Underline size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Line Height */}
                                        <div>
                                            <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">Line Height</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="range"
                                                    min="0.5"
                                                    max="3.0"
                                                    step="0.1"
                                                    value={selectedElement.style.lineHeight || 1.2}
                                                    onChange={(e) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, lineHeight: Number(e.target.value) } })}
                                                    className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-white"
                                                />
                                                <span className="font-mono text-[10px] text-zinc-400 w-8 text-right">
                                                    {(selectedElement.style.lineHeight || 1.2).toFixed(1)}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">Text Align</label>
                                            <div className="flex bg-zinc-900 border border-zinc-800 rounded p-1 gap-1">
                                                <button 
                                                    onClick={() => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, textAlign: 'left' } })}
                                                    className={`p-1.5 rounded flex-1 flex justify-center transition-all ${selectedElement.style.textAlign === 'left' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                    title="Left"
                                                >
                                                    <AlignLeft size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, textAlign: 'center' } })}
                                                    className={`p-1.5 rounded flex-1 flex justify-center transition-all ${selectedElement.style.textAlign === 'center' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                    title="Center"
                                                >
                                                    <AlignCenter size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, textAlign: 'right' } })}
                                                    className={`p-1.5 rounded flex-1 flex justify-center transition-all ${selectedElement.style.textAlign === 'right' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                    title="Right"
                                                >
                                                    <AlignRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">Font Family</label>
                                            <select 
                                                value={selectedElement.style.fontFamily}
                                                onChange={(e) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, fontFamily: e.target.value } })}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-zinc-600 transition-all appearance-none cursor-pointer hover:bg-zinc-800"
                                            >
                                                <option value="Helvetica">Helvetica (Default)</option>
                                                <option value="Courier">Courier (Mono)</option>
                                                <option value="Times">Times New Roman</option>
                                                <option value="Roboto">Roboto</option>
                                                <option value="OpenSans">Open Sans</option>
                                                <option value="Montserrat">Montserrat</option>
                                                <option value="PlayfairDisplay">Playfair Display</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Style (Shape only) */}
                                {selectedElement.type === 'shape' && (
                                    <div className="space-y-4 pt-4 border-t border-zinc-900">
                                         <div>
                                            <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">Fill Color</label>
                                            <StyledColorPicker 
                                                color={selectedElement.style.backgroundColor || '#ffffff'} 
                                                onChange={(color) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, backgroundColor: color } })} 
                                                align={align}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">Border Width</label>
                                                <input 
                                                    type="number" 
                                                    value={selectedElement.style.borderWidth || 0}
                                                    onChange={(e) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, borderWidth: Number(e.target.value) } })}
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:border-zinc-600 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">Border Color</label>
                                                <StyledColorPicker 
                                                    color={selectedElement.style.borderColor || '#000000'} 
                                                    onChange={(color) => onUpdateElement(selectedElement.id, { style: { ...selectedElement.style, borderColor: color } })} 
                                                    hideHex
                                                    align={align}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        ) : emptyWhenNoSelection ? (
                            <div className="flex flex-col items-center justify-center h-[60vh] opacity-20 text-center select-none">
                                <div className="bg-zinc-900 p-4 rounded-full mb-3">
                                     <Layers size={24} />
                                </div>
                                <p className="text-xs font-medium uppercase tracking-widest">No Selection</p>
                            </div>
                        ) : (
                            /* 2. Default Mode: Toolbox & General Settings */
                            <div className="space-y-4 animate-in slide-in-from-left-4 fade-in duration-200">
                                {/* Add Elements */}
                                <div>
                                    <div className="mb-2">
                                         <h3 className="font-medium text-[10px] uppercase text-zinc-500">Add Element</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <ToolButton icon={<Type size={16} />} label="Text" onClick={() => onAddElement('text')} />
                                        <ToolButton icon={<ImageIcon size={16} />} label="Image" onClick={() => onAddElement('image')} />
                                        <ToolButton icon={<QrCode size={16} />} label="QR-Code" onClick={() => onAddElement('qr-code')} />
                                        <ToolButton icon={<div className="w-4 h-4 bg-zinc-600 rounded-sm border border-zinc-500" />} label="Shape" onClick={() => onAddElement('shape')} />
                                        <ToolButton icon={<Layers size={16} />} label="Brand Logo" onClick={() => onAddElement('brand-logo')} />
                                        <ToolButton icon={<Tag size={16} />} label="Brand Footer" onClick={() => onAddElement('brand-footer')} />
                                    </div>
                                </div>

                                {/* Document Settings */}
                                <div className="pt-4 border-t border-zinc-900">
                                    <div className="flex items-center gap-2 mb-2">
                                         <h3 className="font-medium text-[10px] uppercase text-zinc-500">Document</h3>
                                    </div>
                                    
                                    <div className="mb-4">
                                        <div>
                                            <label className="text-[10px] text-zinc-500 uppercase font-medium mb-1 block">Design Name</label>
                                            <input 
                                                type="text" 
                                                value={design.name} 
                                                onChange={(e) => onChangeName(e.target.value)}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-sm text-white focus:border-zinc-600 outline-none transition-all placeholder:text-zinc-700"
                                                placeholder="e.g. Pilsner v1"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                
                {/* Divider before Layers */}
                {showLayers && (
                    <>
                        <div className="w-full h-px bg-zinc-800 mt-8 mb-4"></div>

                        {/* Always show Layers */}
                        <div className="pt-2 animate-in slide-in-from-bottom-4 fade-in duration-300 delay-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Layers size={14} className="text-zinc-500" />
                                <h3 className="font-medium text-[10px] uppercase text-zinc-500 tracking-wider">Ebenen</h3>
                            </div>
                            <LayerPanel 
                                elements={design.elements}
                                selectedId={selectedId}
                                onSelect={onSelectElement}
                                onReorder={(from, to) => onMoveElement?.(from, to)}
                                onUpdate={onUpdateElement}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function ToolButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
    return (
        <button 
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-md p-3 transition-all group active:scale-[0.98]"
        >
            <div className="text-zinc-500 group-hover:text-zinc-100 transition-colors">
                {icon}
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 group-hover:text-zinc-400 transition-colors">{label}</span>
        </button>
    );
}

function StyledColorPicker({ color, onChange, hideHex = false, align = 'left' }: { color: string, onChange: (color: string) => void, hideHex?: boolean, align?: 'left' | 'right' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [pickerStyle, setPickerStyle] = useState<{ top: number, left: number } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const toggleOpen = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const pickerWidth = 230; // 200px min-width + padding
            const pickerHeight = 320; // approximate height
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceRight = window.innerWidth - rect.right;
            
            let top = rect.bottom + 8;
            // If not enough space below, open upwards
            if (spaceBelow < pickerHeight) {
                top = rect.top - pickerHeight - 8;
            }

            let left = rect.right + 8; // Default open to right
            
            // If align right (sidebar on right) -> open to left
            // OR if align left but no space on right -> open to left
            if (align === 'right' || spaceRight < pickerWidth) {
                left = rect.left - pickerWidth - 8;
            }

            setPickerStyle({ top, left });
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    // Close on scroll to prevent detached popup
    React.useEffect(() => {
        if (!isOpen) return;
        const handleScroll = () => setIsOpen(false);
        window.addEventListener('scroll', handleScroll, true); // Capture phase for all scroll containers
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [isOpen]);

    return (
        <>
            <button 
                ref={buttonRef}
                onClick={toggleOpen}
                className="flex items-center gap-2 w-full bg-zinc-900 hover:bg-zinc-800 p-1.5 rounded border border-zinc-800 transition-all group relative"
            >
                <div 
                    className="w-5 h-5 rounded border border-white/10 shadow-sm" 
                    style={{ backgroundColor: color }}
                />
                {!hideHex && <span className="text-[10px] font-mono text-zinc-400 font-medium">{color.toUpperCase()}</span>}
                <div className="ml-auto text-zinc-500">
                    {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </div>
            </button>

            {isOpen && pickerStyle && (
                <>
                    {/* Transparent Overlay to close on click outside */}
                    <div 
                        className="fixed inset-0 z-[5000]" 
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Fixed Position Color Picker Popup */}
                    <div 
                        className="fixed z-[5001] min-w-[200px] w-[220px] animate-in fade-in zoom-in-95 duration-200"
                        style={{ top: pickerStyle.top, left: pickerStyle.left }}
                    >
                        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded shadow-2xl">
                            <HexColorPicker 
                                color={color} 
                                onChange={onChange} 
                                className="!w-full !h-32"
                            />
                            <div className="mt-3 grid grid-cols-6 gap-1.5">
                                {['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#e4e4e7', '#a1a1aa', '#3f3f46', '#18181b'].map(preset => (
                                    <button
                                        key={preset}
                                        onClick={() => onChange(preset)}
                                        className="aspect-square rounded-sm border border-white/10 hover:border-white/40 transition-all"
                                        style={{ backgroundColor: preset }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
